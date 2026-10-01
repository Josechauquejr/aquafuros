<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use App\Support\Facturacao;
use App\Support\VerificacoesIntegridade;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fase 4 do painel do Desenvolvedor: integridade e análise dos dados (só leitura). */
class IntegridadeDevTest extends TestCase
{
    use RefreshDatabase;

    private User $dev;

    private Tarifa $tarifa;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->dev = User::factory()->create();
        $this->dev->assignRole('desenvolvedor');
        $this->tarifa = Tarifa::create(['nome' => 'Doméstica']);
    }

    private function totais(): array
    {
        return collect(VerificacoesIntegridade::resumo())->pluck('total', 'chave')->all();
    }

    private function facturaNormal(string $numero = 'CLI-1', int $mes = 9): Factura
    {
        $cliente = Cliente::create(['numero_cliente' => $numero, 'nome' => 'Ana '.$numero, 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo']);
        $leitura = Leitura::create(['cliente_id' => $cliente->id, 'mes' => $mes, 'ano' => 2026, 'leitura_anterior' => 0, 'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->dev->id]);

        return Facturacao::emitir($leitura, $this->dev->id);
    }

    public function test_so_o_desenvolvedor_acede(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrador');

        foreach (['/dev/integridade', '/dev/integridade/leituras_duplicadas', '/dev/analise'] as $url) {
            $this->actingAs($admin)->get($url)->assertForbidden();
            $this->actingAs($this->dev)->get($url)->assertOk();
        }
    }

    public function test_dados_saudaveis_passam_todas_as_verificacoes(): void
    {
        $this->facturaNormal();

        $this->assertSame([], array_filter($this->totais(), fn ($t) => $t !== 0));
        foreach (VerificacoesIntegridade::resumo() as $v) {
            $this->assertNull($v['erro'], "{$v['chave']}: {$v['erro']}");
        }
    }

    public function test_detecta_facturas_incoerentes(): void
    {
        $f = $this->facturaNormal();

        DB::table('facturas')->where('id', $f->id)->update(['total_pagar' => 9999]);
        $this->assertSame(1, $this->totais()['facturas_total_nao_bate']);

        DB::table('facturas')->where('id', $f->id)->update(['total_pagar' => $f->total_pagar, 'estado' => 'paga']);
        $this->assertSame(1, $this->totais()['facturas_paga_sem_pagamento']);

        DB::table('facturas')->where('id', $f->id)->update(['estado' => 'parcial']);
        $this->assertSame(1, $this->totais()['facturas_parcial_incoerente']);

        DB::table('facturas')->where('id', $f->id)->update(['total_pagar' => -5]);
        $this->assertSame(1, $this->totais()['facturas_total_negativo']);
    }

    public function test_detecta_leituras_invalidas_e_utilizadores_sem_papel(): void
    {
        $f = $this->facturaNormal();
        DB::table('leituras')->where('id', $f->leitura_id)->update(['leitura_actual' => -1]);
        $this->assertSame(1, $this->totais()['leituras_invalidas']);

        // Leituras duplicadas já não se conseguem criar (restrição única na base de dados); a verificação é rede de segurança.
        $this->assertSame(0, $this->totais()['leituras_duplicadas']);

        User::factory()->create(); // sem papel
        $this->assertSame(1, $this->totais()['utilizadores_sem_papel']);
    }

    public function test_detalhe_lista_os_registos_com_resumo_e_limite(): void
    {
        $f = $this->facturaNormal();
        DB::table('facturas')->where('id', $f->id)->update(['total_pagar' => 9999]);

        $this->actingAs($this->dev)->get('/dev/integridade/facturas_total_nao_bate')
            ->assertInertia(fn (Assert $p) => $p->component('Dev/IntegridadeDetalhe')
                ->where('total', 1)
                ->where('verificacao.tabela', 'facturas')
                ->where('registos.0.id', $f->id)
                ->where('registos.0.resumo', fn ($r) => str_contains($r, $f->numero_factura)));

        $this->actingAs($this->dev)->get('/dev/integridade/nao_existe')->assertNotFound();
    }

    public function test_o_resumo_nunca_altera_dados(): void
    {
        $f = $this->facturaNormal();
        DB::table('facturas')->where('id', $f->id)->update(['total_pagar' => 9999]);
        $antes = DB::table('facturas')->get()->toJson();

        $this->actingAs($this->dev)->get('/dev/integridade')->assertOk();
        $this->actingAs($this->dev)->get('/dev/integridade/facturas_total_nao_bate')->assertOk();

        $this->assertSame($antes, DB::table('facturas')->get()->toJson());
    }

    public function test_cada_separador_da_analise_responde(): void
    {
        $this->facturaNormal();

        $this->actingAs($this->dev)->get('/dev/analise?aba=qualidade')
            ->assertInertia(fn (Assert $p) => $p->component('Dev/Analise')->where('aba', 'qualidade')
                ->where('dados', fn ($d) => collect($d)->contains('tabela', 'clientes')));

        $this->actingAs($this->dev)->get('/dev/analise?aba=crescimento')
            ->assertInertia(fn (Assert $p) => $p->where('dados.meses', fn ($m) => count($m) === 12)
                ->where('dados.tabelas', fn ($t) => collect($t)->firstWhere('tabela', 'facturas')['total'] === 1));

        $this->actingAs($this->dev)->get('/dev/analise?aba=indices')
            ->assertInertia(fn (Assert $p) => $p->has('dados.sugestoes'));

        $this->actingAs($this->dev)->get('/dev/analise?aba=lentidao')
            ->assertInertia(fn (Assert $p) => $p->has('dados.rotas')->has('dados.consultas'));

        // Separador desconhecido cai no primeiro.
        $this->actingAs($this->dev)->get('/dev/analise?aba=hack')->assertInertia(fn (Assert $p) => $p->where('aba', 'qualidade'));
    }
}
