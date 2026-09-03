<?php

namespace App\Http\Middleware;

use App\Models\Configuracao;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloqueia o acesso fora do horário de funcionamento configurado em
 * /dev/configuracoes — aplica-se a todos os papéis excepto desenvolvedor
 * (o developer tem sempre de conseguir corrigir a configuração). Horas
 * guardadas como decimal (6.5 = 06:30); `horario_fim <= horario_inicio`
 * (omissão 0/24) significa "sem restrição".
 */
class VerificarHorarioFuncionamento
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->hasRole('desenvolvedor')) {
            return $next($request);
        }

        $inicio = Configuracao::valor('horario_inicio', 0);
        $fim = Configuracao::valor('horario_fim', 24);

        if ($fim <= $inicio) {
            return $next($request);
        }

        $agora = Carbon::now();
        $horaActual = $agora->hour + ($agora->minute / 60);

        if ($horaActual < $inicio || $horaActual >= $fim) {
            return \Inertia\Inertia::render('AcessoBloqueado', [
                'motivo' => 'horario',
                'janela' => [
                    'inicio' => $this->formatarHora($inicio),
                    'fim' => $this->formatarHora($fim),
                ],
            ])->toResponse($request)->setStatusCode(403);
        }

        return $next($request);
    }

    private function formatarHora(float $hora): string
    {
        $horas = (int) floor($hora);
        $minutos = (int) round(($hora - $horas) * 60);

        return sprintf('%02d:%02d', $horas, $minutos);
    }
}
