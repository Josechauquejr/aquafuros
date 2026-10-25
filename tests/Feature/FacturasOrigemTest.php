<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\Tarifa;
use App\Models\User;
use App\Services\ReconciliarFacturasOrigem;
use App\Support\Facturacao;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FacturasOrigemTest extends TestCase
{
    use RefreshDatabase;

    private User $caixa;
    private Cliente $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->caixa = User::factory()->create();
        $this->caixa->assignRole('administrador');
        $tarifa = Tarifa::create(['nome' => 'Comercial', 'taxa_minima' => 600, 'consumo_minimo_m3' => 8, 'percentagem_multa' => 0.12]);
        $this->cliente = Cliente::create(['numero_cliente' => 'CLI-TESTE', 'nome' => 'Cliente teste', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
    }

    private function quatro(): array
    {
        $anteriores = collect(range(1, 3))->map(fn ($n) => Factura::create([
            'numero_factura' => "FAT-ANT-{$n}", 'cliente_id' => $this->cliente->id,
            'mes' => $n, 'ano' => 2026, 'valor_consumo' => 600, 'multa' => 72,
            'total_pagar' => 672, 'divida_anterior_incluida' => false, 'estado' => 'pendente',
            'data_vencimento' => now()->subDays(30), 'created_at' => now()->subMonths(4 - $n),
        ]));
        $leitura = Leitura::create(['cliente_id' => $this->cliente->id, 'mes' => 10, 'ano' => 2026, 'leitura_anterior' => 10, 'leitura_actual' => 15, 'confirmado' => true, 'registado_por' => $this->caixa->id]);
        $quarta = Facturacao::emitir($leitura, $this->caixa->id);
        return [$anteriores, $quarta];
    }

    private function pagar($facturas, bool $comMulta = true, float $valor = 672)
    {
        return $this->actingAs($this->caixa)->post('/pagamentos/multiplo', [
            'parcelas' => $facturas->map(fn ($f) => ['factura_id' => $f->id, 'valor_pago' => $valor, 'incluir_multa' => $comMulta])->all(),
            'metodo_pagamento' => 'dinheiro',
        ]);
    }

    public function test_emissao_preserva_origens_e_pagar_primeiras_duas_com_multa_actualiza_quarta(): void
    {
        [$anteriores, $quarta] = $this->quatro();
        $this->assertEquals(600, $quarta->total_pagar);
        $this->assertEquals(2616, $quarta->emissao_original['total_pagar']);
        $this->assertSame(3, $quarta->origensSaldo()->count());
        $this->assertSame(0, Factura::where('estado', 'transferida')->count());
        $this->pagar($anteriores->take(2))->assertSessionHasNoErrors();
        $this->assertSame(['paga', 'paga', 'pendente'], $anteriores->map(fn ($f) => $f->fresh()->estado)->all());
        $this->assertEquals(1272, $this->cliente->saldoEmAberto());
        $resumo = $quarta->fresh()->prepararDocumento()->cobranca;
        $this->assertEquals(2616, $resumo['total_emitido']);
        $this->assertEquals(1344, $resumo['pagamentos_apos_emissao']);
        $this->assertEquals(672, $resumo['saldo_anterior_actual']);
        $this->assertEquals(1272, $resumo['saldo_actual']);
        foreach (Pagamento::all() as $p) {
            $this->assertEquals(600, $p->imputacoes->sum('valor_principal'));
            $this->assertEquals(72, $p->imputacoes->sum('valor_multa'));
            $this->assertEquals($p->valor_pago, $p->imputacoes->sum(fn ($i) => $i->valor_principal + $i->valor_multa));
        }
    }

    public function test_pagar_tres_com_multas_deixa_apenas_o_consumo_da_quarta(): void
    {
        [$anteriores, $quarta] = $this->quatro();
        $this->pagar($anteriores)->assertSessionHasNoErrors();
        $this->assertEquals(600, $this->cliente->saldoEmAberto());
        $this->assertEquals(600, $quarta->fresh()->prepararDocumento()->cobranca['saldo_actual']);
        $this->assertEquals(0, $quarta->fresh()->prepararDocumento()->cobranca['saldo_anterior_actual']);
    }

    public function test_sem_multas_as_penalizacoes_continuam_nas_facturas_de_origem(): void
    {
        [$anteriores, $quarta] = $this->quatro();
        $this->pagar($anteriores, false, 600)->assertSessionHasNoErrors();
        foreach ($anteriores as $f) {
            $this->assertSame('parcial', $f->fresh()->estado);
            $this->assertEquals(72, $f->fresh()->multaEmFalta());
            $this->assertEquals(0, $f->fresh()->principalEmFalta());
        }
        $this->assertEquals(816, $quarta->fresh()->prepararDocumento()->cobranca['saldo_actual']);
        $f = $anteriores->first()->fresh();
        $this->actingAs($this->caixa)->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 72, 'incluir_multa' => true, 'metodo_pagamento' => 'dinheiro'])->assertSessionHasNoErrors();
        $this->assertEquals(72, Pagamento::latest('id')->first()->imputacoes->sum('valor_multa'));
    }

    public function test_estorno_e_reposicao_reabrem_e_voltam_a_abater_as_origens(): void
    {
        [$anteriores, $quarta] = $this->quatro();
        $this->pagar($anteriores->take(2))->assertSessionHasNoErrors();
        $p = Pagamento::first();
        $this->actingAs($this->caixa)->delete('/pagamentos/'.$p->getRouteKey())->assertRedirect();
        $this->assertEquals(1944, $quarta->fresh()->prepararDocumento()->cobranca['saldo_actual']);
        $p->fresh()->restore();
        $this->assertEquals(1272, $quarta->fresh()->prepararDocumento()->cobranca['saldo_actual']);
    }

    public function test_reconciliacao_preserva_recibo_antigo_e_saldo_distribuindo_o_principal_primeiro(): void
    {
        [$anteriores, $quarta] = $this->quatro();
        DB::table('factura_saldos')->delete();
        DB::table('facturas')->update(['emissao_original' => null]);
        DB::table('facturas')->whereIn('id', $anteriores->pluck('id'))->update(['estado' => 'transferida', 'transferida_para_id' => $quarta->id]);
        DB::table('facturas')->where('id', $quarta->id)->update(['divida_anterior_incluida' => true, 'divida_anterior' => 1800, 'multa_anterior' => 216, 'total_pagar' => 2616, 'estado' => 'parcial']);
        $id = DB::table('pagamentos')->insertGetId(['numero_recibo' => 'REC-LEGADO', 'cliente_id' => $this->cliente->id, 'factura_id' => $quarta->id, 'valor_pago' => 1344, 'metodo_pagamento' => 'dinheiro', 'created_at' => now(), 'updated_at' => now(), 'pago_em' => now()]);
        $resultado = app(ReconciliarFacturasOrigem::class)->executar();
        $this->assertSame(127200, $resultado['saldo_centavos']);
        $p = Pagamento::findOrFail($id);
        $this->assertSame('REC-LEGADO', $p->numero_recibo);
        $this->assertEquals(1344, $p->valor_pago);
        $this->assertEquals($quarta->id, $p->factura_id);
        $this->assertCount(3, $p->imputacoes);
        $this->assertEquals(1344, $p->imputacoes->sum('valor_principal'));
        $this->assertEquals(0, $p->imputacoes->sum('valor_multa'));
        $this->assertEquals(1272, $quarta->fresh()->prepararDocumento()->cobranca['saldo_actual']);
        $p->delete();
        $this->assertEquals(2616, $this->cliente->saldoEmAberto());
    }

    public function test_nao_cobra_multa_duas_vezes_e_nao_aceita_pagamento_duplicado(): void
    {
        [$anteriores] = $this->quatro();
        $f = $anteriores->first();
        $this->assertEquals(0, $f->registarMultaAtraso());
        $this->pagar($anteriores->take(2))->assertSessionHasNoErrors();
        $this->pagar($anteriores->take(2))->assertSessionHas('error');
        $this->assertSame(2, Pagamento::count());
    }

    public function test_nova_emissao_no_mesmo_instante_nao_volta_a_descontar_pagamentos_anteriores(): void
    {
        $this->travelTo(now()->startOfSecond());
        [$anteriores] = $this->quatro();
        $this->pagar($anteriores->take(2))->assertSessionHasNoErrors();
        $leitura = Leitura::create(['cliente_id' => $this->cliente->id, 'mes' => 11, 'ano' => 2026, 'leitura_anterior' => 15, 'leitura_actual' => 20, 'confirmado' => true, 'registado_por' => $this->caixa->id]);
        $quinta = Facturacao::emitir($leitura, $this->caixa->id)->fresh()->prepararDocumento();
        $this->assertEquals(1872, $quinta->cobranca['total_emitido']);
        $this->assertEquals(1872, $quinta->cobranca['saldo_actual']);
        $this->assertEquals(0, $quinta->cobranca['pagamentos_apos_emissao']);
        $this->assertEquals(0, $quinta->cobranca['ajustamentos_posteriores']);
    }

    public function test_edicao_de_factura_nao_permite_alterar_estado_financeiro(): void
    {
        $factura = Factura::create([
            'numero_factura' => 'FAT-ESTADO-TESTE',
            'cliente_id' => $this->cliente->id,
            'mes' => 10,
            'ano' => 2026,
            'valor_consumo' => 600,
            'total_pagar' => 600,
            'estado' => 'pendente',
        ]);

        foreach (['paga', 'parcial', 'anulada'] as $estado) {
            $this->actingAs($this->caixa)->put('/facturas/'.$factura->numero_factura, [
                'multa' => 0,
                'estado' => $estado,
            ])->assertSessionHasErrors('estado');

            $this->assertSame('pendente', $factura->fresh()->estado);
            $this->assertSame(0, Pagamento::where('factura_id', $factura->id)->count());
        }
    }
}
