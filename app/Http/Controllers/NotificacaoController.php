<?php

namespace App\Http\Controllers;

use App\Models\Notificacao;
use App\Support\Mensagens;
use App\Support\Notificacoes;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Fila de mensagens aos clientes: ver, gerar, abrir no WhatsApp e marcar como enviadas. */
class NotificacaoController extends Controller
{
    public function index(Request $request)
    {
        $estado = $request->query('estado', 'pendente');
        $estado = in_array($estado, ['pendente', 'enviada', 'falhou', 'todas'], true) ? $estado : 'pendente';

        $query = Notificacao::with(['cliente', 'factura'])->orderByDesc('id');
        if ($estado !== 'todas') {
            $query->where('estado', $estado);
        }

        $pagina = $query->paginate(20)->withQueryString();
        $pagina->getCollection()->each(fn (Notificacao $n) => $n->whatsapp = Mensagens::whatsappUrl($n->telefone, $n->mensagem));

        return Inertia::render('Notificacoes/Index', [
            'notificacoes' => $pagina,
            'contagens' => [
                'pendente' => Notificacao::where('estado', 'pendente')->count(),
                'enviada' => Notificacao::where('estado', 'enviada')->count(),
                'falhou' => Notificacao::where('estado', 'falhou')->count(),
            ],
            'driver' => config('notificacoes.driver'),
            'filtros' => ['estado' => $estado],
        ]);
    }

    public function gerar()
    {
        $criadas = Notificacoes::gerar();
        $enviadas = Notificacoes::enviarPendentes();

        return back()->with('status', $criadas === 0
            ? 'Não há mensagens novas para gerar hoje.'
            : "{$criadas} mensagem(ns) gerada(s)".($enviadas ? " e {$enviadas} enviada(s)." : '.'));
    }

    public function marcarEnviada(Notificacao $notificacao)
    {
        $notificacao->update(['estado' => 'enviada', 'enviada_em' => now(), 'erro' => null]);

        return back();
    }

    public function destroy(Notificacao $notificacao)
    {
        $notificacao->delete();

        return back()->with('status', 'Mensagem descartada.');
    }
}
