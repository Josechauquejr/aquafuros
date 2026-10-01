<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Barreira geral das operações que alteram dados no painel do Desenvolvedor:
 * enquanto DEV_ESCRITA não estiver ligada, nada passa (a verificação é feita
 * no servidor, não só escondendo botões).
 */
class EscritaDevActiva
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('developer.escrita')) {
            $mensagem = 'As alterações estão desligadas. Para as usar, defina DEV_ESCRITA=true nas variáveis de ambiente e volte a desligá-las depois.';

            return $request->isMethodSafe()
                ? redirect()->route('dev.alteracoes')->with('error', $mensagem)
                : back()->with('error', $mensagem)->setStatusCode(303);
        }

        return $next($request);
    }
}
