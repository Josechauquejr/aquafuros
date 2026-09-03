<?php

namespace App\Http\Middleware;

use App\Models\AcessoSistema;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Regista cada pedido autenticado — quem, quando, URL/método, IP e
 * dispositivo (user-agent), e duas métricas de performance: duração total
 * do pedido e tempo especificamente gasto em consultas à base de dados
 * (via o query log do Laravel) — para o gráfico de performance do
 * Desenvolvedor. Middleware *terminable*: corre depois da resposta já
 * estar pronta, para não atrasar o pedido nem arriscar bloqueá-lo se a
 * escrita falhar.
 */
class RegistarAcesso
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('_inicio_pedido', microtime(true));
        DB::enableQueryLog();

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        try {
            if ($request->user()) {
                $inicio = $request->attributes->get('_inicio_pedido');
                $duracaoMs = $inicio ? (int) round((microtime(true) - $inicio) * 1000) : null;
                $tempoBdMs = (int) round(collect(DB::getQueryLog())->sum('time'));

                AcessoSistema::create([
                    'user_id' => $request->user()->id,
                    'url' => $request->fullUrl(),
                    'metodo' => $request->method(),
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'status_code' => $response->getStatusCode(),
                    'duracao_ms' => $duracaoMs,
                    'tempo_bd_ms' => $tempoBdMs,
                    'created_at' => now(),
                ]);
            }
        } catch (\Throwable) {
            // Nunca deixar uma falha ao registar o acesso afectar o pedido —
            // a resposta já foi enviada ao browser a esta altura.
        }

        DB::disableQueryLog();
    }
}
