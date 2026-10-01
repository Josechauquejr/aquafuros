<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Fase 2: quem confirmou a leitura, data de pagamento, dinheiro contado no
 * fecho, prazos configuráveis, recibo único e estorno de lote, previsão e
 * evolução da dívida, movimentos de clientes.
 */
class Fase2Test extends TestCase
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
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $this->ana = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
    }

    private function factura(string $numero, float $total, ?string $vence = null, int $mes = 9): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $this->ana->id, 'mes' => $mes, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => 'pendente', 'data_vencimento' => $vence ?? now()->addDays(10)->toDateString(),
        ]);
    }

    public function test_leitura_confirmada_regista_quem_e_quando(): void
    {
        $leitura = Leitura::create([
            'cliente_id' => $this->ana->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0, 'leitura_actual' => 10,
            'confirmado' => false, 'registado_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->put('/leituras/'.$leitura->id, ['leitura_actual' => 10, 'confirmado' => true]);

        $leitura->refresh();
        $this->assertEquals(true, $leitura->confirmado);
        $this->assertSame($this->admin->id, $leitura->confirmado_por);
        $this->assertNotNull($leitura->confirmado_em);

        $outra = Leitura::create([
            'cliente_id' => Cliente::create(['numero_cliente' => 'CLI-2', 'nome' => 'Bia', 'tarifa_id' => Tarifa::first()->id, 'estado' => 'ativo'])->id,
            'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0, 'leitura_actual' => 5, 'confirmado' => false, 'registado_por' => $this->admin->id,
        ]);
        $this->put('/leituras/confirmar-todas')->assertSessionHas('status');
        $this->assertSame($this->admin->id, $outra->fresh()->confirmado_por);
    }

    public function test_pagamento_pode_ter_data_anterior_dentro_do_limite(): void
    {
        $f = $this->factura('F-1', 500);
        $ontem = now()->subDay()->toDateString();

        $this->actingAs($this->admin)->post('/pagamentos', [
            'factura_id' => $f->id, 'valor_pago' => 100, 'metodo_pagamento' => 'banco', 'referencia_pagamento' => 'TRF-1', 'data_pagamento' => $ontem,
        ])->assertSessionHasNoErrors();

        $this->assertSame($ontem, Pagamento::first()->pago_em->toDateString());

        // futuro e demasiado antigo são recusados
        $this->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 10, 'metodo_pagamento' => 'dinheiro', 'data_pagamento' => now()->addDay()->toDateString()])
            ->assertSessionHasErrors('data_pagamento');
        $this->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 10, 'metodo_pagamento' => 'dinheiro', 'data_pagamento' => now()->subDays(30)->toDateString()])
            ->assertSessionHasErrors('data_pagamento');

        // com o limite alargado já passa
        Configuracao::definir('pagamento_dias_retroactivos', 60);
        $this->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 10, 'metodo_pagamento' => 'dinheiro', 'data_pagamento' => now()->subDays(30)->toDateString()])
            ->assertSessionHasNoErrors();
    }

    public function test_os_relatorios_contam_pela_data_do_pagamento(): void
    {
        $f = $this->factura('F-2', 300, null, now()->month);
        $mesPassado = now()->startOfMonth()->subMonth();
        Pagamento::create([
            'numero_recibo' => 'R-1', 'factura_id' => $f->id, 'cliente_id' => $this->ana->id, 'valor_pago' => 120,
            'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->admin->id, 'pago_em' => $mesPassado->copy()->addDays(5),
        ]);

        $this->actingAs($this->admin)->get('/pagamentos?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $p) => $p->has('pagamentos.data', 1)->where('resumoMes.recebidoNoMes', 120));
        $this->get('/pagamentos')->assertInertia(fn (Assert $p) => $p->where('resumoMes.recebidoNoMes', 0));
    }

    public function test_fecho_de_caixa_exige_o_dinheiro_contado_e_regista_a_diferenca(): void
    {
        $caixa = User::factory()->create();
        $caixa->assignRole('caixa');
        $f = $this->factura('F-3', 500);
        Pagamento::create(['numero_recibo' => 'R-2', 'factura_id' => $f->id, 'cliente_id' => $this->ana->id, 'valor_pago' => 200, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $caixa->id]);
        Pagamento::create(['numero_recibo' => 'R-3', 'factura_id' => $f->id, 'cliente_id' => $this->ana->id, 'valor_pago' => 100, 'metodo_pagamento' => 'mpesa', 'referencia_pagamento' => 'X', 'recebido_por' => $caixa->id]);

        $this->actingAs($caixa)->post('/pagamentos/fecho-caixa/confirmar', [])->assertSessionHasErrors('valor_contado');
        $this->assertSame(0, FechoCaixa::count());

        $this->post('/pagamentos/fecho-caixa/confirmar', ['valor_contado' => 190])->assertSessionHasNoErrors();

        $fecho = FechoCaixa::firstOrFail();
        $this->assertEquals(190, $fecho->valor_contado);
        $this->assertEquals(-10, $fecho->diferenca); // só o dinheiro conta: 190 − 200 (o M-Pesa não se conta na gaveta)

        $this->actingAs($this->admin)->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('controlo.diferencasCaixa.total', 1)
            ->where('controlo.diferencasCaixa.soma', -10));
    }

    public function test_prazos_configuraveis_afectam_o_vencimento_das_novas_facturas(): void
    {
        $this->actingAs($this->admin)->put('/tarifas/regras', [
            'dias_vencimento' => 30, 'leituras_dia_limite' => 20, 'pagamento_dias_retroactivos' => 3,
        ])->assertSessionHasNoErrors();

        $this->assertSame(['dias_vencimento' => 30, 'leituras_dia_limite' => 20, 'pagamento_dias_retroactivos' => 3], Configuracao::regrasDeCobranca());

        $leitura = Leitura::create([
            'cliente_id' => $this->ana->id, 'mes' => now()->month, 'ano' => now()->year, 'leitura_anterior' => 0, 'leitura_actual' => 10,
            'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);
        $this->post('/facturas', ['leitura_id' => $leitura->id]);

        $this->assertSame(now()->addDays(30)->toDateString(), Factura::where('leitura_id', $leitura->id)->first()->data_vencimento->toDateString());

        $this->put('/tarifas/regras', ['dias_vencimento' => 0, 'leituras_dia_limite' => 20, 'pagamento_dias_retroactivos' => 3])->assertSessionHasErrors('dias_vencimento');
    }

    public function test_recibo_unico_e_estorno_do_lote_completo(): void
    {
        $f1 = $this->factura('F-4', 100);
        $f2 = $this->factura('F-5', 200);

        $this->actingAs($this->admin)->post('/pagamentos/multiplo', [
            'parcelas' => [['factura_id' => $f1->id, 'valor_pago' => 100], ['factura_id' => $f2->id, 'valor_pago' => 200]],
            'metodo_pagamento' => 'dinheiro',
        ]);

        $lote = Pagamento::first()->lote;

        $this->get('/pagamentos/lote/'.$lote.'/recibo')->assertInertia(fn (Assert $p) => $p
            ->component('Pagamentos/ReciboLote')->has('pagamentos', 2)->where('total', 300));

        // a lista diz quantos recibos tem o lote (para avisar ao estornar só um)
        $this->get('/pagamentos')->assertInertia(fn (Assert $p) => $p->where('pagamentos.data.0.lote_total', 2));

        $this->delete('/pagamentos/lote/'.$lote)->assertSessionHas('status');

        $this->assertSame(0, Pagamento::count());
        $this->assertSame('pendente', $f1->fresh()->estado);
        $this->assertSame('pendente', $f2->fresh()->estado);

        $this->get('/pagamentos/lote/'.$lote.'/recibo')->assertNotFound();
    }

    public function test_so_o_administrador_estorna_um_lote(): void
    {
        $f1 = $this->factura('F-6', 100);
        $f2 = $this->factura('F-7', 100);
        $caixa = User::factory()->create();
        $caixa->assignRole('caixa');

        $this->actingAs($caixa)->post('/pagamentos/multiplo', [
            'parcelas' => [['factura_id' => $f1->id, 'valor_pago' => 100], ['factura_id' => $f2->id, 'valor_pago' => 100]],
            'metodo_pagamento' => 'dinheiro',
        ]);

        $this->delete('/pagamentos/lote/'.Pagamento::first()->lote)->assertSessionHas('error');
        $this->assertSame(2, Pagamento::count());
    }

    public function test_previsao_de_caixa_e_evolucao_da_divida(): void
    {
        // dívida de 400 (vencida) e 600 a vencer em 10 dias
        $this->factura('F-8', 400, now()->subDays(5)->toDateString());
        $this->factura('F-9', 600, now()->addDays(10)->toDateString());

        $this->actingAs($this->admin)->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('previsao.aVencer.valor', 600)
            ->where('previsao.emAtraso.valor', 400)
            ->where('previsao.fiavel', false)          // sem histórico de 2–6 meses
            ->has('evolucaoDivida', 12)
            ->where('evolucaoDivida.11.divida', 1000)); // as duas facturas foram emitidas este mês
    }

    public function test_movimentos_de_clientes_vem_do_registo_de_actividade(): void
    {
        $this->actingAs($this->admin);
        $this->ana->update(['estado' => 'cortado']);
        $this->ana->update(['estado' => 'ativo']);

        $this->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('clientes.movimentos.cortados', 1)
            ->where('clientes.movimentos.reactivados', 1));
    }

    public function test_a_tabela_dividas_ja_nao_existe_e_criar_cliente_continua_a_funcionar(): void
    {
        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasTable('dividas'));

        $this->actingAs($this->admin)->post('/clientes', [
            'nome' => 'Carlos', 'tarifa_id' => Tarifa::first()->id, 'estado' => 'ativo', 'leitura_inicial' => 0,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('clientes', ['nome' => 'Carlos']);
    }
}
