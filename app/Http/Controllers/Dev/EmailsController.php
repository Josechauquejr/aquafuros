<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\EnvioEmail;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Histórico técnico dos emails de autenticação. */
class EmailsController extends Controller
{

    public function index(Request $request)
    {
        $estado = in_array($request->query('estado'), ['enviado', 'falhou', 'suspenso'], true) ? $request->query('estado') : null;
        $tipo = $request->query('tipo');
        $search = trim((string) $request->query('search', ''));

        $tiposAutenticacao = ['codigo_verificacao', 'codigo_recuperacao', 'senha_inicial', 'senha_reposicao', 'teste'];
        $query = EnvioEmail::whereIn('tipo', $tiposAutenticacao)->select(['id', 'factura_id', 'cliente_id', 'tipo', 'origem', 'email', 'assunto', 'estado', 'tentativas', 'erro', 'enviado_por', 'created_at'])
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
            'envios' => $query->paginate(20)->withQueryString(),
            'tipos' => $tiposAutenticacao,
            'totais' => [
                'enviados' => EnvioEmail::whereIn('tipo', $tiposAutenticacao)->where('estado', 'enviado')->count(),
                'falhados' => EnvioEmail::whereIn('tipo', $tiposAutenticacao)->where('estado', 'falhou')->count(),
                'falhados_24h' => EnvioEmail::whereIn('tipo', $tiposAutenticacao)->where('estado', 'falhou')->where('created_at', '>=', now()->subDay())->count(),
                'suspensos' => EnvioEmail::whereIn('tipo', $tiposAutenticacao)->where('estado', 'suspenso')->count(),
            ],
            'filtros' => ['estado' => $estado ?? 'todos', 'tipo' => $tipo ?: 'todos', 'search' => $search],
        ]);
    }

    /** O email tal como foi enviado, isolado (sem scripts nem ligações externas). */
    public function ver(EnvioEmail $envio)
    {
        abort_unless(in_array($envio->tipo, ['codigo_verificacao', 'codigo_recuperacao', 'senha_inicial', 'senha_reposicao', 'teste'], true), 404);
        $corpo = $envio->corpo ?: '<p style="font-family:Arial;padding:24px;color:#64748b">O conteúdo deste email não ficou guardado.</p>';

        return response($corpo, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
