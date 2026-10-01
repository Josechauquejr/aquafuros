<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Support\AnaliseDados;
use App\Support\VerificacoesIntegridade;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Integridade e análise dos dados: só leitura, nada é corrigido automaticamente. */
class IntegridadeController extends Controller
{
    public function index()
    {
        return Inertia::render('Dev/Integridade', ['verificacoes' => VerificacoesIntegridade::resumo()]);
    }

    public function detalhe(string $chave)
    {
        $dados = VerificacoesIntegridade::detalhe($chave);
        abort_if($dados === null, 404);

        return Inertia::render('Dev/IntegridadeDetalhe', $dados);
    }

    /** Cada separador só calcula o seu conteúdo (as análises são pesadas). */
    public function analise(Request $request)
    {
        $aba = in_array($request->query('aba'), ['qualidade', 'crescimento', 'indices', 'lentidao'], true) ? $request->query('aba') : 'qualidade';

        return Inertia::render('Dev/Analise', [
            'aba' => $aba,
            'dados' => match ($aba) {
                'qualidade' => AnaliseDados::qualidade(),
                'crescimento' => AnaliseDados::crescimento(),
                'indices' => AnaliseDados::indices(),
                'lentidao' => AnaliseDados::lentidao(),
            },
        ]);
    }
}
