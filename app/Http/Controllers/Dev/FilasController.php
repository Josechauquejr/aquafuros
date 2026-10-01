<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevAuditoria;
use App\Support\ConfirmacaoReforcada;
use App\Support\LeitorLogs;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Filas e jobs do Desenvolvedor. A fila "database" só guarda o que está
 * pendente e o que falhou (os concluídos desaparecem), por isso é isso que se
 * mostra. O conteúdo (payload) dos jobs nunca sai: só o nome da classe.
 */
class FilasController extends Controller
{
    public function index(Request $request)
    {
        $aba = $request->query('aba') === 'falhados' ? 'falhados' : 'pendentes';
        $ligacao = config('queue.default');

        $pendentes = DB::table('jobs')->orderBy('id')->paginate(20, ['*'], 'pagina')->withQueryString()
            ->through(fn ($j) => [
                'id' => $j->id,
                'fila' => $j->queue,
                'job' => $this->nomeDoJob($j->payload),
                'tentativas' => $j->attempts,
                'em_curso' => $j->reserved_at !== null,
                'disponivel_em' => date('Y-m-d H:i:s', $j->available_at),
                'criado_em' => date('Y-m-d H:i:s', $j->created_at),
            ]);

        $falhados = DB::table('failed_jobs')->orderByDesc('id')->paginate(20, ['*'], 'pagina')->withQueryString()
            ->through(fn ($j) => [
                'id' => $j->id,
                'uuid' => $j->uuid,
                'fila' => $j->queue,
                'job' => $this->nomeDoJob($j->payload),
                'falhou_em' => $j->failed_at,
                'erro' => LeitorLogs::mascarar(Str::limit(strtok($j->exception, "\n") ?: '', 300)),
            ]);

        return Inertia::render('Dev/Filas', [
            'aba' => $aba,
            'ligacao' => $ligacao,
            'trabalhador' => $ligacao === 'database' ? null : 'A ligação da fila não é "database": estes ecrãs só mostram a fila na base de dados.',
            'totais' => [
                'pendentes' => DB::table('jobs')->whereNull('reserved_at')->count(),
                'em_curso' => DB::table('jobs')->whereNotNull('reserved_at')->count(),
                'falhados' => DB::table('failed_jobs')->count(),
            ],
            'pendentes' => $aba === 'pendentes' ? $pendentes : null,
            'falhados' => $aba === 'falhados' ? $falhados : null,
        ]);
    }

    public function repetir(string $uuid)
    {
        abort_unless(DB::table('failed_jobs')->where('uuid', $uuid)->exists(), 404);
        Artisan::call('queue:retry', ['id' => [$uuid]]);

        return back()->with('status', 'Job devolvido à fila.');
    }

    public function repetirTodos()
    {
        $total = DB::table('failed_jobs')->count();
        Artisan::call('queue:retry', ['id' => ['all']]);
        DevAuditoria::registar('dev.filas.repetir-todos.resultado', null, ['jobs' => $total]);

        return back()->with('status', "{$total} job(s) falhado(s) devolvido(s) à fila.");
    }

    public function esquecer(string $uuid)
    {
        abort_unless(DB::table('failed_jobs')->where('uuid', $uuid)->exists(), 404);
        Artisan::call('queue:forget', ['id' => $uuid]);

        return back()->with('status', 'Job falhado apagado.');
    }

    public function limparFalhados(Request $request)
    {
        ConfirmacaoReforcada::exigir($request, 'LIMPAR');
        $total = DB::table('failed_jobs')->count();
        Artisan::call('queue:flush');
        DevAuditoria::registar('dev.filas.limpar-falhados.resultado', null, ['apagados' => $total]);

        return back()->with('status', "{$total} job(s) falhado(s) apagado(s).");
    }

    /** Apaga um job pendente que ainda não foi pegado por nenhum worker. */
    public function apagarPendente(int $id)
    {
        $apagados = DB::table('jobs')->where('id', $id)->whereNull('reserved_at')->delete();

        return back()->with($apagados ? 'status' : 'error', $apagados ? 'Job pendente apagado.' : 'Esse job já não está pendente (pode estar em curso).');
    }

    public function limparPendentes(Request $request)
    {
        ConfirmacaoReforcada::exigir($request, 'LIMPAR');
        $total = DB::table('jobs')->whereNull('reserved_at')->delete();
        DevAuditoria::registar('dev.filas.limpar-pendentes.resultado', null, ['apagados' => $total]);

        return back()->with('status', "{$total} job(s) pendente(s) apagado(s). Os que estão em curso não foram tocados.");
    }

    private function nomeDoJob(string $payload): string
    {
        return (string) (json_decode($payload, true)['displayName'] ?? 'desconhecido');
    }
}
