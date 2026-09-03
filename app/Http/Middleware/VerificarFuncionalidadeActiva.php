<?php

namespace App\Http\Middleware;

use App\Models\Funcionalidade;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueia o acesso a uma secção inteira do sistema quando o Desenvolvedor a
 * desactiva em /dev/configuracoes — administrador e desenvolvedor nunca são
 * bloqueados (têm sempre de conseguir reactivá-la). Sem parâmetro de rota:
 * infere a secção a partir do padrão do URL, por isso não exige alterar
 * nenhuma definição de rota existente.
 */
class VerificarFuncionalidadeActiva
{
    private const MAPA_ROTAS = [
        'admin/kpis*' => 'kpis',
        'clientes*' => 'clientes',
        'facturas*' => 'facturas',
        'pagamentos*' => 'pagamentos',
        'leituras*' => 'leituras',
        'tarifas*' => 'tarifas',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->hasAnyRole(['administrador', 'desenvolvedor'])) {
            return $next($request);
        }

        $chave = null;
        foreach (self::MAPA_ROTAS as $padrao => $chaveSeccao) {
            if ($request->is($padrao)) {
                $chave = $chaveSeccao;
                break;
            }
        }

        if (! $chave) {
            return $next($request);
        }

        $activa = Funcionalidade::where('chave', $chave)->value('activa');

        if ($activa === false) {
            return \Inertia\Inertia::render('AcessoBloqueado', ['motivo' => 'funcionalidade'])
                ->toResponse($request)
                ->setStatusCode(403);
        }

        return $next($request);
    }
}
