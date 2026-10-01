<?php

namespace App\Support;

use App\Models\EnvioEmail;
use App\Models\ErroSistema;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Estado de saúde da aplicação para o painel do Desenvolvedor: só lê e mede,
 * nunca altera nada (a única escrita é uma chave de cache de teste, de 10s).
 */
class SaudeSistema
{
    /** Chave que o agendador renova a cada minuto (ver routes/console.php). */
    public const PULSO_AGENDADOR = 'sistema:pulso-agendador';

    /** @return array{servicos: array, aplicacao: array, alertas: array} */
    public static function verificar(): array
    {
        $servicos = [
            'base_dados' => self::baseDados(),
            'fila' => self::fila(),
            'agendador' => self::agendador(),
            'cache' => self::cache(),
            'email' => self::email(),
            'armazenamento' => self::armazenamento(),
        ];

        return [
            'servicos' => $servicos,
            'aplicacao' => self::aplicacao(),
            'alertas' => self::alertas($servicos),
        ];
    }

    private static function medir(callable $fn): array
    {
        $inicio = microtime(true);
        try {
            $extra = $fn();

            return ['ok' => true, 'ms' => (int) round((microtime(true) - $inicio) * 1000), ...$extra];
        } catch (\Throwable $e) {
            return ['ok' => false, 'ms' => null, 'erro' => mb_substr($e->getMessage(), 0, 200)];
        }
    }

    private static function baseDados(): array
    {
        return self::medir(function () {
            $driver = DB::getDriverName();
            $versao = match ($driver) {
                'sqlite' => DB::selectOne('select sqlite_version() as v')->v,
                default => DB::selectOne('select version() as v')->v,
            };

            return ['driver' => $driver, 'versao' => (string) $versao, 'base' => DB::getDatabaseName()];
        });
    }

    private static function fila(): array
    {
        return self::medir(function () {
            $ligacao = config('queue.default');
            $falhados = DB::table('failed_jobs')->count();

            if ($ligacao !== 'database') {
                return ['ligacao' => $ligacao, 'pendentes' => null, 'em_curso' => null, 'mais_antigo_min' => null, 'falhados' => $falhados];
            }

            $pendentes = DB::table('jobs')->whereNull('reserved_at')->count();
            $maisAntigo = DB::table('jobs')->whereNull('reserved_at')->min('available_at');

            return [
                'ligacao' => $ligacao,
                'pendentes' => $pendentes,
                'em_curso' => DB::table('jobs')->whereNotNull('reserved_at')->count(),
                'mais_antigo_min' => $maisAntigo ? max(0, (int) floor((time() - (int) $maisAntigo) / 60)) : null,
                'falhados' => $falhados,
            ];
        });
    }

    private static function agendador(): array
    {
        return self::medir(function () {
            $pulso = Cache::get(self::PULSO_AGENDADOR);

            return [
                'ultimo_pulso' => $pulso,
                'ha_min' => $pulso ? max(0, (int) floor((time() - (int) $pulso) / 60)) : null,
            ];
        });
    }

    private static function cache(): array
    {
        return self::medir(function () {
            $valor = bin2hex(random_bytes(4));
            Cache::put('dev:saude:teste', $valor, 10);
            if (Cache::get('dev:saude:teste') !== $valor) {
                throw new \RuntimeException('A cache não devolveu o valor escrito.');
            }
            Cache::forget('dev:saude:teste');

            return ['driver' => config('cache.default')];
        });
    }

    private static function email(): array
    {
        return self::medir(function () {
            $ligacao = GmailOAuth::ligacao();

            return [
                'mailer' => config('mail.default'),
                'gmail_configurado' => GmailOAuth::configurado(),
                'gmail_ligado' => (bool) $ligacao,
                'gmail_conta' => $ligacao['email'] ?? null,
                'falhas_24h' => EnvioEmail::where('estado', 'falhou')->where('created_at', '>=', now()->subDay())->count(),
                'enviados_24h' => EnvioEmail::where('estado', 'enviado')->where('created_at', '>=', now()->subDay())->count(),
            ];
        });
    }

    private static function armazenamento(): array
    {
        return self::medir(function () {
            $caminho = storage_path();
            $livre = @disk_free_space($caminho);
            $total = @disk_total_space($caminho);
            $log = collect(glob(storage_path('logs/*.log')) ?: [])->sum(fn ($f) => filesize($f));

            return [
                'gravavel' => is_writable($caminho),
                'livre_mb' => $livre === false ? null : (int) round($livre / 1048576),
                'total_mb' => $total === false ? null : (int) round($total / 1048576),
                'livre_pct' => $livre && $total ? (int) round($livre / $total * 100) : null,
                'logs_kb' => (int) round($log / 1024),
                'canal_log' => config('logging.default'),
            ];
        });
    }

    private static function aplicacao(): array
    {
        return [
            'nome' => config('app.name'),
            'ambiente' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'laravel' => app()->version(),
            'php' => PHP_VERSION,
            'fuso' => config('app.timezone'),
            'hora_servidor' => now()->toDateTimeString(),
            'manutencao' => app()->isDownForMaintenance(),
            'url' => config('app.url'),
        ];
    }

    /** @return array<int, array{nivel: string, titulo: string, detalhe: string}> */
    private static function alertas(array $s): array
    {
        $alertas = [];
        $producao = app()->environment('production');
        $add = function (string $nivel, string $titulo, string $detalhe) use (&$alertas) {
            $alertas[] = compact('nivel', 'titulo', 'detalhe');
        };

        if (! $s['base_dados']['ok']) {
            $add('alto', 'Base de dados inacessível', $s['base_dados']['erro'] ?? '');

            return $alertas; // sem BD, o resto não é fiável
        }
        if ($producao && config('app.debug')) {
            $add('alto', 'APP_DEBUG ligado em produção', 'Mostra detalhes internos a quem provocar um erro. Ponha APP_DEBUG=false.');
        }
        if ($s['fila']['ok']) {
            if (($s['fila']['falhados'] ?? 0) > 0) {
                $add('medio', 'Jobs falhados', "{$s['fila']['falhados']} job(s) na tabela failed_jobs.");
            }
            if (($s['fila']['mais_antigo_min'] ?? 0) >= 10) {
                $add('alto', 'Fila parada?', "Há jobs à espera há {$s['fila']['mais_antigo_min']} min. O worker (queue:work) pode não estar a correr.");
            }
        }
        if ($producao) {
            $ha = $s['agendador']['ha_min'] ?? null;
            if ($ha === null) {
                $add('alto', 'Agendador sem sinal', 'Nunca recebeu o pulso do agendador: php artisan schedule:run não está a correr. Os lembretes de cobrança não são gerados.');
            } elseif ($ha >= 5) {
                $add('alto', 'Agendador parado', "O último pulso foi há {$ha} min.");
            }
        }
        if ($s['cache']['ok'] === false) {
            $add('alto', 'Cache com falha', $s['cache']['erro'] ?? '');
        }
        if ($s['email']['ok']) {
            if ($producao && $s['email']['mailer'] === 'log') {
                $add('alto', 'Emails só vão para o log', 'MAIL_MAILER=log em produção: nenhum email sai realmente.');
            }
            if ($s['email']['gmail_configurado'] && ! $s['email']['gmail_ligado']) {
                $add('medio', 'Gmail não ligado', 'Em Railway o ficheiro da ligação perde-se a cada deploy: pode ter de voltar a ligar o Gmail.');
            }
            if (($s['email']['falhas_24h'] ?? 0) > 0) {
                $add('medio', 'Emails com falha', "{$s['email']['falhas_24h']} email(s) falharam nas últimas 24 h.");
            }
        }
        if ($s['armazenamento']['ok']) {
            if (($s['armazenamento']['livre_mb'] ?? PHP_INT_MAX) < 500 || ($s['armazenamento']['livre_pct'] ?? 100) < 10) {
                $add('alto', 'Pouco espaço em disco', "{$s['armazenamento']['livre_mb']} MB livres ({$s['armazenamento']['livre_pct']}%).");
            }
            if ($producao && in_array($s['armazenamento']['canal_log'], ['single', 'daily', 'stack'], true)) {
                $add('medio', 'Logs em ficheiro', 'Em Railway o disco do contentor é efémero: os logs perdem-se a cada deploy. Considere LOG_CHANNEL=stderr.');
            }
        }

        $erros = ErroSistema::where('resolvido', false)->where('created_at', '>=', now()->subDay())->count();
        if ($erros > 0) {
            $add('medio', 'Erros por resolver', "{$erros} erro(s) nas últimas 24 h (Logs técnicos).");
        }

        return $alertas;
    }
}
