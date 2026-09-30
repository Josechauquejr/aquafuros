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
 * Listas com ?search / ?periodo / ?sort&dir / filtros — o contrato comum a
 * Clientes, Leituras, Facturas e Pagamentos.
 */
class ListasTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Tarifa $tarifa;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('administrador');
        $this->tarifa = Tarifa::create(['nome' => 'Doméstica']);
    }

    private function cliente(string $nome, array $extra = []): Cliente
    {
        static $n = 0;
        $n++;

        return Cliente::create([
            'numero_cliente' => sprintf('CLI-%04d', $n),
            'nome' => $nome,
            'tarifa_id' => $this->tarifa->id,
            'estado' => 'ativo',
            ...$extra,
        ]);
    }

    private function pagamento(Cliente $cliente, string $recibo, float $valor, string $metodo = 'dinheiro'): Pagamento
    {
        $factura = Factura::create([
            'numero_factura' => 'FAT-'.$recibo,
            'cliente_id' => $cliente->id,
            'mes' => 9,
            'ano' => 2026,
            'total_pagar' => $valor,
            'estado' => 'paga',
        ]);

        return Pagamento::create([
            'numero_recibo' => $recibo,
            'factura_id' => $factura->id,
            'cliente_id' => $cliente->id,
            'valor_pago' => $valor,
            'metodo_pagamento' => $metodo,
            'recebido_por' => $this->admin->id,
        ]);
    }

    public function test_pagamentos_ordena_por_valor_e_devolve_o_estado_efectivo(): void
    {
        $ana = $this->cliente('Ana');
        $this->pagamento($ana, 'REC-1', 300);
        $this->pagamento($ana, 'REC-2', 100);
        $this->pagamento($ana, 'REC-3', 200);

        $this->actingAs($this->admin)
            ->get('/pagamentos?sort=valor&dir=asc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagamentos.data.0.numero_recibo', 'REC-2')
                ->where('pagamentos.data.2.numero_recibo', 'REC-1')
                ->where('filtros.sort', 'valor')
                ->where('filtros.dir', 'asc'));
    }

    public function test_pagamentos_ignora_coluna_de_ordenacao_invalida(): void
    {
        $this->actingAs($this->admin)
            ->get('/pagamentos?sort=palavra_invalida;drop&dir=asc')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filtros.sort', 'recibo')
                ->where('filtros.dir', 'desc'));
    }

    public function test_pagamentos_filtra_por_metodo_e_pesquisa(): void
    {
        $ana = $this->cliente('Ana');
        $rui = $this->cliente('Rui');
        $this->pagamento($ana, 'REC-1', 100, 'mpesa');
        $this->pagamento($rui, 'REC-2', 100, 'dinheiro');

        $this->actingAs($this->admin)
            ->get('/pagamentos?metodo=mpesa')
            ->assertInertia(fn (Assert $page) => $page->has('pagamentos.data', 1)->where('pagamentos.data.0.numero_recibo', 'REC-1'));

        $this->actingAs($this->admin)
            ->get('/pagamentos?search=Rui')
            ->assertInertia(fn (Assert $page) => $page->has('pagamentos.data', 1)->where('pagamentos.data.0.numero_recibo', 'REC-2'));
    }

    private function leitura(Cliente $cliente, int $mes, float $anterior, float $actual, bool $confirmado = false): Leitura
    {
        return Leitura::create([
            'cliente_id' => $cliente->id,
            'mes' => $mes,
            'ano' => 2026,
            'leitura_anterior' => $anterior,
            'leitura_actual' => $actual,
            'confirmado' => $confirmado,
            'registado_por' => $this->admin->id,
        ]);
    }

    public function test_leituras_ordena_por_consumo_e_estado(): void
    {
        $ana = $this->cliente('Ana');
        $pendente = $this->leitura($ana, 7, 0, 10);
        $confirmada = $this->leitura($ana, 8, 10, 15, true);
        $facturada = $this->leitura($ana, 9, 15, 45, true);
        Factura::create([
            'numero_factura' => 'FAT-X', 'cliente_id' => $ana->id, 'leitura_id' => $facturada->id,
            'mes' => 9, 'ano' => 2026, 'total_pagar' => 10, 'estado' => 'pendente',
        ]);

        $this->actingAs($this->admin)->get('/leituras?sort=consumo&dir=desc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('leituras.data.0.id', $facturada->id)
                ->where('leituras.data.2.id', $confirmada->id));

        $this->actingAs($this->admin)->get('/leituras?sort=estado&dir=asc')
            ->assertInertia(fn (Assert $page) => $page
                ->where('leituras.data.0.id', $pendente->id)
                ->where('leituras.data.1.id', $confirmada->id)
                ->where('leituras.data.2.id', $facturada->id));

        $this->actingAs($this->admin)->get('/leituras?estado=facturada')
            ->assertInertia(fn (Assert $page) => $page->has('leituras.data', 1)->where('leituras.data.0.id', $facturada->id));

        $this->actingAs($this->admin)->get('/leituras?estado=confirmada')
            ->assertInertia(fn (Assert $page) => $page->has('leituras.data', 1)->where('leituras.data.0.id', $confirmada->id));

        // Por defeito: período mais recente primeiro.
        $this->actingAs($this->admin)->get('/leituras')
            ->assertInertia(fn (Assert $page) => $page
                ->where('leituras.data.0.id', $facturada->id)
                ->where('filtros.sort', 'periodo')
                ->where('filtros.dir', 'desc'));
    }

    public function test_confirmar_leituras_seleccionadas_so_afecta_os_ids_enviados(): void
    {
        $ana = $this->cliente('Ana');
        $a = $this->leitura($ana, 7, 0, 10);
        $b = $this->leitura($ana, 8, 10, 20);

        $this->actingAs($this->admin)->put('/leituras/confirmar-todas', ['ids' => [$a->id]])->assertRedirect();

        $this->assertTrue((bool) $a->fresh()->confirmado);
        $this->assertFalse((bool) $b->fresh()->confirmado);
    }

    private function factura(Cliente $c, string $numero, string $estado, string $vence = '2099-01-01', float $total = 100): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => $c->id, 'mes' => 9, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => $estado, 'data_vencimento' => $vence,
        ]);
    }

    public function test_facturas_estado_vencida_e_anuladas_escondidas_por_defeito(): void
    {
        $ana = $this->cliente('Ana');
        $this->factura($ana, 'F-1', 'pendente', '2000-01-01');
        $this->factura($ana, 'F-2', 'pendente', '2099-01-01');
        $this->factura($ana, 'F-3', 'anulada');

        $this->actingAs($this->admin)->get('/facturas')
            ->assertInertia(fn (Assert $page) => $page->has('facturas.data', 2));

        $this->actingAs($this->admin)->get('/facturas?estado=vencida')
            ->assertInertia(fn (Assert $page) => $page->has('facturas.data', 1)->where('facturas.data.0.numero_factura', 'F-1'));

        $this->actingAs($this->admin)->get('/facturas?estado=anulada')
            ->assertInertia(fn (Assert $page) => $page->has('facturas.data', 1)->where('facturas.data.0.numero_factura', 'F-3'));
    }

    public function test_facturas_anulada_so_para_administrador(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->factura($this->cliente('Ana'), 'F-3', 'anulada');

        $this->actingAs($gestor)->get('/facturas?estado=anulada')
            ->assertInertia(fn (Assert $page) => $page->has('facturas.data', 0)->where('filtros.estado', 'todos'));
    }

    public function test_facturas_ordena_por_total(): void
    {
        $ana = $this->cliente('Ana');
        $this->factura($ana, 'F-1', 'pendente', total: 300);
        $this->factura($ana, 'F-2', 'pendente', total: 100);

        $this->actingAs($this->admin)->get('/facturas?sort=total&dir=asc')
            ->assertInertia(fn (Assert $page) => $page->where('facturas.data.0.numero_factura', 'F-2'));
    }

    public function test_factura_parcial_mostra_o_que_falta_e_o_pagamento_nao_excede_o_remanescente(): void
    {
        $ana = $this->cliente('Ana');
        $factura = $this->factura($ana, 'F-9', 'pendente', total: 1000);

        $this->actingAs($this->admin)->post('/pagamentos', [
            'factura_id' => $factura->id, 'valor_pago' => 400, 'metodo_pagamento' => 'dinheiro',
        ])->assertSessionHasNoErrors();

        $this->assertSame('parcial', $factura->fresh()->estado);

        $this->actingAs($this->admin)->get('/facturas')
            ->assertInertia(fn (Assert $page) => $page
                ->where('facturas.data.0.em_falta', 600)
                ->where('facturas.data.0.total_pago', 400));

        // O formulário de pagamento recebe o remanescente, não o total.
        $this->actingAs($this->admin)->get('/pagamentos')
            ->assertInertia(fn (Assert $page) => $page->where('facturasEmAberto.0.em_falta', 600));

        // Não aceita mais do que falta pagar...
        $this->actingAs($this->admin)->post('/pagamentos', [
            'factura_id' => $factura->id, 'valor_pago' => 700, 'metodo_pagamento' => 'dinheiro',
        ])->assertSessionHasErrors('valor_pago');

        // ...mas aceita pagar o resto, em mais uma prestação.
        $this->actingAs($this->admin)->post('/pagamentos', [
            'factura_id' => $factura->id, 'valor_pago' => 600, 'metodo_pagamento' => 'mpesa',
        ])->assertSessionHasNoErrors();
        $this->assertSame('paga', $factura->fresh()->estado);
    }

    public function test_ligacao_directa_para_editar_ou_anular_uma_factura(): void
    {
        $factura = $this->factura($this->cliente('Ana'), 'F-7', 'pendente');

        $this->actingAs($this->admin)->get('/facturas?editar='.$factura->id)
            ->assertInertia(fn (Assert $page) => $page
                ->where('accaoAlvo', 'editar')
                ->where('facturaAlvo.id', $factura->id));

        $this->actingAs($this->admin)->get('/facturas')
            ->assertInertia(fn (Assert $page) => $page->where('accaoAlvo', null)->where('facturaAlvo', null));
    }

    public function test_lixeira_unica_com_tipo_pesquisa_e_ordenacao(): void
    {
        $ana = $this->cliente('Ana Maria');
        $rui = $this->cliente('Rui Cossa');
        $this->leitura($ana, 8, 0, 10);
        $apagada = $this->leitura($ana, 9, 10, 20);
        $apagada->delete();
        $rui->delete();

        $this->actingAs($this->admin)->get('/lixeira')
            ->assertInertia(fn (Assert $page) => $page
                ->where('filtros.tipo', 'clientes')
                ->has('linhas.data', 1)
                ->where('linhas.data.0.titulo', 'Rui Cossa'));

        $this->actingAs($this->admin)->get('/lixeira?tipo=clientes&search=cosa')
            ->assertInertia(fn (Assert $page) => $page->has('linhas.data', 1));

        $this->actingAs($this->admin)->get('/lixeira?tipo=leituras')
            ->assertInertia(fn (Assert $page) => $page->has('linhas.data', 1)->where('linhas.data.0.subtitulo', 'Leitura de Set/2026'));

        // Só o administrador vê a lixeira.
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->actingAs($gestor)->get('/lixeira')->assertForbidden();
    }

    public function test_paineis_mostram_o_mes_pedido_e_ignoram_meses_invalidos_ou_futuros(): void
    {
        $ana = $this->cliente('Ana');
        $mesPassado = now()->startOfMonth()->subMonth();
        $passada = Factura::create([
            'numero_factura' => 'F-P', 'cliente_id' => $ana->id, 'mes' => $mesPassado->month, 'ano' => $mesPassado->year,
            'total_pagar' => 500, 'estado' => 'pendente',
        ]);
        // facturado = emitido nesse mês
        $passada->forceFill(['created_at' => $mesPassado->copy()->addDays(3)])->saveQuietly();

        $this->actingAs($this->admin)->get('/admin/dashboard?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('mesReferencia.valor', $mesPassado->format('Y-m'))
                ->where('mesReferencia.eActual', false)
                ->where('mesActual.mes', $mesPassado->month)
                ->where('mesActual.totalFacturado', 500));

        // Sem pedido, ou com lixo / futuro: o mês actual.
        foreach (['', '?mes=abc', '?mes=2999-01', '?mes=2026-13'] as $query) {
            $this->actingAs($this->admin)->get('/admin/dashboard'.$query)
                ->assertInertia(fn (Assert $page) => $page->where('mesReferencia.eActual', true));
        }

        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->actingAs($gestor)->get('/gestor/dashboard?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('resumoMes.mes', $mesPassado->month)
                ->where('resumoMes.totalFacturado', 500));

        $tecnico = User::factory()->create();
        $tecnico->assignRole('tecnico');
        $this->actingAs($tecnico)->get('/tecnico/dashboard?mes='.$mesPassado->format('Y-m'))
            ->assertInertia(fn (Assert $page) => $page->where('mesReferencia.valor', $mesPassado->format('Y-m')));
    }

    public function test_painel_do_admin_tem_facturas_vencidas_e_ja_nao_tem_ticket_medio(): void
    {
        $ana = $this->cliente('Ana');
        $this->factura($ana, 'F-V', 'pendente', '2000-01-01', 300);

        $this->actingAs($this->admin)->get('/admin/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->where('facturasVencidas.quantidade', 1)
                ->where('facturasVencidas.valor', 300)
                ->missing('ticketMedioPagamento')
                ->missing('tempoMedioPagamentoDias'));
    }

    public function test_facturado_e_recebido_batem_certo_no_painel_nas_facturas_e_nos_pagamentos(): void
    {
        $ana = $this->cliente('Ana');
        $f1 = $this->factura($ana, 'F-A', 'pendente', total: 1000);
        $f2 = $this->factura($ana, 'F-B', 'pendente', total: 500);
        $this->factura($ana, 'F-X', 'anulada', total: 9999); // nunca conta

        // 400 parcial na F-A e F-B paga por inteiro
        foreach ([[$f1, 400, 'R-1'], [$f2, 500, 'R-2']] as [$f, $valor, $recibo]) {
            $this->actingAs($this->admin)->post('/pagamentos', [
                'factura_id' => $f->id, 'valor_pago' => $valor, 'metodo_pagamento' => 'dinheiro',
            ])->assertSessionHasNoErrors();
        }

        $painel = $this->actingAs($this->admin)->get('/admin/dashboard')->viewData('page')['props']['mesActual'];
        $facturas = $this->actingAs($this->admin)->get('/facturas')->viewData('page')['props']['totais'];
        $pagamentos = $this->actingAs($this->admin)->get('/pagamentos')->viewData('page')['props']['metricas'];

        $this->assertEquals(1500, $painel['totalFacturado']);
        $this->assertEquals(900, $painel['totalRecebido']);

        // Facturas: facturado, recebido (incl. parciais) e o que FALTA pagar
        $this->assertEquals($painel['totalFacturado'], $facturas['totalFacturado']);
        $this->assertEquals($painel['totalRecebido'], $facturas['totalPago']);
        $this->assertEquals(600, $facturas['totalEmAberto']);
        $this->assertEquals($facturas['totalFacturado'], $facturas['totalPago'] + $facturas['totalEmAberto']);

        // Pagamentos: o mesmo dinheiro recebido no mês
        $this->assertEquals($painel['totalRecebido'], $pagamentos['totalRecebido']);

        // O resumo mensal das Facturas também
        $this->actingAs($this->admin)->get('/facturas')
            ->assertInertia(fn (Assert $page) => $page
                ->where('resumoMensal.0.total', 1500)
                ->where('resumoMensal.0.recebido', 900)
                ->where('resumoMensal.0.em_aberto', 600));

        // E o painel do gestor usa a mesma definição
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');
        $this->actingAs($gestor)->get('/gestor/dashboard')
            ->assertInertia(fn (Assert $page) => $page
                ->where('resumoMes.totalFacturado', 1500)
                ->where('resumoMes.totalRecebido', 900));
    }
}
