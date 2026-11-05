<?php

namespace Tests\Feature;

use App\Models\DevAuditoria;
use App\Models\EnvioEmail;
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
        $this->assertTrue(DevAuditoria::where('acao', 'dev.filas.limpar-falhados.resultado')->exists());
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

    public function test_agendamentos_e_historico_reflectem_apenas_tarefas_actuais(): void
    {
        $this->actingAs($this->dev)->get('/dev/operacoes')
            ->assertInertia(fn (Assert $page) => $page->component('Dev/Operacoes')
                ->where('agendamentos', fn ($tasks) => collect($tasks)->every(fn ($task) => $task['nome'] !== 'notificacoes:gerar')));

        $task = Schedule::command('inspire');
        event(new ScheduledTaskFinished($task, 0.25));
        $this->assertDatabaseHas('execucoes_agendadas', ['nome' => 'inspire', 'estado' => 'ok', 'duracao_ms' => 250]);
        $this->assertSame('inspire', Agendador::nome("'php' 'artisan' inspire"));
    }

    public function test_painel_nao_executa_comandos_fora_da_lista_actual(): void
    {
        $this->dev()->post('/dev/operacoes/tarefa', ['tarefa' => 'migrate:fresh', 'confirmacao' => 'EXECUTAR'])
            ->assertSessionHasErrors('tarefa');
        $this->dev()->post('/dev/operacoes/tarefa', ['tarefa' => 'notificacoes:gerar', 'confirmacao' => 'EXECUTAR'])
            ->assertSessionHasErrors('tarefa');
        $this->assertDatabaseMissing('dev_auditoria', ['acao' => 'dev.operacoes.executar-tarefa.resultado']);
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

    public function test_historico_dev_exclui_emails_de_facturas_e_nao_os_reenvia(): void
    {
        $envio = EnvioEmail::create([
            'tipo' => 'factura', 'origem' => 'manual', 'email' => 'cliente@example.test',
            'assunto' => 'Factura', 'estado' => 'falhou', 'erro' => 'timeout', 'corpo' => '<p>privado</p>',
        ]);

        $this->actingAs($this->dev)->get('/dev/emails?estado=falhou')
            ->assertInertia(fn (Assert $page) => $page->where('envios.total', 0)->where('totais.falhados', 0));
        $this->actingAs($this->dev)->get("/dev/emails/{$envio->id}/ver")->assertNotFound();
        $this->actingAs($this->dev)->post("/dev/emails/{$envio->id}/reenviar")->assertNotFound();
        Mail::assertNothingSent();
    }
}
