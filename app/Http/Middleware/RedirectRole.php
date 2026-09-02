<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $next($request);
        }

        if ($request->path() === 'dashboard') {
            if ($request->user()->hasRole('administrador')) {
                return redirect()->route('admin.dashboard');
            }

            if ($request->user()->hasRole('gestor')) {
                return redirect()->route('gestor.dashboard');
            }

            if ($request->user()->hasRole('tecnico')) {
                return redirect()->route('tecnico.dashboard');
            }

            if ($request->user()->hasRole('caixa')) {
                return redirect()->route('caixa.dashboard');
            }

            return redirect()->route('login');
        }

        return $next($request);
    }
}
