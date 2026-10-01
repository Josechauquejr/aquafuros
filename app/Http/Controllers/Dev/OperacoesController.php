<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevAuditoria;
use App\Support\Agendador;
use App\Support\ConfirmacaoReforcada;
use App\Support\LeitorLogs;
use Illuminate\Foundation\Http\MaintenanceModeBypassCookie;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Operações do sistema para o Desenvolvedor: agendamentos (ver e correr à mão
 * uma lista fechada), cache (limpar por tipo), modo de manutenção e o
 * ambiente (só leitura, com segredos sempre mascarados).
 */
class OperacoesController extends Controller
{
    /** @var array<string, array{comando: string, rotulo: string, aviso: string, palavra: ?string}> */
    private const CACHES = [
        'aplicacao' => ['comando' => 'cache:clear', 'rotulo' => 'Cache da aplicação', 'aviso' => 'Apaga tudo o que está na cache: limites de tentativas de login, o token de acesso do Gmail (volta a pedir-se sozinho) e o pulso do agendador (volta no minuto seguinte).', 'palavra' => 'LIMPAR'],
        'vistas' => ['comando' => 'view:clear', 'rotulo' => 'Vistas compiladas', 'aviso' => 'Apaga as vistas Blade compiladas; são recompiladas ao serem precisas.', 'palavra' => null],
        'configuracao' => ['comando' => 'config:clear', 'rotulo' => 'Configuração em cache', 'aviso' => 'Remove a cache da configuração (se existir). A aplicação passa a ler as variáveis de ambiente directamente.', 'palavra' => null],
        'rotas' => ['comando' => 'route:clear', 'rotulo' => 'Rotas em cache', 'aviso' => 'Remove a cache das rotas (se existir).', 'palavra' => null],
    ];

    public function index(Request $request)
    {
        return Inertia::render('Dev/Operacoes', [
            'agendamentos' => Agendador::listar(),
            'caches' => collect(self::CACHES)->map(fn ($c, $chave) => ['chave' => $chave, 'rotulo' => $c['rotulo'], 'aviso' => $c['aviso'], 'palavra' => $c['palavra']])->values(),
            'manutencao' => [
                'activa' => app()->isDownForMaintenance(),
                // Mostrado uma única vez, logo a seguir a ligar.
                'ligacao' => $request->session()->pull('manutencao_ligacao'),
            ],
            'ambiente' => $this->ambiente(),
        ]);
    }

    /** Corre à mão uma tarefa agendada — só as da lista fechada, e depois de escrever EXECUTAR. */
    public function executarTarefa(Request $request)
    {
        $data = $request->validate(['tarefa' => ['required', Rule::in(array_keys(Agendador::EXECUTAVEIS))]]);
        ConfirmacaoReforcada::exigir($request, 'EXECUTAR');

        $codigo = Artisan::call($data['tarefa']);
        $saida = LeitorLogs::mascarar(Str::limit(trim(Artisan::output()), 500));
        DevAuditoria::registar('dev.operacoes.executar-tarefa.resultado', $data['tarefa'], ['codigo' => $codigo, 'saida' => $saida]);

        return back()->with($codigo === 0 ? 'status' : 'error', $codigo === 0 ? "Tarefa {$data['tarefa']} executada. {$saida}" : "A tarefa {$data['tarefa']} terminou com erro (código {$codigo}). {$saida}");
    }

    public function limparCache(Request $request)
    {
        $data = $request->validate(['tipo' => ['required', Rule::in(array_keys(self::CACHES))]]);
        $cache = self::CACHES[$data['tipo']];

        if ($cache['palavra']) {
            ConfirmacaoReforcada::exigir($request, $cache['palavra']);
        }
        Artisan::call($cache['comando']);

        return back()->with('status', "{$cache['rotulo']}: limpa.");
    }

    /**
     * Liga o modo de manutenção com um segredo: o Desenvolvedor fica com o
     * cookie de acesso (não se tranca a si próprio) e recebe a ligação de
     * acesso uma única vez, para outros dispositivos.
     */
    public function ligarManutencao(Request $request)
    {
        ConfirmacaoReforcada::exigir($request, 'MANUTENCAO');

        if (app()->isDownForMaintenance()) {
            return back()->with('error', 'O modo de manutenção já está ligado.');
        }

        $segredo = Str::random(32);
        Artisan::call('down', ['--secret' => $segredo, '--retry' => 60]);

        return redirect()->route('dev.operacoes')
            ->withCookie(MaintenanceModeBypassCookie::create($segredo))
            ->with('manutencao_ligacao', url('/'.$segredo))
            ->with('status', 'Modo de manutenção ligado: os outros utilizadores vêem a página de manutenção.');
    }

    public function desligarManutencao()
    {
        Artisan::call('up');

        return back()->with('status', 'Modo de manutenção desligado.');
    }

    /** Variáveis relevantes. Nunca valores de segredos: só se estão definidos. */
    private function ambiente(): array
    {
        $definido = fn ($v) => filled($v) ? 'definido' : 'NÃO definido';
        $ligacao = config('database.default');
        $bd = config("database.connections.{$ligacao}");

        return [
            ['grupo' => 'Aplicação', 'chave' => 'APP_ENV', 'valor' => app()->environment()],
            ['grupo' => 'Aplicação', 'chave' => 'APP_DEBUG', 'valor' => config('app.debug') ? 'true' : 'false'],
            ['grupo' => 'Aplicação', 'chave' => 'APP_URL', 'valor' => config('app.url')],
            ['grupo' => 'Aplicação', 'chave' => 'APP_KEY', 'valor' => $definido(config('app.key')), 'segredo' => true],
            ['grupo' => 'Aplicação', 'chave' => 'Fuso horário', 'valor' => config('app.timezone')],
            ['grupo' => 'Base de dados', 'chave' => 'DB_CONNECTION', 'valor' => $ligacao],
            ['grupo' => 'Base de dados', 'chave' => 'Servidor', 'valor' => ($bd['host'] ?? '—').(isset($bd['port']) ? ':'.$bd['port'] : '')],
            ['grupo' => 'Base de dados', 'chave' => 'Base', 'valor' => $bd['database'] ?? '—'],
            ['grupo' => 'Base de dados', 'chave' => 'Utilizador', 'valor' => $definido($bd['username'] ?? null), 'segredo' => true],
            ['grupo' => 'Base de dados', 'chave' => 'Palavra-passe', 'valor' => $definido($bd['password'] ?? null), 'segredo' => true],
            ['grupo' => 'Sistema', 'chave' => 'QUEUE_CONNECTION', 'valor' => config('queue.default')],
            ['grupo' => 'Sistema', 'chave' => 'CACHE_STORE', 'valor' => config('cache.default')],
            ['grupo' => 'Sistema', 'chave' => 'SESSION_DRIVER', 'valor' => config('session.driver')],
            ['grupo' => 'Sistema', 'chave' => 'SESSION_LIFETIME', 'valor' => config('session.lifetime').' min'],
            ['grupo' => 'Sistema', 'chave' => 'LOG_CHANNEL', 'valor' => config('logging.default')],
            ['grupo' => 'Sistema', 'chave' => 'LOG_LEVEL', 'valor' => (string) config('logging.channels.'.config('logging.default').'.level', '—')],
            ['grupo' => 'Email', 'chave' => 'MAIL_MAILER', 'valor' => config('mail.default')],
            ['grupo' => 'Email', 'chave' => 'MAIL_FROM_ADDRESS', 'valor' => config('mail.from.address')],
            ['grupo' => 'Email', 'chave' => 'GOOGLE_CLIENT_ID', 'valor' => $definido(config('services.google.client_id')), 'segredo' => true],
            ['grupo' => 'Email', 'chave' => 'GOOGLE_CLIENT_SECRET', 'valor' => $definido(config('services.google.client_secret')), 'segredo' => true],
        ];
    }
}
