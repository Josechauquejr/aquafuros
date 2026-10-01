<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevSnapshot;
use App\Support\ConfirmacaoReforcada;
use App\Support\EdicaoDados;
use App\Support\OperacoesMassa;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Operações que ALTERAM dados, do Desenvolvedor. Só funcionam com
 * DEV_ESCRITA=true (barreira no servidor), pedem a senha e uma palavra
 * escrita, deixam snapshot e auditoria, e as em massa mostram primeiro o
 * que vão afectar.
 */
class AlteracoesController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Dev/Alteracoes', [
            'activa' => (bool) config('developer.escrita'),
            'producao' => app()->isProduction(),
            'palavra' => EdicaoDados::palavra(),
            'operacoes' => collect(OperacoesMassa::todas())->map(fn ($o, $chave) => [...$o, 'chave' => $chave])->values(),
            'previa' => $request->session()->get('previa'),
            'historico' => DevSnapshot::with('user:id,name')->orderByDesc('id')->limit(30)->get()
                ->map(fn ($s) => [
                    'id' => $s->id, 'acao' => $s->acao, 'tabela' => $s->tabela, 'total' => $s->total, 'reversivel' => $s->reversivel,
                    'por' => $s->user?->name, 'em' => $s->created_at, 'desfeita_em' => $s->desfeita_em,
                    'resumo' => $s->resumo,
                ]),
        ]);
    }

    /** Mostra o que a operação vai afectar. Não altera nada. */
    public function previa(Request $request)
    {
        $chave = (string) $request->input('operacao');
        $parametros = OperacoesMassa::parametros($chave, (array) $request->input('parametros', []));

        return redirect()->route('dev.alteracoes')->with('previa', OperacoesMassa::previa($chave, $parametros));
    }

    public function executar(Request $request)
    {
        $chave = (string) $request->input('operacao');
        $parametros = OperacoesMassa::parametros($chave, (array) $request->input('parametros', []));
        $request->validate(['marca' => 'required|string|size:40']);
        ConfirmacaoReforcada::exigir($request, EdicaoDados::palavra());

        $r = OperacoesMassa::executar($chave, $parametros, $request->input('marca'), $request->user()->id);

        return redirect()->route('dev.alteracoes')->with('status', $r['mensagem']);
    }

    public function desfazer(Request $request, DevSnapshot $snapshot)
    {
        ConfirmacaoReforcada::exigir($request, EdicaoDados::palavra());
        $r = EdicaoDados::desfazer($snapshot, $request->user()->id);

        return back()->with($r['ok'] ? 'status' : 'error', $r['mensagem']);
    }
}
