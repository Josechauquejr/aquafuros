<?php

namespace Tests\Feature;

use App\Models\Cliente;
use App\Models\DevAuditoria;
use App\Models\Tarifa;
use App\Models\User;
use App\Support\LeitorLogs;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fase 2 do painel do Desenvolvedor: explorador de dados (só leitura) e logs. */
class ExploradorDadosTest extends TestCase
{
    use RefreshDatabase;

    private User $dev;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->dev = User::factory()->create(['name' => 'Dev Pessoa']);
        $this->dev->assignRole('desenvolvedor');
    }

    public function test_so_o_desenvolvedor_acede_ao_explorador(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrador');

        $this->actingAs($admin)->get('/dev/dados')->assertForbidden();
        $this->actingAs($admin)->get('/dev/dados/users')->assertForbidden();
        $this->actingAs($admin)->get('/dev/logs/aplicacao')->assertForbidden();
    }

    public function test_lista_as_tabelas_e_as_relacoes(): void
    {
        $this->actingAs($this->dev)->get('/dev/dados')
            ->assertInertia(fn (Assert $p) => $p->component('Dev/Dados')
                ->where('tabelas', fn ($t) => collect($t)->contains('nome', 'clientes') && collect($t)->contains('nome', 'facturas'))
                ->where('relacoes', fn ($r) => collect($r)->contains(fn ($x) => $x['origem'] === 'facturas' && $x['destino'] === 'clientes')));
    }

    public function test_tabela_inexistente_ou_com_nome_malicioso_da_404(): void
    {
        $this->actingAs($this->dev)->get('/dev/dados/tabela_que_nao_existe')->assertNotFound();
        $this->actingAs($this->dev)->get('/dev/dados/'.urlencode('users; drop table users'))->assertNotFound();
        $this->assertDatabaseCount('users', 1);
    }

    public function test_senhas_nunca_saem_nem_na_lista_nem_no_registo(): void
    {
        $hash = $this->dev->password;

        $lista = $this->actingAs($this->dev)->get('/dev/dados/users');
        $lista->assertInertia(fn (Assert $p) => $p->where('linhas.data.0.password', '••••'));
        $this->assertStringNotContainsString($hash, $lista->getContent());

        $registo = $this->actingAs($this->dev)->get('/dev/dados/users/registo/'.$this->dev->id);
        $registo->assertOk();
        $this->assertStringNotContainsString($hash, $registo->getContent());
        $this->assertDatabaseHas('dev_auditoria', ['acao' => 'dev.dados.registo', 'alvo' => 'users#'.$this->dev->id]);
    }

    public function test_pesquisa_nao_serve_de_oraculo_para_colunas_sensiveis(): void
    {
        // Procurar por um pedaço do hash da senha não pode encontrar o utilizador.
        $pedaco = substr($this->dev->password, 10, 12);

        $this->actingAs($this->dev)->get('/dev/dados/users?search='.urlencode($pedaco))
            ->assertInertia(fn (Assert $p) => $p->where('linhas.total', 0));

        // Ordenar por coluna sensível é ignorado (cai na ordem por omissão).
        $this->actingAs($this->dev)->get('/dev/dados/users?sort=password')
            ->assertInertia(fn (Assert $p) => $p->where('filtros.sort', 'id'));
    }

    public function test_pesquisa_e_filtro_por_coluna_funcionam(): void
    {
        $this->actingAs($this->dev)->get('/dev/dados/users?search=dev+pessoa')
            ->assertInertia(fn (Assert $p) => $p->where('linhas.total', 1));

        $this->actingAs($this->dev)->get('/dev/dados/users?col=id&val=999999')
            ->assertInertia(fn (Assert $p) => $p->where('linhas.total', 0));
    }

    public function test_registo_mostra_o_que_depende_dele(): void
    {
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $cliente = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);

        $this->actingAs($this->dev)->get('/dev/dados/tarifas/registo/'.$tarifa->id)
            ->assertInertia(fn (Assert $p) => $p->component('Dev/DadosRegisto')
                ->where('quemAponta', fn ($q) => collect($q)->contains(fn ($x) => $x['tabela'] === 'clientes' && $x['total'] === 1)));

        $this->actingAs($this->dev)->get('/dev/dados/clientes/registo/'.$cliente->id)
            ->assertInertia(fn (Assert $p) => $p->where('paraOnde', fn ($q) => collect($q)->contains(fn ($x) => $x['tabela'] === 'tarifas' && $x['id'] == $tarifa->id)));
    }

    public function test_exportar_pede_senha_e_depois_exporta_sem_colunas_sensiveis_e_audita(): void
    {
        $this->actingAs($this->dev)->get('/dev/dados/users/exportar')->assertRedirect(route('password.confirm'));

        $resposta = $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()])
            ->get('/dev/dados/users/exportar')->assertOk();
        $csv = $resposta->streamedContent();

        $this->assertStringContainsString('Dev Pessoa', $csv);
        $this->assertStringNotContainsString('password', strtolower(explode("\n", $csv)[0]));
        $this->assertStringNotContainsString($this->dev->password, $csv);
        $this->assertTrue(DevAuditoria::where('acao', 'dev.dados.exportar')->where('alvo', 'users')->exists());
    }

    public function test_exportar_neutraliza_formulas(): void
    {
        User::factory()->create(['name' => '=HYPERLINK("http://x")']);

        $csv = $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()])
            ->get('/dev/dados/users/exportar')->streamedContent();

        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_leitor_de_logs_interpreta_filtra_e_mascara(): void
    {
        $ficheiro = storage_path('logs/teste-fase2.log');
        file_put_contents($ficheiro, implode("\n", [
            '[2026-10-01 10:00:00] production.INFO: Arranque normal',
            '[2026-10-01 10:05:00] production.ERROR: Falhou o login password=hunter2 token: abc123456789',
            '#0 /app/Foo.php(12): bar()',
            '#1 {main}',
            '[2026-10-02 08:00:00] production.WARNING: Aviso qualquer',
        ]));

        try {
            $todas = LeitorLogs::entradas('teste-fase2.log', null, null, null)['entradas'];
            $this->assertCount(3, $todas);
            $this->assertSame('warning', $todas[0]['nivel']); // mais recente primeiro

            $erro = LeitorLogs::entradas('teste-fase2.log', 'error', null, null)['entradas'];
            $this->assertCount(1, $erro);
            $this->assertStringContainsString('#1 {main}', $erro[0]['detalhe']);
            $this->assertStringNotContainsString('hunter2', $erro[0]['mensagem']);
            $this->assertStringNotContainsString('abc123456789', $erro[0]['mensagem']);

            $this->assertCount(1, LeitorLogs::entradas('teste-fase2.log', null, '2026-10-02', null)['entradas']);
            $this->assertCount(1, LeitorLogs::entradas('teste-fase2.log', null, null, 'arranque')['entradas']);

            // Nunca lê fora de storage/logs.
            $this->assertSame([], LeitorLogs::entradas('../../.env', null, null, null)['entradas']);

            $this->actingAs($this->dev)->get('/dev/logs/aplicacao?ficheiro=teste-fase2.log&nivel=error')
                ->assertInertia(fn (Assert $p) => $p->component('Dev/LogsAplicacao')->where('entradas.total', 1));
        } finally {
            @unlink($ficheiro);
        }
    }
}
