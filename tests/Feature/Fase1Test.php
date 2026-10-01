<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Fase 1: a dívida anterior deixa de contar a dobrar, não se anula uma factura
 * com pagamentos, e os novos KPIs de risco / controlo / alertas.
 */
class Fase1Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Cliente $ana;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $tarifa = Tarifa::create(['nome' => 'Doméstica']); // 70 MZN/m³, mínimo 5 m³ = 350, corte 700, multa 10%
        $this->ana = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
    }

    private function facturaAntiga(string $numero, float $total, ?string $vence = null): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $this->ana->id, 'mes' => 8, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => 'pendente', 'data_vencimento' => $vence ?? now()->subDays(40)->toDateString(),
        ]);
    }

    private function leituraConfirmada(int $consumo): Leitura
    {
        return Leitura::create([
            'cliente_id' => $this->ana->id, 'mes' => now()->month, 'ano' => now()->year,
            'leitura_anterior' => 0, 'leitura_actual' => $consumo, 'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);
    }

    public function test_a_divida_anterior_ja_nao_entra_no_total_nem_conta_a_dobrar(): void
    {
        $this->facturaAntiga('F-OLD', 350);
        $leitura = $this->leituraConfirmada(10); // 10 m³ × 70 = 700

        $this->actingAs($this->admin)->post('/facturas', ['leitura_id' => $leitura->id])->assertSessionHasNoErrors();

        $nova = Factura::where('leitura_id', $leitura->id)->firstOrFail();
        $this->assertEquals(700, $nova->total_pagar);          // só o consumo (+ multa), sem os 350 antigos
        $this->assertEquals(350, $nova->divida_anterior);       // informativa
        $this->assertFalse($nova->divida_anterior_incluida);

        // o cliente deve 350 + 700 = 1050 — não 1400
        $this->assertEquals(1050, $this->ana->fresh()->saldoEmAberto());

        $this->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('mes.totalFacturado', 700 + 350) // F-OLD também foi emitida este mês (created_at agora)
            ->where('clientes.dividaTotal', 350));     // só F-OLD está vencida
    }

    public function test_facturas_antigas_que_incluiam_a_divida_descontam_na_facturacao(): void
    {
        $velha = $this->facturaAntiga('F-LEGADO', 1000, now()->addDays(5)->toDateString());
        $velha->update(['divida_anterior' => 400]); // legado: flag true por omissão → 600 foi a facturação própria

        $this->assertEquals(600, $velha->fresh()->valorProprio());

        $this->actingAs($this->admin)->get('/facturas')
            ->assertInertia(fn (Assert $p) => $p->where('totais.totalFacturado', 600)->where('totais.emAberto', 1000));
    }

    public function test_comando_corrige_so_as_pendentes_sem_pagamentos(): void
    {
        $segura = $this->facturaAntiga('F-A', 1000);
        $segura->update(['divida_anterior' => 400]);
        $comPagamento = $this->facturaAntiga('F-B', 1000);
        $comPagamento->update(['divida_anterior' => 400]);
        Pagamento::create([
            'numero_recibo' => 'R-1', 'factura_id' => $comPagamento->id, 'cliente_id' => $this->ana->id,
            'valor_pago' => 100, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id,
        ]);

        $this->artisan('facturas:corrigir-divida-anterior')->assertSuccessful();
        $this->assertEquals(1000, $segura->fresh()->total_pagar); // dry-run: nada mudou

        $this->artisan('facturas:corrigir-divida-anterior', ['--aplicar' => true])->assertSuccessful();

        $this->assertEquals(600, $segura->fresh()->total_pagar);
        $this->assertFalse($segura->fresh()->divida_anterior_incluida);
        $this->assertEquals(1000, $comPagamento->fresh()->total_pagar); // não se toca
        $this->assertTrue($comPagamento->fresh()->divida_anterior_incluida);
    }

    public function test_nao_se_anula_uma_factura_com_pagamentos(): void
    {
        $f = $this->facturaAntiga('F-P', 500);
        Pagamento::create([
            'numero_recibo' => 'R-2', 'factura_id' => $f->id, 'cliente_id' => $this->ana->id,
            'valor_pago' => 200, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->delete('/facturas/'.$f->id, ['motivo_anulacao' => 'engano de leitura'])
            ->assertSessionHas('error');

        $this->assertNotSame('anulada', $f->fresh()->estado);

        // sem pagamentos já se pode anular
        $livre = $this->facturaAntiga('F-L', 100);
        $this->delete('/facturas/'.$livre->id, ['motivo_anulacao' => 'engano de leitura'])->assertSessionHasNoErrors();
        $this->assertSame('anulada', $livre->fresh()->estado);
    }

    public function test_kpis_de_risco_e_controlo_e_os_alertas_do_painel(): void
    {
        // 3 facturas vencidas e 800 em atraso (≥ limiar 700) → em risco de corte
        foreach (['F-1', 'F-2', 'F-3'] as $i => $n) {
            $this->facturaAntiga($n, 300);
        }
        // pagamento M-Pesa sem referência
        $f = $this->facturaAntiga('F-4', 100, now()->addDays(10)->toDateString());
        Pagamento::create([
            'numero_recibo' => 'R-3', 'factura_id' => $f->id, 'cliente_id' => $this->ana->id,
            'valor_pago' => 50, 'metodo_pagamento' => 'mpesa', 'recebido_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('risco.clientesEmAtraso', 1)
            ->where('risco.com3Vencidas', 1)
            ->where('risco.emRiscoCorte.total', 1)
            ->where('risco.emRiscoCorte.valor', 900)
            ->where('controlo.electronicosSemReferencia.quantidade', 1)
            ->where('controlo.electronicosSemReferencia.recibos.0', 'R-3')
            ->has('acumuladoAno.actual')
            ->where('mensal.cobertura.clientesActivos', 1));

        $this->get('/admin/dashboard')->assertInertia(function (Assert $p) {
            $chaves = collect($p->toArray()['props']['alertas'])->pluck('chave');
            $this->assertTrue($chaves->contains('risco-corte'));
            $this->assertTrue($chaves->contains('tres-vencidas'));
            $this->assertTrue($chaves->contains('sem-referencia'));
            $this->assertFalse($chaves->contains('anulada-com-pagamentos'));
        });
    }

    public function test_o_gestor_ve_alertas_de_cobranca_mas_nao_os_de_controlo(): void
    {
        foreach (['F-1', 'F-2', 'F-3'] as $n) {
            $this->facturaAntiga($n, 300);
        }
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $this->actingAs($gestor)->get('/gestor/dashboard')->assertInertia(function (Assert $p) {
            $chaves = collect($p->toArray()['props']['alertas'])->pluck('chave');
            $this->assertTrue($chaves->contains('tres-vencidas'));
            $this->assertFalse($chaves->contains('sem-referencia'));
            $this->assertFalse($chaves->contains('sem-fecho'));
        });

        // vê os KPIs, mas sem a secção de controlo (anulações, estornos, caixa: só do administrador)
        $this->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p->where('controlo', null));
    }

    public function test_o_fuso_horario_e_maputo(): void
    {
        $this->assertSame('Africa/Maputo', config('app.timezone'));
    }
}
