<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Mail\ReciboMail;
use App\Models\EnvioEmail;
use App\Models\Factura;
use App\Support\FacturaEmail;
use App\Support\RegistoEmail;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Emails do ponto de vista técnico: histórico completo, falhas e reenvio.
 * Só se reenvia o que se consegue reconstruir com segurança (facturas e
 * recibos); lembretes e cobranças reenviam-se pelos seus ecrãs de origem.
 */
class EmailsController extends Controller
{
    private const REENVIAVEIS = ['factura', 'recibo'];

    public function index(Request $request)
    {
        $estado = in_array($request->query('estado'), ['enviado', 'falhou'], true) ? $request->query('estado') : null;
        $tipo = $request->query('tipo');
        $search = trim((string) $request->query('search', ''));

        $query = EnvioEmail::select(['id', 'factura_id', 'cliente_id', 'tipo', 'origem', 'email', 'assunto', 'estado', 'tentativas', 'erro', 'enviado_por', 'created_at'])
            ->selectRaw('(corpo is not null) as tem_corpo')
            ->with(['cliente:id,nome', 'enviadoPor:id,name'])
            ->orderByDesc('id');

        if ($estado) {
            $query->where('estado', $estado);
        }
        if (is_string($tipo) && $tipo !== '' && $tipo !== 'todos') {
            $query->where('tipo', $tipo);
        }
        if ($search !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($search)).'%';
            $query->where(fn ($q) => $q->whereRaw("lower(email) like ? escape '\\'", [$like])->orWhereRaw("lower(assunto) like ? escape '\\'", [$like]));
        }

        return Inertia::render('Dev/Emails', [
            'envios' => $query->paginate(20)->withQueryString()->through(fn ($e) => [...$e->toArray(), 'reenviavel' => in_array($e->tipo, self::REENVIAVEIS, true) && $e->factura_id !== null]),
            'tipos' => EnvioEmail::query()->distinct()->orderBy('tipo')->pluck('tipo'),
            'totais' => [
                'enviados' => EnvioEmail::where('estado', 'enviado')->count(),
                'falhados' => EnvioEmail::where('estado', 'falhou')->count(),
                'falhados_24h' => EnvioEmail::where('estado', 'falhou')->where('created_at', '>=', now()->subDay())->count(),
            ],
            'filtros' => ['estado' => $estado ?? 'todos', 'tipo' => $tipo ?: 'todos', 'search' => $search],
        ]);
    }

    /** O email tal como foi enviado, isolado (sem scripts nem ligações externas). */
    public function ver(EnvioEmail $envio)
    {
        $corpo = $envio->corpo ?: '<p style="font-family:Arial;padding:24px;color:#64748b">O conteúdo deste email não ficou guardado.</p>';

        return response($corpo, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Reenvia uma factura ou um recibo; fica registado como um envio novo (manual). */
    public function reenviar(Request $request, EnvioEmail $envio)
    {
        if (! in_array($envio->tipo, self::REENVIAVEIS, true) || ! $envio->factura_id) {
            return back()->with('error', 'Este tipo de email não se reenvia por aqui: use o ecrã de origem (cobrança ou notificações).');
        }

        $factura = Factura::withTrashed()->find($envio->factura_id);
        if (! $factura) {
            return back()->with('error', 'A factura deste email já não existe.');
        }

        if ($envio->tipo === 'factura') {
            $r = FacturaEmail::enviar($factura, $request->user()->id, 'manual');

            return back()->with($r['ok'] ? 'status' : 'error', $r['mensagem']);
        }

        $pagamentos = $factura->pagamentos()->get();
        if ($pagamentos->isEmpty()) {
            return back()->with('error', 'A factura já não tem pagamentos: não há recibo para reenviar.');
        }

        $novo = RegistoEmail::enviar(new ReciboMail($pagamentos), $envio->email, [
            'tipo' => 'recibo', 'origem' => 'manual', 'cliente_id' => $envio->cliente_id, 'factura_id' => $factura->id, 'enviado_por' => $request->user()->id,
        ]);

        return back()->with($novo->estado === 'enviado' ? 'status' : 'error', $novo->estado === 'enviado' ? "Recibo reenviado para {$envio->email}." : 'Não foi possível enviar: '.mb_substr((string) $novo->erro, 0, 160));
    }
}
