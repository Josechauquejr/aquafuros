<?php

namespace Tests\Feature;

use App\Mail\FacturaMail;
use App\Models\Cliente;
use App\Models\EnvioEmail;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Tarifa;
use App\Models\User;
use App\Support\Agendador;
use Database\Seeders\RoleSeeder;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fase 3 do painel do Desenvolvedor: filas, agendamentos, cache, manutenção e emails. */
class OperacoesDevTest extends TestCase
{
    use RefreshDatabase;

    private User $dev;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->seed(RoleSeeder::class);
        $this->dev = User::factory()->create();
        $this->dev->assignRole('desenvolvedor');
    }

    /** Já confirmou a senha nos últimos minutos. */
    private function dev(): static
    {
        return $this->actingAs($this->dev)->withSession(['auth.password_confirmed_at' => time()]);
    }

    private function jobFalhado(string $uuid = 'abc-123'): void
    {
        DB::table('failed_jobs')->insert([
            'uuid' => $uuid, 'connection' => 'database', 'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\Exemplo', 'data' => ['segredo' => 'NAO-MOSTRAR']]),
            'exception' => "RuntimeException: falhou password=hunter2\n#0 trace...", 'failed_at' => now(),
        ]);
    }

    private function jobPendente(bool $reservado = false): int
    {
        return DB::table('jobs')->insertGetId([
            'queue' => 'default', 'payload' => json_encode(['displayName' => 'App\\Jobs\\Pendente', 'data' => ['segredo' => 'NAO-MOSTRAR']]),
            'attempts' => 0, 'reserved_at' => $reservado ? time() : null, 'available_at' => time(), 'created_at' => time(),
        ]);
    }

    public function test_so_o_desenvolvedor_acede(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrador');

        foreach (['/dev/filas', '/dev/operacoes', '/dev/emails'] as $url) {
            $this->actingAs($admin)->get($url)->assertForbidden();
            $this->actingAs($this->dev)->get($url)->assertOk();
        }
    }

    public function test_filas_mostram_o_nome_do_job_mas_nunca_o_conteudo(): void
    {
        $this->jobFalhado();
        $this->jobPendente();

        $falhados = $this->actingAs($this->dev)->get('/dev/filas?aba=falhados');
        $falhados->assertInertia(fn (Assert $p) => $p->where('falhados.data.0.job', 'App\\Jobs\\Exemplo'));
        $this->assertStringNotContainsString('NAO-MOSTRAR', $falhados->getContent());
        $this->assertStringNotContainsString('hunter2', $falhados->getContent());

        $pendentes = $this->actingAs($this->dev)->get('/dev/filas');
        $pendentes->assertInertia(fn (Assert $p) => $p->where('pendentes.data.0.job', 'App\\Jobs\\Pendente')->where('totais.pendentes', 1));
        $this->assertStringNotContainsString('NAO-MOSTRAR', $pendentes->getContent());
    }

    public function test_repetir_e_apagar_um_job_falhado_pedem_a_senha(): void
    {
        $this->jobFalhado();

        $this->actingAs($this->dev)->post('/dev/filas/falhados/abc-123/repetir')->assertRedirect(route('password.confirm'));
        $this->assertDatabaseCount('failed_jobs', 1);

        $this->dev()->post('/dev/filas/falhados/abc-123/repetir')->assertSessionHas('status');
        $this->assertDatabaseCount('failed_jobs', 0);
        $this->assertDatabaseCount('jobs', 1);
    }

    public function test_apagar_todos_os_falhados_exige_a_palavra_escrita(): void
    {
        $this->jobFalhado('a');
        $this->jobFalhado('b');

        $this->dev()->delete('/dev/filas/falhados')->assertSessionHasErrors('confirmacao');
        $this->dev()->delete('/dev/filas/falhados', ['confirmacao' => 'limpar'])->assertSessionHasErrors('confirmacao'); // maiúsculas
        $this->assertDatabaseCount('failed_jobs', 2);

        $this->dev()->delete('/dev/filas/falhados', ['confirmacao' => 'LIMPAR'])->assertSessionHas('status');
        $this->assertDatabaseCount('failed_jobs', 0);
        $this->assertTrue(\App\Models\DevAuditoria::where('acao', 'dev.filas.limpar-falhados.resultado')->exists());
    }

    public function test_limpar_pendentes_nao_toca_nos_que_estao_em_curso(): void
    {
        $this->jobPendente();
        $emCurso = $this->jobPendente(reservado: true);

        $this->dev()->delete('/dev/filas/pendentes', ['confirmacao' => 'LIMPAR']);
        $this->assertDatabaseCount('jobs', 1);
        $this->assertDatabaseHas('jobs', ['id' => $emCurso]);

        $this->dev()->delete('/dev/filas/pendentes/'.$emCurso)->assertSessionHas('error');
        $this->assertDatabaseCount('jobs', 1);
    }

    public function test_agendamentos_listam_as_tarefas_e_a_ultima_execucao(): void
    {
        $this->actingAs($this->dev)->get('/dev/operacoes')
            ->assertInertia(fn (Assert $p) => $p->component('Dev/Operacoes')
                ->where('agendamentos', fn ($a) => collect($a)->contains(fn ($t) => $t['nome'] === 'notificacoes:gerar' && $t['executavel'] === true)));

        $tarefa = Schedule::command('emails:estado');
        event(new ScheduledTaskFinished($tarefa, 0.25));
        $this->assertDatabaseHas('execucoes_agendadas', ['nome' => 'emails:estado', 'estado' => 'ok', 'duracao_ms' => 250]);
        $this->assertSame('notificacoes:gerar', Agendador::nome("'php' 'artisan' notificacoes:gerar"));
    }

    public function test_so_se_executam_tarefas_da_lista_fechada_e_com_a_palavra(): void
    {
        $this->dev()->post('/dev/operacoes/tarefa', ['tarefa' => 'migrate:fresh', 'confirmacao' => 'EXECUTAR'])->assertSessionHasErrors('tarefa');
        $this->dev()->post('/dev/operacoes/tarefa', ['tarefa' => 'notificacoes:gerar'])->assertSessionHasErrors('confirmacao');

        $this->dev()->post('/dev/operacoes/tarefa', ['tarefa' => 'notificacoes:gerar', 'confirmacao' => 'EXECUTAR'])
            ->assertSessionHasNoErrors();
        $this->assertTrue(\App\Models\DevAuditoria::where('acao', 'dev.operacoes.executar-tarefa.resultado')->exists());
    }

    public function test_cache_valida_o_tipo_e_exige_a_palavra_so_na_da_aplicacao(): void
    {
        $this->dev()->post('/dev/operacoes/cache', ['tipo' => 'tudo'])->assertSessionHasErrors('tipo');

        \Cache::put('chave-teste', 'valor', 600);
        $this->dev()->post('/dev/operacoes/cache', ['tipo' => 'aplicacao'])->assertSessionHasErrors('confirmacao');
        $this->assertSame('valor', \Cache::get('chave-teste'));

        $this->dev()->post('/dev/operacoes/cache', ['tipo' => 'aplicacao', 'confirmacao' => 'LIMPAR'])->assertSessionHas('status');
        $this->assertNull(\Cache::get('chave-teste'));

        $this->dev()->post('/dev/operacoes/cache', ['tipo' => 'vistas'])->assertSessionHas('status');
    }

    public function test_manutencao_exige_a_palavra_e_deixa_o_dev_com_o_cookie_de_acesso(): void
    {
        $this->dev()->post('/dev/operacoes/manutencao')->assertSessionHasErrors('confirmacao');
        $this->assertFalse(app()->isDownForMaintenance());

        try {
            $resposta = $this->dev()->post('/dev/operacoes/manutencao', ['confirmacao' => 'MANUTENCAO']);
            $resposta->assertRedirect(route('dev.operacoes'));
            $resposta->assertCookie('laravel_maintenance');
            $this->assertTrue(app()->isDownForMaintenance());
        } finally {
            Artisan::call('up');
        }
        $this->assertFalse(app()->isDownForMaintenance());
    }

    public function test_ambiente_nunca_mostra_valores_de_segredos(): void
    {
        $resposta = $this->actingAs($this->dev)->get('/dev/operacoes');

        $resposta->assertInertia(fn (Assert $p) => $p->where('ambiente', fn ($a) => collect($a)->every(fn ($i) => ! ($i['segredo'] ?? false) || in_array($i['valor'], ['definido', 'NÃO definido'], true))));
        $this->assertStringNotContainsString((string) config('app.key'), $resposta->getContent());
    }

    private function facturaComEmail(): Factura
    {
        $tarifa = Tarifa::create(['nome' => 'Doméstica']);
        $cliente = Cliente::create(['numero_cliente' => 'CLI-1', 'nome' => 'Ana', 'email' => 'ana@exemplo.co.mz', 'tarifa_id' => $tarifa->id, 'estado' => 'ativo']);
        $leitura = Leitura::create(['cliente_id' => $cliente->id, 'mes' => 9, 'ano' => 2026, 'leitura_anterior' => 0, 'leitura_actual' => 10, 'confirmado' => true, 'registado_por' => $this->dev->id]);

        return \App\Support\Facturacao::emitir($leitura, $this->dev->id);
    }

    public function test_reenviar_factura_cria_um_novo_registo_manual(): void
    {
        $factura = $this->facturaComEmail();
        $envio = EnvioEmail::create(['factura_id' => $factura->id, 'cliente_id' => $factura->cliente_id, 'tipo' => 'factura', 'origem' => 'automatico', 'email' => 'ana@exemplo.co.mz', 'assunto' => 'x', 'estado' => 'falhou', 'erro' => 'timeout']);

        $this->actingAs($this->dev)->post("/dev/emails/{$envio->id}/reenviar")->assertRedirect(route('password.confirm'));
        Mail::assertNothingSent();

        $this->dev()->post("/dev/emails/{$envio->id}/reenviar")->assertSessionHas('status');
        Mail::assertSent(FacturaMail::class, fn ($m) => $m->hasTo('ana@exemplo.co.mz'));
        $this->assertDatabaseHas('envios_email', ['factura_id' => $factura->id, 'estado' => 'enviado', 'origem' => 'manual', 'enviado_por' => $this->dev->id]);
    }

    public function test_emails_de_cobranca_nao_se_reenviam_por_aqui(): void
    {
        $factura = $this->facturaComEmail();
        $envio = EnvioEmail::create(['factura_id' => $factura->id, 'cliente_id' => $factura->cliente_id, 'tipo' => 'cobranca', 'origem' => 'manual', 'email' => 'ana@exemplo.co.mz', 'assunto' => 'x', 'estado' => 'enviado']);

        $this->dev()->post("/dev/emails/{$envio->id}/reenviar")->assertSessionHas('error');
        Mail::assertNothingSent();
    }

    public function test_lista_e_vista_isolada_do_email(): void
    {
        $factura = $this->facturaComEmail();
        $envio = EnvioEmail::create(['cliente_id' => $factura->cliente_id, 'tipo' => 'factura', 'origem' => 'manual', 'email' => 'a@b.co', 'assunto' => 'Assunto', 'estado' => 'falhou', 'erro' => 'x', 'corpo' => '<p>Olá</p>']);

        $this->actingAs($this->dev)->get('/dev/emails?estado=falhou')
            ->assertInertia(fn (Assert $p) => $p->where('envios.total', 1)->where('totais.falhados', 1));

        $this->actingAs($this->dev)->get("/dev/emails/{$envio->id}/ver")
            ->assertOk()->assertSee('Olá', false)
            ->assertHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
    }
}
