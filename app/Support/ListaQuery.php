<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Parâmetros comuns das listas (período e ordenação por cabeçalho) lidos da
 * query string, sempre contra uma whitelist — para que as 4 tabelas
 * (Clientes, Leituras, Facturas, Pagamentos) se comportem da mesma forma.
 */
class ListaQuery
{
    private const PERIODOS = ['hoje', 'semana', 'mes', 'todos', 'personalizado'];

    /**
     * Aplica `?sort=coluna&dir=asc|desc`.
     *
     * @param  array<string, callable(Builder, string): mixed>  $colunas  chave pública => aplica a ordenação
     * @return array{0: string, 1: string} coluna e direcção efectivas
     */
    public static function ordenar(
        Builder $query,
        Request $request,
        array $colunas,
        string $colunaPadrao,
        string $dirPadrao = 'desc',
    ): array {
        $sort = $request->query('sort');

        if (is_string($sort) && isset($colunas[$sort])) {
            $dir = $request->query('dir') === 'asc' ? 'asc' : 'desc';
        } else {
            $sort = $colunaPadrao;
            $dir = $dirPadrao;
        }

        $colunas[$sort]($query, $dir);

        return [$sort, $dir];
    }

    /**
     * Aplica `?periodo=...&data_inicio=...&data_fim=...` sobre uma coluna de data.
     *
     * @return array{periodo: string, data_inicio: ?string, data_fim: ?string}
     */
    public static function periodo(Builder $query, Request $request, string $coluna, string $padrao = 'todos'): array
    {
        $periodo = $request->query('periodo', $padrao);
        if (! in_array($periodo, self::PERIODOS, true)) {
            $periodo = $padrao;
        }

        $dataInicio = $request->query('data_inicio');
        $dataFim = $request->query('data_fim');

        if ($periodo !== 'todos') {
            $intervalo = ResolvedorPeriodo::resolver($periodo, $dataInicio, $dataFim);
            $query->whereBetween($coluna, [$intervalo['inicio'], $intervalo['fim']]);
        }

        return [
            'periodo' => $periodo,
            'data_inicio' => $periodo === 'personalizado' ? $dataInicio : null,
            'data_fim' => $periodo === 'personalizado' ? $dataFim : null,
        ];
    }
}
