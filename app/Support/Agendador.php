<?php

namespace App\Support;

use Illuminate\Console\Events\ScheduledTaskFailed;
use Illuminate\Console\Events\ScheduledTaskFinished;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Tarefas agendadas: lista, última execução (guardada por ouvintes) e o que o painel pode correr à mão. */
class Agendador
{
    /** Só estas tarefas se podem correr à mão pelo painel (lista fechada). */
    public const EXECUTAVEIS = [
        'notificacoes:gerar' => 'Gera e ENVIA os lembretes de vencimento e avisos de atraso aos clientes (emails reais).',
    ];

    /** O pulso corre todos os minutos e tem a sua própria chave de cache: não se regista aqui. */
    private const IGNORADAS = ['pulso-agendador'];

    /** "php artisan notificacoes:gerar" (ou o nome de uma tarefa de função) → "notificacoes:gerar". */
    public static function nome(?string $comando, ?string $descricao = null): string
    {
        $comando = str_replace(["'", '"'], '', (string) $comando);

        return str_contains($comando, 'artisan') ? trim(Str::after($comando, 'artisan')) : (string) ($descricao ?: $comando);
    }

    public static function registarExecucao(ScheduledTaskFinished|ScheduledTaskFailed $evento): void
    {
        try {
            $nome = self::nome($evento->task->command, $evento->task->description);
            if ($nome === '' || in_array($nome, self::IGNORADAS, true)) {
                return;
            }

            DB::table('execucoes_agendadas')->upsert([[
                'nome' => $nome,
                'executada_em' => now(),
                'estado' => $evento instanceof ScheduledTaskFailed ? 'falhou' : 'ok',
                'duracao_ms' => $evento instanceof ScheduledTaskFinished ? (int) round($evento->runtime * 1000) : null,
                'erro' => $evento instanceof ScheduledTaskFailed ? mb_substr(LeitorLogs::mascarar($evento->exception->getMessage()), 0, 300) : null,
            ]], ['nome'], ['executada_em', 'estado', 'duracao_ms', 'erro']);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** @return array<int, array{nome: string, expressao: string, proxima: ?string, executavel: bool, descricao: ?string, ultima: ?array}> */
    public static function listar(): array
    {
        Artisan::call('schedule:list', ['--json' => true]);
        $tarefas = json_decode(Artisan::output(), true) ?: [];
        $ultimas = DB::table('execucoes_agendadas')->get()->keyBy('nome');

        return collect($tarefas)->map(function ($t) use ($ultimas) {
            $nome = self::nome($t['command'] ?? null, $t['description'] ?? null);
            $ultima = $ultimas->get($nome);

            return [
                'nome' => $nome,
                'expressao' => $t['expression'],
                'proxima' => $t['next_due_date'] ?? null,
                'executavel' => isset(self::EXECUTAVEIS[$nome]),
                'descricao' => self::EXECUTAVEIS[$nome] ?? null,
                'ultima' => $ultima ? ['em' => $ultima->executada_em, 'estado' => $ultima->estado, 'duracao_ms' => $ultima->duracao_ms, 'erro' => $ultima->erro] : null,
            ];
        })->values()->all();
    }
}
