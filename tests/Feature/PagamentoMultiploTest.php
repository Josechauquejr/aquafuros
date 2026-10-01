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
 * Pagamento de várias facturas do mesmo cliente numa só operação, e os
 * cartões mensais / bloqueio de impressão vazia das listas.
 */
class PagamentoMultiploTest extends TestCase
{
    use RefreshDatabase;

    private User $caixa;

    private Cliente $ana;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->caixa = User::factory()->create();
        $this->caixa->assignRole('caixa');
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $this->ana = $this->cliente($tarifa, 'Ana', 'CLI-0001');
    }

    private function cliente(Tarifa $tarifa, string $nome, string $numero): Cliente
    {
        return Cliente::create(['numero_cliente' => $numero, 'nome' => $nome, 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
    }

    private function factura(Cliente $cliente, string $numero, float $total, int $mes = 9): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $cliente->id, 'mes' => $mes, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => 'pendente', 'data_vencimento' => '2099-01-01',
        ]);
    }

    private function pagar(array $parcelas, array $extra = [])
    {
        return $this->actingAs($this->caixa)->post('/pagamentos/multiplo', [
            'parcelas' => $parcelas,
            'metodo_pagamento' => 'dinheiro',
            ...$extra,
        ]);
    }

    public function test_paga_varias_facturas_com_um_recibo_cada_e_o_mesmo_lote(): void
    {
        $f1 = $this->factura($this->ana, 'F-1', 300, 7);
        $f2 = $this->factura($this->ana, 'F-2', 200, 8);

        $resposta = $this->pagar([
            ['factura_id' => $f1->id, 'valor_pago' => 300],
            ['factura_id' => $f2->id, 'valor_pago' => 50], // parcial
        ]);

        $resposta->assertSessionHasNoErrors();

        $pagamentos = Pagamento::orderBy('id')->get();
        $this->assertCount(2, $pagamentos);
        $this->assertNotNull($pagamentos[0]->lote);
        $this->assertSame($pagamentos[0]->lote, $pagamentos[1]->lote);
        $this->assertNotSame($pagamentos[0]->numero_recibo, $pagamentos[1]->numero_recibo);

        $this->assertSame('paga', $f1->fresh()->estado);
        $this->assertSame('parcial', $f2->fresh()->estado);
        $this->assertEquals(150, $f2->fresh()->emFalta());

        // abre um só recibo com as duas facturas
        $resposta->assertRedirect(route('pagamentos.recibo-lote', ['lote' => $pagamentos[0]->lote]));
    }

    public function test_e_tudo_ou_nada_se_uma_parcela_exceder_o_que_falta(): void
    {
        $f1 = $this->factura($this->ana, 'F-1', 300, 7);
        $f2 = $this->factura($this->ana, 'F-2', 200, 8);

        $this->pagar([
            ['factura_id' => $f1->id, 'valor_pago' => 300],
            ['factura_id' => $f2->id, 'valor_pago' => 999],
        ])->assertSessionHasErrors('parcelas.1.valor_pago');

        $this->assertSame(0, Pagamento::count());
        $this->assertSame('pendente', $f1->fresh()->estado);
    }

    public function test_recusa_facturas_de_clientes_diferentes_e_menos_de_duas(): void
    {
        $bruno = $this->cliente(Tarifa::first(), 'Bruno', 'CLI-0002');
        $f1 = $this->factura($this->ana, 'F-1', 100);
        $f2 = $this->factura($bruno, 'F-2', 100);

        $this->pagar([
            ['factura_id' => $f1->id, 'valor_pago' => 100],
            ['factura_id' => $f2->id, 'valor_pago' => 100],
        ])->assertSessionHas('error');

        $this->pagar([['factura_id' => $f1->id, 'valor_pago' => 100]])->assertSessionHasErrors('parcelas');

        $this->assertSame(0, Pagamento::count());
    }

    public function test_recusa_a_mesma_factura_duas_vezes_e_facturas_ja_pagas(): void
    {
        $f1 = $this->factura($this->ana, 'F-1', 100);
        $f2 = $this->factura($this->ana, 'F-2', 100);
        $f2->update(['estado' => 'paga']);

        $this->pagar([
            ['factura_id' => $f1->id, 'valor_pago' => 10],
            ['factura_id' => $f1->id, 'valor_pago' => 10],
        ])->assertSessionHasErrors('parcelas.0.factura_id');

        $this->pagar([
            ['factura_id' => $f1->id, 'valor_pago' => 100],
            ['factura_id' => $f2->id, 'valor_pago' => 100],
        ])->assertSessionHas('error');

        $this->assertSame(0, Pagamento::count());
    }

    public function test_o_tecnico_nao_pode_registar_pagamentos(): void
    {
        $tecnico = User::factory()->create();
        $tecnico->assignRole('tecnico');
        $f1 = $this->factura($this->ana, 'F-1', 100);
        $f2 = $this->factura($this->ana, 'F-2', 100);

        $this->actingAs($tecnico)->post('/pagamentos/multiplo', [
            'parcelas' => [['factura_id' => $f1->id, 'valor_pago' => 100], ['factura_id' => $f2->id, 'valor_pago' => 100]],
            'metodo_pagamento' => 'dinheiro',
        ])->assertForbidden();
    }

    public function test_listas_mostram_os_cartoes_do_mes_pedido(): void
    {
        $this->caixa->assignRole('administrador');
        $mesPassado = now()->startOfMonth()->subMonth();
        $f = $this->factura($this->ana, 'F-P', 500, $mesPassado->month);
        $f->forceFill(['created_at' => $mesPassado->copy()->addDays(2)])->saveQuietly();

        foreach (['/facturas' => 'totais', '/pagamentos' => 'resumoMes', '/leituras' => 'resumoMes'] as $rota => $prop) {
            $this->actingAs($this->caixa)
                ->get($rota.'?mes='.$mesPassado->format('Y-m'))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('mesReferencia.valor', $mesPassado->format('Y-m'))
                    ->where($prop.'.totalFacturado', 500)
                    ->where($prop.'.emAberto', 500));

            // mês actual: nada facturado
            $this->get($rota)->assertInertia(fn (Assert $page) => $page
                ->where('mesReferencia.eActual', true)
                ->where($prop.'.totalFacturado', 0));
        }
    }

    public function test_o_mes_escolhido_filtra_tambem_as_tabelas(): void
    {
        $this->caixa->assignRole('administrador');
        $mesPassado = now()->startOfMonth()->subMonth();
        $velha = $this->factura($this->ana, 'F-VELHA', 500, $mesPassado->month);
        $velha->forceFill(['created_at' => $mesPassado->copy()->addDays(2)])->saveQuietly();
        $this->factura($this->ana, 'F-NOVA', 100);

        $pag = Pagamento::create([
            'numero_recibo' => 'REC-1', 'factura_id' => $velha->id, 'cliente_id' => $this->ana->id,
            'valor_pago' => 50, 'metodo_pagamento' => 'dinheiro', 'recebido_por' => $this->caixa->id,
        ]);
        $pag->forceFill(['created_at' => $mesPassado->copy()->addDays(3), 'pago_em' => $mesPassado->copy()->addDays(3)])->saveQuietly();

        $this->actingAs($this->caixa);

        // sem mês escolhido: tudo (facturas) — e o mês não vai para os filtros
        $this->get('/facturas')->assertInertia(fn (Assert $p) => $p->has('facturas.data', 2)->where('filtros.mes', ''));

        $this->get('/facturas?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $p) => $p->has('facturas.data', 1)->where('facturas.data.0.numero_factura', 'F-VELHA'));

        // Pagamentos: por omissão "este mês" (vazio); com o mês passado escolhido aparece o recibo desse mês
        $this->get('/pagamentos')->assertInertia(fn (Assert $p) => $p->has('pagamentos.data', 0));
        $this->get('/pagamentos?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $p) => $p->has('pagamentos.data', 1));
    }

    public function test_kpis_seguem_o_mes_escolhido(): void
    {
        $this->caixa->assignRole('administrador');
        $mesPassado = now()->startOfMonth()->subMonths(2);
        $f = $this->factura($this->ana, 'F-K', 700, $mesPassado->month);
        $f->forceFill(['created_at' => $mesPassado->copy()->addDays(5)])->saveQuietly();

        $this->actingAs($this->caixa)->get('/admin/kpis?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $p) => $p
                ->where('mesReferencia.valor', $mesPassado->format('Y-m'))
                ->where('mes.totalFacturado', 700)
                ->where('facturacao.ticketMedio', 700)
                ->where('variacoes.totalFacturado.anterior', null)
                ->where('filtros.mes', $mesPassado->format('Y-m')));

        $this->get('/admin/kpis')
            ->assertInertia(fn (Assert $p) => $p->where('mes.totalFacturado', 0)->has('antiguidadeDivida', 5)->has('consumo.anomalias'));

        $this->get('/admin/kpis/exportar?mes='.$mesPassado->format('Y-m'))
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_kpis_calculam_cobranca_consumo_e_exportam_csv_com_dados(): void
    {
        $this->caixa->assignRole('administrador');
        $mes = now()->startOfMonth();
        $anterior = $mes->copy()->subMonth();

        // consumo habitual 10 m³ nos 3 meses anteriores e 30 m³ neste (anomalia)
        foreach ([3, 2, 1] as $atras) {
            $m = $mes->copy()->subMonths($atras);
            Leitura::create(['cliente_id' => $this->ana->id, 'mes' => $m->month, 'ano' => $m->year, 'leitura_anterior' => 0, 'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->caixa->id]);
        }
        $leitura = Leitura::create(['cliente_id' => $this->ana->id, 'mes' => $mes->month, 'ano' => $mes->year, 'leitura_anterior' => 10, 'leitura_actual' => 40, 'confirmado' => true, 'registado_por' => $this->caixa->id]);

        $f = $this->factura($this->ana, 'F-1', 1000, $mes->month);
        $f->update(['leitura_id' => $leitura->id, 'multa' => 100]);
        $velha = $this->factura($this->ana, 'F-0', 400, $anterior->month);
        $velha->forceFill(['created_at' => $anterior->copy()->addDays(2), 'data_vencimento' => now()->subDays(45)])->saveQuietly();

        $this->actingAs($this->caixa)->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 1000, 'metodo_pagamento' => 'mpesa']);
        $this->post('/pagamentos', ['factura_id' => $velha->id, 'valor_pago' => 100, 'metodo_pagamento' => 'dinheiro']);

        $this->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('consumo.medidoM3', 30)
            ->where('consumo.facturadoM3', 30)
            ->where('consumo.totalAnomalias', 1)
            ->where('consumo.anomalias.0.variacao', 200)
            ->where('cobranca.recuperacaoDividaAntiga', 100)
            ->where('cobranca.tempoMedioPagamentoDias', 0)
            ->where('facturacao.pesoMulta', 10)
            ->where('antiguidadeDivida.2.quantidade', 1) // F-0: 45 dias de atraso, 300 em falta
            ->where('antiguidadeDivida.2.valor', 300)
            ->where('clientes.concentracaoTop10', 100));

        $csv = $this->get('/admin/kpis/exportar')->streamedContent();
        $this->assertStringContainsString('CONSUMOS ANORMAIS', $csv);
        $this->assertStringContainsString('Ana', $csv);
    }

    public function test_imprimir_filtradas_sem_resultados_nao_abre_folha_vazia(): void
    {
        $this->caixa->assignRole('administrador');
        $this->factura($this->ana, 'F-1', 100);

        $this->actingAs($this->caixa)->get('/facturas/imprimir-lote?estado=paga')
            ->assertRedirect('/facturas')
            ->assertSessionHas('error');

        $this->actingAs($this->caixa)->get('/pagamentos/imprimir-lote?ids=9999')
            ->assertRedirect('/pagamentos')
            ->assertSessionHas('error');
    }
}
