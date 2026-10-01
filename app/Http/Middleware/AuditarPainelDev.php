<?php

namespace App\Http\Middleware;

use App\Models\DevAuditoria;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Audita cada acção que ALTERA algo no painel do Desenvolvedor (POST, PUT,
 * PATCH, DELETE): quem, quando, que rota, em que registo, com que campos e
 * com que resultado. Os valores de campos sensíveis nunca são guardados.
 */
class AuditarPainelDev
{
    private const SENSIVEIS = ['password', 'senha', 'token', 'secret', 'segredo', 'key', '_token', '_method'];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if ($request->isMethodSafe() || ! $request->user()) {
            return;
        }

        $rota = $request->route();
        $alvo = collect($rota?->parameters() ?? [])
            ->map(fn ($v, $k) => $k.'='.(is_object($v) && method_exists($v, 'getKey') ? $v->getKey() : (is_scalar($v) ? $v : '?')))
            ->implode(', ');

        DevAuditoria::registar($rota?->getName() ?? $request->path(), $alvo ?: null, [
            'metodo' => $request->method(),
            'campos' => $this->campos($request),
            'estado' => $response->getStatusCode(),
        ], $request);
    }

    /** Os campos enviados, com os sensíveis mascarados e valores longos cortados. */
    private function campos(Request $request): array
    {
        return collect($request->except(['_token', '_method']))
            ->map(function ($valor, $chave) {
                foreach (self::SENSIVEIS as $palavra) {
                    if (str_contains(mb_strtolower((string) $chave), $palavra)) {
                        return '••••';
                    }
                }

                return is_scalar($valor) || $valor === null ? mb_substr((string) $valor, 0, 120) : '['.gettype($valor).']';
            })
            ->all();
    }
}
