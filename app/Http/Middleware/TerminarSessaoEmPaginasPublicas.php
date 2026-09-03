<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Aplicado às páginas de convidado (welcome "/", login, registo...) — se o
 * pedido chegar com uma sessão autenticada, termina-a antes de continuar,
 * em vez de redireccionar para o dashboard. Comportamento pedido
 * explicitamente: visitar estas páginas é tratado como intenção de sair da
 * conta actual.
 */
class TerminarSessaoEmPaginasPublicas
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $next($request);
    }
}
