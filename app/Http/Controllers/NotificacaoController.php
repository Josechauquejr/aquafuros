<?php

namespace App\Http\Controllers;

use App\Mail\CobrancaMail;
use App\Models\Notificacao;
use App\Support\Notificacoes;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Emails de cobrança aos clientes: ver a fila, gerar, enviar ou reenviar e descartar. */
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
        $pagina->getCollection()->each(function (Notificacao $n) {
            $n->dias_atraso = $n->factura ? CobrancaMail::diasDeAtraso($n->factura) : null;
        });

        return Inertia::render('Notificacoes/Index', [
            'notificacoes' => $pagina,
            'contagens' => [
                'pendente' => Notificacao::where('estado', 'pendente')->count(),
                'enviada' => Notificacao::where('estado', 'enviada')->count(),
                'falhou' => Notificacao::where('estado', 'falhou')->count(),
            ],
            'automatico' => Notificacoes::automaticas(),
            'filtros' => ['estado' => $estado],
        ]);
    }

    /** Gera os emails devidos hoje e envia-os já. */
    public function gerar(Request $request)
    {
        $criadas = Notificacoes::gerar();
        $enviadas = Notificacoes::enviarPendentes('manual', $request->user()->id);

        return back()->with('status', $criadas === 0 && $enviadas === 0
            ? 'Não há emails de cobrança para enviar hoje.'
            : "{$criadas} email(s) gerado(s), {$enviadas} enviado(s).");
    }

    /** Envia (ou reenvia, se tinha falhado) um email da fila. */
    public function enviar(Request $request, Notificacao $notificacao)
    {
        return Notificacoes::enviar($notificacao, 'manual', $request->user()->id)
            ? back()->with('status', "Email enviado para {$notificacao->email}.")
            : back()->with('error', $notificacao->exists
                ? 'Não foi possível enviar: '.($notificacao->fresh()?->erro ?? 'erro desconhecido')
                : 'A factura já foi paga — o aviso foi retirado.');
    }

    public function destroy(Notificacao $notificacao)
    {
        $notificacao->delete();

        return back()->with('status', 'Email descartado.');
    }
}
