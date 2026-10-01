<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Análise dos dados e da base de dados para o painel do Desenvolvedor (SÓ
 * LEITURA): qualidade (campos em branco), crescimento ao longo do tempo,
 * índices em falta e pedidos lentos. Nada daqui altera a base de dados.
 */
class AnaliseDados
{
    private const TABELAS_NEGOCIO = ['clientes', 'leituras', 'facturas', 'pagamentos', 'creditos', 'envios_email', 'notificacoes', 'contactos_cobranca', 'ocorrencias', 'users'];

    private const TABELAS_CRESCIMENTO = ['clientes', 'leituras', 'facturas', 'pagamentos', 'envios_email', 'notificacoes', 'acessos_sistema', 'erros_sistema', 'activity_log'];

    /** Colunas em branco por natureza: não são sinal de má qualidade. */
    private const IGNORAR_NULOS = ['deleted_at', 'remember_token', 'email_verified_at', 'updated_at', 'novidade_vista', 'motivo_anulacao', 'anulada_por', 'anulada_em', 'confirmado_por', 'confirmado_em', 'erro', 'enviada_em'];

    /** Campos em branco por tabela, só nas colunas que aceitam nulos e só onde há. */
    public static function qualidade(): array
    {
        $resultado = [];

        foreach (self::TABELAS_NEGOCIO as $tabela) {
            if (! ExploradorDados::existe($tabela)) {
                continue;
            }
            $colunas = collect(ExploradorDados::colunas($tabela))
                ->filter(fn ($c) => $c['nullable'] && ! $c['sensivel'] && ! in_array($c['name'], self::IGNORAR_NULOS, true))
                ->pluck('name')->values();
            $base = DB::table($tabela);
            $soft = Schema::hasColumn($tabela, 'deleted_at');
            if ($soft) {
                $base->whereNull('deleted_at');
            }
            $total = (clone $base)->count();
            if ($total === 0 || $colunas->isEmpty()) {
                continue;
            }

            $gram = $base->getGrammar();
            $selecao = $colunas->map(fn ($c, $i) => 'count('.$gram->wrap($c).') as c'.$i)->implode(', ');
            $linha = (array) (clone $base)->selectRaw($selecao)->first();

            $campos = $colunas->map(fn ($c, $i) => ['coluna' => $c, 'nulos' => $total - (int) $linha['c'.$i], 'pct' => round(($total - (int) $linha['c'.$i]) / $total * 100, 1)])
                ->filter(fn ($c) => $c['nulos'] > 0)->sortByDesc('pct')->values()->all();

            $resultado[] = ['tabela' => $tabela, 'registos' => $total, 'campos' => $campos, 'activos' => $soft];
        }

        return $resultado;
    }

    /** Registos criados por mês (últimos 12) nas tabelas principais. */
    public static function crescimento(): array
    {
        $meses = collect(range(11, 0))->map(fn ($i) => now()->startOfMonth()->subMonths($i)->format('Y-m'))->all();
        $expr = DB::getDriverName() === 'pgsql' ? "to_char(created_at, 'YYYY-MM')" : "strftime('%Y-%m', created_at)";
        $desde = now()->startOfMonth()->subMonths(11);

        $tabelas = [];
        foreach (self::TABELAS_CRESCIMENTO as $tabela) {
            if (! ExploradorDados::existe($tabela) || ! Schema::hasColumn($tabela, 'created_at')) {
                continue;
            }
            $porMes = DB::table($tabela)->where('created_at', '>=', $desde)->selectRaw("{$expr} as periodo, count(*) as total")->groupByRaw($expr)->pluck('total', 'periodo');

            $tabelas[] = [
                'tabela' => $tabela,
                'total' => DB::table($tabela)->count(),
                'meses' => collect($meses)->map(fn ($m) => (int) ($porMes[$m] ?? 0))->all(),
            ];
        }

        return ['meses' => $meses, 'tabelas' => $tabelas];
    }

    /**
     * Índices em falta: (1) colunas de chave estrangeira sem índice (o
     * PostgreSQL não as indexa sozinho e as junções/filtros ficam lentas);
     * (2) colunas muito filtradas, por heurística, em tabelas já com volume.
     */
    public static function indices(): array
    {
        $heuristica = ['estado', 'data_vencimento', 'created_at', 'mes', 'ano', 'confirmado'];
        $sugestoes = [];

        foreach (ExploradorDados::tabelas() as $t) {
            $tabela = $t['name'];
            $indexadas = collect(Schema::getIndexes($tabela))->map(fn ($i) => $i['columns'][0] ?? null)->filter()->all();
            $registos = (int) DB::table($tabela)->count();
            $colunas = collect(ExploradorDados::colunas($tabela))->pluck('name')->all();

            foreach (ExploradorDados::chavesEstrangeiras($tabela) as $fk) {
                if (! in_array($fk['coluna'], $indexadas, true)) {
                    $sugestoes[] = self::sugestao($tabela, $fk['coluna'], 'chave estrangeira', $registos, "aponta para {$fk['tabela']}");
                }
            }
            if ($registos >= 500) {
                foreach ($heuristica as $c) {
                    if (in_array($c, $colunas, true) && ! in_array($c, $indexadas, true)) {
                        $sugestoes[] = self::sugestao($tabela, $c, 'coluna muito filtrada (heurística)', $registos, null);
                    }
                }
            }
        }

        // As que mais registos têm primeiro: é onde a falta de índice dói.
        usort($sugestoes, fn ($a, $b) => $b['registos'] <=> $a['registos']);

        return ['sugestoes' => $sugestoes, 'motor' => DB::getDriverName()];
    }

    private static function sugestao(string $tabela, string $coluna, string $motivo, int $registos, ?string $nota): array
    {
        return [
            'tabela' => $tabela, 'coluna' => $coluna, 'motivo' => $motivo, 'registos' => $registos, 'nota' => $nota,
            'sql' => "CREATE INDEX CONCURRENTLY idx_{$tabela}_{$coluna} ON {$tabela} ({$coluna});",
        ];
    }

    /** Rotas mais lentas (últimos 7 dias) a partir dos acessos registados, e as consultas mais pesadas se o PostgreSQL as medir. */
    public static function lentidao(): array
    {
        $acessos = DB::table('acessos_sistema')->where('created_at', '>=', now()->subDays(7))->whereNotNull('duracao_ms')
            ->orderByDesc('id')->limit(20000)->get(['url', 'metodo', 'duracao_ms', 'tempo_bd_ms']);

        $rotas = $acessos->groupBy(fn ($a) => $a->metodo.' '.self::normalizar($a->url))->map(function ($grupo, $rota) {
            $duracoes = $grupo->pluck('duracao_ms')->sort()->values();

            return [
                'rota' => $rota,
                'pedidos' => $grupo->count(),
                'media_ms' => (int) round($grupo->avg('duracao_ms')),
                'p95_ms' => (int) $duracoes[(int) floor(($duracoes->count() - 1) * 0.95)],
                'max_ms' => (int) $duracoes->max(),
                'bd_media_ms' => (int) round($grupo->avg('tempo_bd_ms')),
            ];
        })->filter(fn ($r) => $r['pedidos'] >= 3)->sortByDesc('p95_ms')->take(15)->values()->all();

        return ['rotas' => $rotas, 'amostra' => $acessos->count(), 'consultas' => self::consultasPesadas()];
    }

    /** "/facturas/123?mes=9" → "/facturas/{id}" (sem query string, ids genéricos). */
    private static function normalizar(string $url): string
    {
        $caminho = parse_url($url, PHP_URL_PATH) ?: '/';

        return preg_replace('#/\d+(?=/|$)#', '/{id}', $caminho);
    }

    /** @return array{disponivel: bool, motivo: ?string, consultas: array} */
    private static function consultasPesadas(): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            return ['disponivel' => false, 'motivo' => 'Só disponível em PostgreSQL.', 'consultas' => []];
        }

        try {
            if (! DB::selectOne("select 1 as ok from pg_extension where extname = 'pg_stat_statements'")) {
                return ['disponivel' => false, 'motivo' => 'A extensão pg_stat_statements não está activa nesta base de dados. Sem ela só se vêem os pedidos lentos por rota.', 'consultas' => []];
            }

            $linhas = DB::select('select query, calls, round(mean_exec_time::numeric, 1) as media_ms, round(total_exec_time::numeric, 0) as total_ms from pg_stat_statements where dbid = (select oid from pg_database where datname = current_database()) order by mean_exec_time desc limit 10');

            return ['disponivel' => true, 'motivo' => null, 'consultas' => array_map(fn ($l) => [
                'consulta' => LeitorLogs::mascarar(mb_substr(preg_replace('/\s+/', ' ', $l->query), 0, 400)),
                'chamadas' => (int) $l->calls, 'media_ms' => (float) $l->media_ms, 'total_ms' => (float) $l->total_ms,
            ], $linhas)];
        } catch (\Throwable $e) {
            return ['disponivel' => false, 'motivo' => 'Não foi possível ler pg_stat_statements: '.mb_substr($e->getMessage(), 0, 120), 'consultas' => []];
        }
    }
}
