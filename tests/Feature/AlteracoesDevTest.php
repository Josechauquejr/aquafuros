<?php

namespace Tests\Feature;

use App\Models\AcessoSistema;
use App\Models\Cliente;
use App\Models\DevAuditoria;
use App\Models\DevSnapshot;
use App\Models\ErroSistema;
use App\Models\Tarifa;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Activitylog\Models\Activity;
use Tests\TestCase;

/** Fase 5 do painel do Desenvolvedor: alterações de dados (desligadas por defeito, com snapshot e auditoria). */
class AlteracoesDevTest extends TestCase
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

    /** O desenvolvedor com a senha confirmada há pouco. */
    private function dev(): static
    {
        return $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()]);
    }

    private function ligar(): void
    {
        config(['developer.escrita' => true]);
    }

    private function cliente(string $numero = 'CLI-1', ?string $email = 'ana@exemplo.co.mz'): Cliente
    {
        return Cliente::create(['numero_cliente' => $numero, 'nome' => 'Ana '.$numero, 'email' => $email, 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo']);
    }

    private function dadosEdicao(Cliente $c, array $extra = []): array
    {
        return [...['nome' => $c->nome, 'endereco' => '', 'telefone' => '', 'email' => $c->email, 'zona_id' => '', 'tarifa_id' => $this->tarifa->id, 'estado' => 'ativo', 'confirmacao' => 'ALTERAR'], ...$extra];
    }

    public function test_desligadas_por_defeito_o_servidor_recusa_tudo(): void
    {
        $c = $this->cliente();

        $this->assertFalse(config('developer.escrita'));
        $this->dev()->get("/dev/editar/clientes/{$c->id}")->assertRedirect(route('dev.alteracoes'));
        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Hackeado']))->assertSessionHas('error');
        // Só a pré-visualização (que apenas lê) funciona com as alterações desligadas; executar e desfazer não.
        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'limpar_acessos', 'parametros' => ['dias' => 90]])->assertSessionHas('previa');
        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_acessos', 'parametros' => ['dias' => 90], 'marca' => session('previa.marca'), 'confirmacao' => 'ALTERAR'])->assertSessionHas('error');

        $this->assertSame('Ana CLI-1', $c->fresh()->nome);
        $this->dev()->get('/dev/alteracoes')->assertInertia(fn (Assert $p) => $p->where('activa', false)->where('palavra', 'ALTERAR'));
    }

    public function test_so_o_desenvolvedor_acede(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrador');
        $this->ligar();

        $this->actingAs($admin)->get('/dev/alteracoes')->assertForbidden();
        $this->actingAs($admin)->put('/dev/editar/clientes/1', [])->assertForbidden();
        $this->actingAs($admin)->post('/dev/alteracoes/previa', [])->assertForbidden();
    }

    public function test_editar_pede_senha_e_a_palavra_e_valida_como_a_aplicacao(): void
    {
        $this->ligar();
        $c = $this->cliente();

        $this->actingAs($this->dev)->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Novo']))->assertRedirect(route('password.confirm'));

        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Novo', 'confirmacao' => 'errada']))->assertSessionHasErrors('confirmacao');
        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Novo', 'telefone' => '123']))->assertSessionHasErrors('telefone');
        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Novo', 'estado' => 'apagado']))->assertSessionHasErrors('estado');
        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Novo', 'email' => 'nao-e-email']))->assertSessionHasErrors('email');
        $this->assertSame('Ana CLI-1', $c->fresh()->nome);
    }

    public function test_editar_grava_pelo_modelo_com_snapshot_e_auditoria_e_pode_desfazer(): void
    {
        $this->ligar();
        $c = $this->cliente();

        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Ana Nova', 'telefone' => '84 000 0000']))
            ->assertRedirect(route('dev.dados.registo', ['clientes', $c->id]));

        $c->refresh();
        $this->assertSame('Ana Nova', $c->nome);
        $this->assertNotNull($c->telefone);

        // Passou pelo modelo: o registo de actividade da aplicação também o viu.
        $this->assertTrue(Activity::where('log_name', 'cliente')->where('subject_id', $c->id)->where('event', 'updated')->exists());

        $snapshot = DevSnapshot::firstOrFail();
        $this->assertSame('Ana CLI-1', $snapshot->linhas[0]['antes']['nome']);
        $this->assertSame('Ana Nova', $snapshot->linhas[0]['depois']['nome']);
        $auditoria = DevAuditoria::where('acao', 'dev.editar.resultado')->firstOrFail();
        $this->assertSame('Ana Nova', $auditoria->detalhes['depois']['nome']);

        $this->dev()->post("/dev/alteracoes/{$snapshot->id}/desfazer", ['confirmacao' => 'ALTERAR'])->assertSessionHas('status');
        $this->assertSame('Ana CLI-1', $c->fresh()->nome);
        $this->dev()->post("/dev/alteracoes/{$snapshot->id}/desfazer", ['confirmacao' => 'ALTERAR'])->assertSessionHas('error'); // já desfeita
    }

    public function test_nao_se_desfaz_se_o_registo_mudou_depois(): void
    {
        $this->ligar();
        $c = $this->cliente();
        $this->dev()->put("/dev/editar/clientes/{$c->id}", $this->dadosEdicao($c, ['nome' => 'Ana Nova']));
        $c->update(['nome' => 'Alterado por outra pessoa']);

        $this->dev()->post('/dev/alteracoes/'.DevSnapshot::firstOrFail()->id.'/desfazer', ['confirmacao' => 'ALTERAR'])->assertSessionHas('error');
        $this->assertSame('Alterado por outra pessoa', $c->fresh()->nome);
    }

    public function test_tabelas_fora_da_lista_nao_se_editam(): void
    {
        $this->ligar();

        $this->dev()->get('/dev/editar/facturas/1')->assertNotFound();
        $this->dev()->put('/dev/editar/users/'.$this->dev->id, ['name' => 'x', 'confirmacao' => 'ALTERAR'])->assertNotFound();
    }

    public function test_em_massa_mostra_a_previa_e_so_executa_o_mesmo_conjunto(): void
    {
        $this->ligar();
        $mau = $this->cliente('CLI-1', 'isto-nao-e-email');
        $bom = $this->cliente('CLI-2', 'bom@exemplo.co.mz');

        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'limpar_emails_invalidos', 'parametros' => []])->assertSessionHas('previa');
        $previa = session('previa');
        $this->assertSame(1, $previa['total']);
        $this->assertSame($mau->id, $previa['amostra'][0]['id']);
        $this->assertSame('isto-nao-e-email', $mau->fresh()->email); // a prévia não altera nada

        // Marca errada, ou palavra errada: nada acontece.
        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_emails_invalidos', 'parametros' => [], 'marca' => str_repeat('a', 40), 'confirmacao' => 'ALTERAR'])->assertSessionHasErrors('marca');
        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_emails_invalidos', 'parametros' => [], 'marca' => $previa['marca'], 'confirmacao' => 'x'])->assertSessionHasErrors('confirmacao');
        $this->assertSame('isto-nao-e-email', $mau->fresh()->email);

        // Entretanto os dados mudaram: outro cliente fica com email mau → a marca já não serve.
        $bom->update(['email' => 'tambem-mau']);
        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_emails_invalidos', 'parametros' => [], 'marca' => $previa['marca'], 'confirmacao' => 'ALTERAR'])->assertSessionHasErrors('marca');
        $this->assertSame('isto-nao-e-email', $mau->fresh()->email);
    }

    public function test_em_massa_executa_com_snapshot_e_desfaz(): void
    {
        $this->ligar();
        $mau = $this->cliente('CLI-1', 'isto-nao-e-email');
        $bom = $this->cliente('CLI-2', 'bom@exemplo.co.mz');

        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'limpar_emails_invalidos', 'parametros' => []]);
        $marca = session('previa.marca');

        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_emails_invalidos', 'parametros' => [], 'marca' => $marca, 'confirmacao' => 'ALTERAR'])->assertSessionHas('status');
        $this->assertNull($mau->fresh()->email);
        $this->assertSame('bom@exemplo.co.mz', $bom->fresh()->email); // só o suspeito foi tocado

        $snapshot = DevSnapshot::where('acao', 'limpar_emails_invalidos')->firstOrFail();
        $this->assertSame(1, $snapshot->total);
        $this->assertTrue(DevAuditoria::where('acao', 'dev.massa.limpar_emails_invalidos.resultado')->exists());

        $this->dev()->post("/dev/alteracoes/{$snapshot->id}/desfazer", ['confirmacao' => 'ALTERAR'])->assertSessionHas('status');
        $this->assertSame('isto-nao-e-email', $mau->fresh()->email);
    }

    public function test_limpar_acessos_respeita_o_minimo_de_dias_e_so_apaga_os_antigos(): void
    {
        $this->ligar();
        foreach ([200, 100, 10] as $dias) {
            DB::table('acessos_sistema')->insert(['user_id' => $this->dev->id, 'url' => 'http://x/a', 'metodo' => 'GET', 'created_at' => now()->subDays($dias)]);
        }

        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'limpar_acessos', 'parametros' => ['dias' => 5]])->assertSessionHasErrors('parametros.dias');
        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'inventada', 'parametros' => []])->assertNotFound();

        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'limpar_acessos', 'parametros' => ['dias' => 90]]);
        $this->assertSame(2, session('previa.total'));
        $antigos = fn () => AcessoSistema::where('created_at', '<', now()->subDays(90))->count();
        $this->assertSame(2, $antigos());

        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'limpar_acessos', 'parametros' => ['dias' => 90], 'marca' => session('previa.marca'), 'confirmacao' => 'ALTERAR'])->assertSessionHas('status');
        $this->assertSame(0, $antigos());
        $this->assertTrue(AcessoSistema::where('created_at', '<', now()->subDays(30))->doesntExist() && AcessoSistema::where('created_at', '<', now()->subDays(5))->exists()); // o de há 10 dias ficou

        $snapshot = DevSnapshot::where('acao', 'limpar_acessos')->firstOrFail();
        $this->assertFalse($snapshot->reversivel);
        $this->dev()->post("/dev/alteracoes/{$snapshot->id}/desfazer", ['confirmacao' => 'ALTERAR'])->assertSessionHas('error');
    }

    public function test_resolver_erros_e_reversivel(): void
    {
        $this->ligar();
        $erro = ErroSistema::create(['mensagem' => 'boom', 'excepcao' => 'X', 'created_at' => now()->subDays(30)]);
        DB::table('erros_sistema')->where('id', $erro->id)->update(['created_at' => now()->subDays(30)]);

        $this->dev()->post('/dev/alteracoes/previa', ['operacao' => 'resolver_erros', 'parametros' => ['dias' => 7]]);
        $this->assertSame(1, session('previa.total'));
        $this->dev()->post('/dev/alteracoes/executar', ['operacao' => 'resolver_erros', 'parametros' => ['dias' => 7], 'marca' => session('previa.marca'), 'confirmacao' => 'ALTERAR']);
        $this->assertTrue($erro->fresh()->resolvido);

        $this->dev()->post('/dev/alteracoes/'.DevSnapshot::firstOrFail()->id.'/desfazer', ['confirmacao' => 'ALTERAR']);
        $this->assertFalse($erro->fresh()->resolvido);
    }

    public function test_snapshots_e_auditoria_nao_se_apagam(): void
    {
        DevSnapshot::create(['acao' => 'x', 'tabela' => 'clientes', 'total' => 0]);

        $this->expectException(\LogicException::class);
        DevSnapshot::firstOrFail()->delete();
    }
}
