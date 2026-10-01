<?php

namespace App\Http\Controllers;

use App\Models\EnvioEmail;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Registo de todos os emails que o sistema envia (facturas, lembretes, avisos
 * de atraso e cobranças): quem recebeu, quando, o que dizia, se foi automático
 * ou à mão, e se falhou.
 */
class EmailEnviadoController extends Controller
{
    public const TIPOS = [
        'factura' => 'Factura',
        'lembrete_vencimento' => 'Lembrete de vencimento',
        'atraso' => 'Atraso',
        'atraso_grave' => 'Atraso grave',
        'cobranca' => 'Cobrança',
        'recibo' => 'Recibo de pagamento',
        'teste' => 'Email de teste',
    ];

    public function index(Request $request)
    {
        $tipo = $request->query('tipo', 'todos');
        $estado = $request->query('estado', 'todos');
        $origem = $request->query('origem', 'todas');
        $search = trim((string) $request->query('search', ''));

        // O corpo (HTML) só se carrega ao abrir o email — não vai na lista.
        $query = EnvioEmail::select(['id', 'factura_id', 'cliente_id', 'tipo', 'origem', 'email', 'assunto', 'estado', 'tentativas', 'erro', 'anexos', 'enviado_por', 'created_at'])
            ->selectRaw('(corpo is not null) as tem_corpo')
            ->with(['cliente', 'factura:id,numero_factura', 'enviadoPor:id,name'])
            ->orderByDesc('id');

        if (array_key_exists($tipo, self::TIPOS)) {
            $query->where('tipo', $tipo);
        }
        if (in_array($estado, ['enviado', 'falhou'], true)) {
            $query->where('estado', $estado);
        }
        if (in_array($origem, ['automatico', 'manual'], true)) {
            $query->where('origem', $origem);
        }
        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_strtolower($search)).'%';
            $query->where(fn ($q) => $q
                ->whereRaw('lower(email) like ?', [$like])
                ->orWhereRaw('lower(assunto) like ?', [$like])
                ->orWhereHas('cliente', fn ($c) => $c->whereRaw('lower(nome) like ?', [$like])));
        }

        return Inertia::render('Emails/Index', [
            'envios' => $query->paginate(20)->withQueryString(),
            'tipos' => self::TIPOS,
            'totais' => [
                'hoje' => EnvioEmail::whereDate('created_at', now()->toDateString())->where('estado', 'enviado')->count(),
                'enviados' => EnvioEmail::where('estado', 'enviado')->count(),
                'falharam' => EnvioEmail::where('estado', 'falhou')->count(),
                'automaticos' => EnvioEmail::where('estado', 'enviado')->where('origem', 'automatico')->count(),
            ],
            'filtros' => ['search' => $search, 'tipo' => $tipo, 'estado' => $estado, 'origem' => $origem],
        ]);
    }

    /** O email tal como foi enviado, para abrir numa janela (isolado: sem scripts, sem ligações externas). */
    public function ver(EnvioEmail $envio)
    {
        $corpo = $envio->corpo ?: '<p style="font-family:Arial;padding:24px;color:#64748b">O conteúdo deste email não ficou guardado.</p>';

        return response($corpo, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
