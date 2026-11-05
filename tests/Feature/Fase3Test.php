<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Credito;
use App\Models\Factura;
use App\Models\FechoCaixa;
use App\Models\Leitura;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\PromessaPagamento;
use App\Models\Tarifa;
use App\Models\User;
use App\Models\Zona;
use App\Support\MesReferencia;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Fase 3: zonas, cobrança (contactos e promessas), mensagens, ocorrências,
 * perdas de água, crédito de clientes e KPIs/alertas associados.
 */
class Fase3Test extends TestCase
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
        $this->ana = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'telefone' => '845626156', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
    }

    private function utilizador(string $papel): User
    {
        $u = User::factory()->create();
        $u->assignRole($papel);

        return $u;
    }

    private function factura(string $numero, float $total, ?string $vence = null, ?Cliente $cliente = null): Factura
    {
        return Factura::create([
            'numero_factura' => $numero, 'cliente_id' => ($cliente ?? $this->ana)->id, 'mes' => 9, 'ano' => 2026,
            'total_pagar' => $total, 'estado' => 'pendente', 'data_vencimento' => $vence ?? now()->subDays(5)->toDateString(),
        ]);
    }

    // ---------------------------------------------------------------- zonas

    public function test_zonas_so_o_administrador_e_o_bairro_acompanha_a_zona(): void
    {
        $this->actingAs($this->admin)->post('/zonas', ['nome' => 'Centro'])->assertSessionHasNoErrors();
        $this->post('/zonas', ['nome' => 'Centro'])->assertSessionHasErrors('nome'); // única

        $zona = Zona::firstOrFail();
        $this->put('/clientes/'.$this->ana->id, [
            'nome' => 'Ana', 'zona_id' => $zona->id, 'tarifa_id' => Tarifa::first()->id, 'estado' => 'ativo', 'telefone' => '845626156',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Centro', $this->ana->fresh()->bairro);

        $this->put('/zonas/'.$zona->id, ['nome' => 'Baixa']);
        $this->assertSame('Baixa', $this->ana->fresh()->bairro);

        // com clientes não se apaga
        $this->delete('/zonas/'.$zona->id)->assertSessionHas('error');

        $this->actingAs($this->utilizador('gestor'))->get('/zonas')->assertForbidden();
    }

    // ------------------------------------------------------------- cobrança

    public function test_contacto_com_promessa_e_avaliacao_automatica(): void
    {
        $f = $this->factura('F-1', 500);
        $gestor = $this->utilizador('gestor');

        $this->actingAs($gestor)->post('/cobranca/contactos', [
            'cliente_id' => $this->ana->id, 'canal' => 'telefone', 'resultado' => 'prometeu_pagar',
            'valor' => 300, 'data_prometida' => now()->addDays(3)->toDateString(), 'nota' => 'paga sexta',
        ])->assertSessionHasNoErrors();

        $promessa = PromessaPagamento::firstOrFail();
        $this->assertSame('pendente', $promessa->estado);

        // paga 300 → cumprida
        $this->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 300, 'metodo_pagamento' => 'dinheiro']);
        $this->get('/cobranca')->assertInertia(fn (Assert $p) => $p
            ->has('linhas', 1)->where('linhas.0.promessa.estado', 'cumprida')->where('linhas.0.ultimoContacto.resultado', 'prometeu_pagar'));

        // outra promessa que não se cumpre e já passou do dia → falhada
        $velha = PromessaPagamento::create([
            'cliente_id' => $this->ana->id, 'valor' => 999, 'data_prometida' => now()->subDay()->toDateString(), 'criado_por' => $gestor->id,
        ]);
        $velha->forceFill(['created_at' => now()->subDays(3)])->saveQuietly();
        PromessaPagamento::avaliarPendentes();
        $this->assertSame('falhada', $velha->fresh()->estado);
    }

    public function test_promessa_exige_valor_e_data_futura_e_so_gestor_ou_admin_acedem(): void
    {
        $this->factura('F-2', 100);

        $this->actingAs($this->admin)->post('/cobranca/contactos', [
            'cliente_id' => $this->ana->id, 'canal' => 'telefone', 'resultado' => 'prometeu_pagar',
        ])->assertSessionHasErrors(['valor', 'data_prometida']);

        $this->post('/cobranca/contactos', [
            'cliente_id' => $this->ana->id, 'canal' => 'telefone', 'resultado' => 'prometeu_pagar', 'valor' => 10, 'data_prometida' => now()->subDay()->toDateString(),
        ])->assertSessionHasErrors('data_prometida');

        $this->actingAs($this->utilizador('caixa'))->get('/cobranca')->assertForbidden();
        $this->actingAs($this->utilizador('tecnico'))->get('/notificacoes')->assertNotFound();
    }

    // Emails de cobranca e notificacoes automaticas foram removidos do produto.
    public function test_rotas_legadas_de_email_de_cobranca_nao_estao_disponiveis(): void
    {
        $gestor = $this->utilizador('gestor');
        $this->actingAs($gestor)->get('/notificacoes')->assertNotFound();
        $this->post('/cobranca/clientes/'.$this->ana->id.'/email')->assertNotFound();
    }

    // ---------------------------------------------------------- ocorrências

    public function test_ocorrencia_do_aviso_a_resolucao_e_tempos_nos_kpis(): void
    {
        // A meio do mês de referência: "há 10 horas" fica sempre dentro do mesmo mês.
        $this->travelTo(MesReferencia::actual()->day(20)->setTime(12, 0));
        $zona = Zona::create(['nome' => 'Norte']);
        $this->ana->update(['zona_id' => $zona->id]);
        $tecnico = $this->utilizador('tecnico');

        $this->actingAs($tecnico)->post('/ocorrencias', [
            'tipo' => 'sem_agua', 'descricao' => 'Sem água desde ontem', 'cliente_id' => $this->ana->id,
            'reportada_em' => now()->subHours(10)->toDateTimeString(),
        ])->assertSessionHasNoErrors();

        $o = Ocorrencia::firstOrFail();
        $this->assertSame($zona->id, $o->zona_id); // herdada do cliente

        $this->put('/ocorrencias/'.$o->id, ['accao' => 'resolver'])->assertSessionHasErrors('resolucao');
        $this->put('/ocorrencias/'.$o->id, ['accao' => 'iniciar']);
        $this->put('/ocorrencias/'.$o->id, ['accao' => 'resolver', 'resolucao' => 'Válvula substituída']);

        $this->assertSame('resolvida', $o->fresh()->estado);
        $this->assertSame($tecnico->id, $o->fresh()->resolvido_por);

        $this->actingAs($this->admin)->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('ocorrencias.reportadas', 1)->where('ocorrencias.resolvidas', 1)
            ->where('ocorrencias.horasAteResolver', fn ($h) => $h >= 9.9 && $h <= 10.5)
            ->where('ocorrencias.porZona.Norte', 1));

        // só o administrador apaga
        $this->actingAs($tecnico)->delete('/ocorrencias/'.$o->id)->assertSessionHas('error');
        $this->assertNotNull(Ocorrencia::find($o->id));
    }

    public function test_ocorrencia_aberta_ha_mais_de_48h_gera_alerta(): void
    {
        Ocorrencia::create([
            'tipo' => 'fuga', 'descricao' => 'Fuga grande', 'reportada_em' => now()->subDays(3), 'registado_por' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->get('/admin/dashboard')->assertInertia(function (Assert $p) {
            $this->assertTrue(collect($p->toArray()['props']['alertas'])->pluck('chave')->contains('ocorrencias'));
        });
    }

    // ----------------------------------------------------- produção e perdas

    public function test_perdas_de_agua_produzido_menos_facturado(): void
    {
        $mes = MesReferencia::actual();
        $leitura = Leitura::create([
            'cliente_id' => $this->ana->id, 'mes' => $mes->month, 'ano' => $mes->year, 'leitura_anterior' => 0, 'leitura_actual' => 600,
            'confirmado' => true, 'registado_por' => $this->admin->id,
        ]);
        Factura::create([
            'numero_factura' => 'F-P', 'cliente_id' => $this->ana->id, 'leitura_id' => $leitura->id, 'mes' => $mes->month, 'ano' => $mes->year,
            'total_pagar' => 100, 'estado' => 'pendente',
        ]);

        $tecnico = $this->utilizador('tecnico');
        $this->actingAs($tecnico)->post('/producao', ['mes' => $mes->month, 'ano' => $mes->year, 'volume_m3' => 1000])->assertSessionHasNoErrors();
        $this->post('/producao', ['mes' => $mes->month, 'ano' => $mes->year, 'volume_m3' => 1000]); // corrige, não duplica
        $this->assertSame(1, ProducaoAgua::count());

        $this->get('/producao')->assertInertia(fn (Assert $p) => $p
            ->where('perdas.produzidoM3', 1000)->where('perdas.facturadoM3', 600)->where('perdas.perdasPct', 40));

        $this->actingAs($this->admin)->get('/admin/dashboard')->assertInertia(function (Assert $p) {
            $this->assertTrue(collect($p->toArray()['props']['alertas'])->pluck('chave')->contains('perdas'));
        });
    }

    // --------------------------------------------------------------- crédito

    public function test_adiantamento_vira_credito_conta_no_fecho_mas_nao_e_receita(): void
    {
        $caixa = $this->utilizador('caixa');

        $this->actingAs($caixa)->post('/creditos', [
            'cliente_id' => $this->ana->id, 'valor' => 700, 'metodo_pagamento' => 'dinheiro',
        ])->assertSessionHasNoErrors();

        $credito = Credito::firstOrFail();
        $this->assertStringStartsWith('ADI-', $credito->numero_recibo);
        $this->assertEquals(700, Credito::saldoDe($this->ana->id));

        // está na gaveta (fecho) mas não é "recebido" de facturas
        $this->get('/pagamentos/fecho-caixa')->assertInertia(fn (Assert $p) => $p
            ->where('totalGeral', 700)->where('esperadoDinheiro', 700)->has('adiantamentos', 1));

        $this->post('/pagamentos/fecho-caixa/confirmar', ['valor_contado' => 700]);
        $this->assertEquals(0, FechoCaixa::first()->diferenca);

        $this->actingAs($this->admin)->get('/pagamentos')->assertInertia(fn (Assert $p) => $p
            ->where('metricas.totalRecebido', 0)->where('creditos.'.$this->ana->id, 700));
    }

    public function test_caixa_fechado_bloqueia_pagamentos_em_lote_e_adiantamentos(): void
    {
        $caixa = $this->utilizador('caixa');
        $facturaA = $this->factura('F-CAIXA-A', 500, now()->addDays(10)->toDateString());
        $facturaB = $this->factura('F-CAIXA-B', 600, now()->addDays(10)->toDateString());

        FechoCaixa::create([
            'utilizador_id' => $caixa->id, 'data' => now()->toDateString(), 'total_geral' => 0,
            'total_por_metodo' => [], 'valor_contado' => 0, 'diferenca' => 0,
            'numero_pagamentos' => 0, 'fechado_por' => $caixa->id,
        ]);

        $this->post('/pagamentos', [
            'factura_id' => $facturaA->id, 'valor_pago' => 100, 'metodo_pagamento' => 'dinheiro',
        ])->assertRedirect();

        $this->post('/pagamentos/multiplo', [
            'parcelas' => [
                ['factura_id' => $facturaA->id, 'valor_pago' => 100],
                ['factura_id' => $facturaB->id, 'valor_pago' => 100],
            ],
            'metodo_pagamento' => 'dinheiro',
        ])->assertRedirect();

        $this->post('/creditos', [
            'cliente_id' => $this->ana->id, 'valor' => 100, 'metodo_pagamento' => 'dinheiro',
        ])->assertRedirect();

        $this->assertSame(0, Pagamento::count());
        $this->assertSame(0, Credito::count());
        $this->assertSame('pendente', $facturaA->fresh()->estado);
        $this->assertSame('pendente', $facturaB->fresh()->estado);
    }

    public function test_usar_credito_e_guardar_excesso_ao_pagar(): void
    {
        $caixa = $this->utilizador('caixa');
        $f = $this->factura('F-C', 500, now()->addDays(10)->toDateString());
        Credito::create(['cliente_id' => $this->ana->id, 'tipo' => 'entrada', 'valor' => 200, 'metodo_pagamento' => 'dinheiro', 'pago_em' => now()]);

        // usa 200 de crédito + 300 em dinheiro → factura paga; o dinheiro só traz 300
        $this->actingAs($caixa)->post('/pagamentos', [
            'factura_id' => $f->id, 'valor_pago' => 300, 'metodo_pagamento' => 'dinheiro', 'usar_credito' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame('paga', $f->fresh()->estado);
        $this->assertEquals(0, Credito::saldoDe($this->ana->id));
        $this->assertSame(2, Pagamento::count());
        $this->assertSame(1, Pagamento::where('origem_credito', true)->count());

        // o fecho só conta os 300 de dinheiro (o pagamento com crédito não entrou dinheiro)
        $this->get('/pagamentos/fecho-caixa')->assertInertia(fn (Assert $p) => $p->where('totalGeral', 300));

        // excesso sem marcar → recusado; marcado → fica como crédito
        $g = $this->factura('F-D', 100, now()->addDays(10)->toDateString());
        $this->post('/pagamentos', ['factura_id' => $g->id, 'valor_pago' => 150, 'metodo_pagamento' => 'dinheiro'])->assertSessionHasErrors('valor_pago');
        $this->post('/pagamentos', ['factura_id' => $g->id, 'valor_pago' => 150, 'metodo_pagamento' => 'dinheiro', 'guardar_excesso' => true])->assertSessionHasNoErrors();

        $this->assertSame('paga', $g->fresh()->estado);
        $this->assertEquals(50, Credito::saldoDe($this->ana->id));
        $this->get('/pagamentos/fecho-caixa')->assertInertia(fn (Assert $p) => $p->where('totalGeral', 450)); // 300 + 100 + 50 de excesso
    }

    public function test_estornar_o_pagamento_que_gerou_credito_retira_o_credito(): void
    {
        $f = $this->factura('F-E', 100, now()->addDays(10)->toDateString());
        $this->actingAs($this->admin)->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 130, 'metodo_pagamento' => 'banco', 'referencia_pagamento' => 'R1', 'guardar_excesso' => true]);
        $this->assertEquals(30, Credito::saldoDe($this->ana->id));

        $this->delete('/pagamentos/'.Pagamento::first()->id)->assertSessionHas('status');
        $this->assertEquals(0, Credito::saldoDe($this->ana->id));
        $this->assertSame('pendente', $f->fresh()->estado);
    }

    public function test_pagamentos_com_credito_nao_contam_como_electronicos_sem_referencia(): void
    {
        $f = $this->factura('F-F', 100, now()->addDays(10)->toDateString());
        Credito::create(['cliente_id' => $this->ana->id, 'tipo' => 'entrada', 'valor' => 100, 'metodo_pagamento' => 'mpesa', 'pago_em' => now()]);

        $this->actingAs($this->admin)->post('/pagamentos', ['factura_id' => $f->id, 'valor_pago' => 0, 'metodo_pagamento' => 'mpesa', 'usar_credito' => true])
            ->assertSessionHasNoErrors();

        $this->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p->where('controlo.electronicosSemReferencia.quantidade', 0));
    }

    // ------------------------------------------------------------ permissões

    public function test_gestor_ve_os_kpis_sem_os_de_controlo(): void
    {
        $this->actingAs($this->utilizador('gestor'))->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('controlo', null)->where('ehAdministrador', false)->has('perdas')->has('porZona')->has('cobrancaOp'));

        $this->get('/admin/kpis/exportar')->assertOk();

        $this->actingAs($this->utilizador('caixa'))->get('/admin/kpis')->assertForbidden();
        $this->actingAs($this->utilizador('tecnico'))->get('/admin/kpis')->assertForbidden();
    }

    public function test_kpis_de_zona_e_cobranca_para_o_administrador(): void
    {
        $zona = Zona::create(['nome' => 'Sul']);
        $this->ana->update(['zona_id' => $zona->id]);
        $this->factura('F-Z', 400);

        $this->actingAs($this->admin)->get('/admin/kpis')->assertInertia(fn (Assert $p) => $p
            ->where('porZona.0.zona', 'Sul')->where('porZona.0.emAtraso', 400)->where('porZona.0.clientes', 1)
            ->where('cobrancaOp.semContacto15d', 1)
            ->where('credito.saldoTotal', 0)
            ->has('controlo'));
    }
}
