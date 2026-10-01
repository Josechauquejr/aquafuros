<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Support\LeitorLogs;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

/** Visualizador dos logs da aplicação (ficheiros em storage/logs) — só leitura. */
class LogAplicacaoController extends Controller
{
    private const POR_PAGINA = 40;

    public function index(Request $request)
    {
        $ficheiros = LeitorLogs::ficheiros();
        $ficheiro = $request->query('ficheiro');
        $ficheiro = collect($ficheiros)->contains('nome', $ficheiro) ? $ficheiro : ($ficheiros[0]['nome'] ?? null);
        $nivel = in_array($request->query('nivel'), LeitorLogs::NIVEIS, true) ? $request->query('nivel') : null;
        $data = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('data')) ? $request->query('data') : null;
        $search = trim((string) $request->query('search', ''));

        $resultado = $ficheiro ? LeitorLogs::entradas($ficheiro, $nivel, $data, $search) : ['entradas' => [], 'truncado' => false];
        $pagina = max(1, (int) $request->query('page', 1));
        $total = count($resultado['entradas']);

        return Inertia::render('Dev/LogsAplicacao', [
            'aba' => 'aplicacao',
            'ficheiros' => $ficheiros,
            'entradas' => new LengthAwarePaginator(
                array_slice($resultado['entradas'], ($pagina - 1) * self::POR_PAGINA, self::POR_PAGINA),
                $total,
                self::POR_PAGINA,
                $pagina,
                ['path' => $request->url(), 'query' => $request->query()],
            ),
            'truncado' => $resultado['truncado'],
            'canalLog' => config('logging.default'),
            'niveis' => LeitorLogs::NIVEIS,
            'filtros' => ['ficheiro' => $ficheiro, 'nivel' => $nivel, 'data' => $data, 'search' => $search],
        ]);
    }
}
