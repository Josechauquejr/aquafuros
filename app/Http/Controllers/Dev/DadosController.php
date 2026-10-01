<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevAuditoria;
use App\Support\ExploradorDados;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Explorador da base de dados do Desenvolvedor — SÓ LEITURA. Nada aqui
 * escreve: nomes de tabelas e colunas vêm sempre validados contra o esquema,
 * os valores vão por parâmetros, e as colunas sensíveis nunca saem (nem
 * mostradas, nem pesquisáveis, nem exportadas).
 */
class DadosController extends Controller
{
    private const POR_PAGINA = 25;

    private const LIMITE_EXPORTACAO = 5000;

    public function index()
    {
        $tabelas = collect(ExploradorDados::tabelas())->map(function ($t) {
            try {
                $registos = DB::table($t['name'])->count();
            } catch (\Throwable) {
                $registos = null;
            }

            return [
                'nome' => $t['name'],
                'registos' => $registos,
                'colunas' => count(ExploradorDados::colunas($t['name'])),
                'tamanho_kb' => $t['size'] ? (int) round($t['size'] / 1024) : null,
                'sensivel' => collect(ExploradorDados::colunas($t['name']))->contains('sensivel', true),
            ];
        })->values();

        return Inertia::render('Dev/Dados', [
            'tabelas' => $tabelas,
            'relacoes' => ExploradorDados::relacoes(),
        ]);
    }

    public function tabela(Request $request, string $tabela)
    {
        $this->validarTabela($tabela);

        $colunas = ExploradorDados::colunas($tabela);
        $visiveis = ExploradorDados::colunasVisiveis($tabela);
        $pk = ExploradorDados::chavePrimaria($tabela);
        [$query, $filtros] = $this->consulta($request, $tabela);

        $ordem = in_array($request->query('sort'), $visiveis, true) ? $request->query('sort') : ($pk && in_array($pk, $visiveis, true) ? $pk : $visiveis[0] ?? null);
        $dir = $request->query('dir') === 'asc' ? 'asc' : 'desc';
        if ($ordem) {
            $query->orderBy($ordem, $dir);
        }

        $linhas = $query->paginate(self::POR_PAGINA)->withQueryString()
            ->through(fn ($linha) => collect((array) $linha)->map(fn ($v, $c) => ExploradorDados::valor($tabela, $c, $v))->all());

        return Inertia::render('Dev/DadosTabela', [
            'tabela' => $tabela,
            'colunas' => $colunas,
            'pk' => $pk,
            'estrangeiras' => collect(ExploradorDados::chavesEstrangeiras($tabela))->mapWithKeys(fn ($fk) => [$fk['coluna'] => $fk['tabela']]),
            'linhas' => $linhas,
            'filtros' => [...$filtros, 'sort' => $ordem, 'dir' => $dir],
            'limiteExportacao' => self::LIMITE_EXPORTACAO,
        ]);
    }

    public function registo(Request $request, string $tabela, string $id)
    {
        $this->validarTabela($tabela);
        $pk = ExploradorDados::chavePrimaria($tabela);
        abort_if($pk === null, 404);

        $linha = DB::table($tabela)->where($pk, $id)->first();
        abort_if($linha === null, 404);

        DevAuditoria::registar('dev.dados.registo', "{$tabela}#{$id}");

        $campos = collect(ExploradorDados::colunas($tabela))->map(fn ($c) => [
            'nome' => $c['name'],
            'tipo' => $c['type'],
            'sensivel' => $c['sensivel'],
            'valor' => ExploradorDados::valor($tabela, $c['name'], $linha->{$c['name']}, completo: true),
        ])->values();

        // Para onde aponta (chaves estrangeiras desta tabela).
        $paraOnde = collect(ExploradorDados::chavesEstrangeiras($tabela))
            ->filter(fn ($fk) => $linha->{$fk['coluna']} !== null && ExploradorDados::chavePrimaria($fk['tabela']) === $fk['destino'])
            ->map(fn ($fk) => ['coluna' => $fk['coluna'], 'tabela' => $fk['tabela'], 'id' => $linha->{$fk['coluna']}])->values();

        // Quem aponta para ele (outras tabelas com chave estrangeira para esta).
        $quemAponta = collect(ExploradorDados::relacoes())
            ->where('destino', $tabela)
            ->map(function ($r) use ($linha) {
                $valor = $linha->{$r['chave']} ?? null;

                return [
                    'tabela' => $r['origem'],
                    'coluna' => $r['coluna'],
                    'valor' => $valor,
                    'total' => $valor === null ? 0 : DB::table($r['origem'])->where($r['coluna'], $valor)->count(),
                ];
            })->filter(fn ($r) => $r['total'] > 0)->values();

        return Inertia::render('Dev/DadosRegisto', [
            'tabela' => $tabela,
            'id' => $id,
            'campos' => $campos,
            'paraOnde' => $paraOnde,
            'quemAponta' => $quemAponta,
            'podeEditar' => config('developer.escrita') && \App\Support\EdicaoDados::editavel($tabela),
        ]);
    }

    /** CSV da tabela (com os filtros actuais): sem colunas sensíveis, com limite de linhas. */
    public function exportar(Request $request, string $tabela)
    {
        $this->validarTabela($tabela);

        $colunas = ExploradorDados::colunasVisiveis($tabela);
        abort_if($colunas === [], 404);
        [$query, $filtros] = $this->consulta($request, $tabela);

        DevAuditoria::registar('dev.dados.exportar', $tabela, ['filtros' => array_filter($filtros), 'limite' => self::LIMITE_EXPORTACAO]);

        $pk = ExploradorDados::chavePrimaria($tabela);
        if ($pk && in_array($pk, $colunas, true)) {
            $query->orderBy($pk);
        }

        return response()->streamDownload(function () use ($query, $colunas) {
            $saida = fopen('php://output', 'w');
            fwrite($saida, "\xEF\xBB\xBF"); // BOM: o Excel abre em UTF-8
            fputcsv($saida, $colunas, ';');
            foreach ($query->select($colunas)->limit(self::LIMITE_EXPORTACAO)->cursor() as $linha) {
                fputcsv($saida, array_map(fn ($v) => $this->celulaCsv($v), array_values((array) $linha)), ';');
            }
            fclose($saida);
        }, "{$tabela}-".now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function validarTabela(string $tabela): void
    {
        abort_unless(ExploradorDados::existe($tabela), 404);
    }

    /** Evita "injecção de fórmulas" ao abrir o CSV no Excel (células que começam por = + - @). */
    private function celulaCsv(mixed $valor): mixed
    {
        return is_string($valor) && $valor !== '' && str_contains('=+-@', $valor[0]) ? "'".$valor : $valor;
    }

    /** @return array{0: \Illuminate\Database\Query\Builder, 1: array{search: string, coluna: ?string, valor: ?string}} */
    private function consulta(Request $request, string $tabela): array
    {
        $query = DB::table($tabela);
        $search = trim((string) $request->query('search', ''));
        $coluna = $request->query('col');
        $valor = $request->query('val');
        $visiveis = ExploradorDados::colunasVisiveis($tabela);

        if (is_string($coluna) && in_array($coluna, $visiveis, true) && is_scalar($valor)) {
            $query->where($coluna, $valor);
        } else {
            $coluna = $valor = null;
        }

        if ($search !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($search)).'%';
            $gramatica = $query->getGrammar();
            $query->where(function ($q) use ($tabela, $gramatica, $like) {
                foreach (ExploradorDados::colunasPesquisaveis($tabela) as $c) {
                    $q->orWhereRaw('lower(cast('.$gramatica->wrap($c).' as text)) like ? escape \'\\\'', [$like]);
                }
            });
        }

        return [$query, ['search' => $search, 'coluna' => $coluna, 'valor' => is_scalar($valor) ? (string) $valor : null]];
    }
}
