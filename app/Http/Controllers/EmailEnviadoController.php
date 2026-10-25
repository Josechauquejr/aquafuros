<?php

namespace App\Http\Controllers;

use App\Models\EnvioEmail;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Histórico de emails de autenticação. */
class EmailEnviadoController extends Controller
{
    public const TIPOS = [
        'teste' => 'Email de teste',
        'codigo_verificacao' => 'Código de verificação',
        'codigo_recuperacao' => 'Código de recuperação',
        'senha_inicial' => 'Definição de senha inicial',
        'senha_reposicao' => 'Link para repor senha',
    ];

    public function index(Request $request)
    {
        $tipo = $request->query('tipo', 'todos');
        $estado = $request->query('estado', 'todos');
        $origem = $request->query('origem', 'todas');
        $search = trim((string) $request->query('search', ''));

        // O corpo (HTML) só se carrega ao abrir o email — não vai na lista.
        $query = EnvioEmail::whereIn('tipo', array_keys(self::TIPOS))->select(['id', 'factura_id', 'cliente_id', 'tipo', 'origem', 'email', 'assunto', 'estado', 'tentativas', 'erro', 'anexos', 'enviado_por', 'created_at'])
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
                'hoje' => EnvioEmail::whereIn('tipo', array_keys(self::TIPOS))->whereDate('created_at', now()->toDateString())->where('estado', 'enviado')->count(),
                'enviados' => EnvioEmail::whereIn('tipo', array_keys(self::TIPOS))->where('estado', 'enviado')->count(),
                'falharam' => EnvioEmail::whereIn('tipo', array_keys(self::TIPOS))->where('estado', 'falhou')->count(),
                'automaticos' => EnvioEmail::whereIn('tipo', array_keys(self::TIPOS))->where('estado', 'enviado')->where('origem', 'automatico')->count(),
            ],
            'filtros' => ['search' => $search, 'tipo' => $tipo, 'estado' => $estado, 'origem' => $origem],
        ]);
    }

    /** O email tal como foi enviado, para abrir numa janela (isolado: sem scripts, sem ligações externas). */
    public function ver(EnvioEmail $envio)
    {
        abort_unless(array_key_exists($envio->tipo, self::TIPOS), 404);
        $corpo = $envio->corpo ?: '<p style="font-family:Arial;padding:24px;color:#64748b">O conteúdo deste email não ficou guardado.</p>';

        return response($corpo, 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Security-Policy' => "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
