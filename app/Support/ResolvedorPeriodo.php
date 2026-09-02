<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Resolve um período nomeado (hoje/semana/mes/personalizado/todos) num
 * intervalo de datas concreto, e também o intervalo equivalente
 * imediatamente anterior — para permitir comparações período-a-período
 * (KPIs) sem duplicar esta lógica em cada controller.
 */
class ResolvedorPeriodo
{
    /**
     * @return array{inicio: Carbon, fim: Carbon, anteriorInicio: Carbon, anteriorFim: Carbon}
     */
    public static function resolver(string $periodo, ?string $dataInicio = null, ?string $dataFim = null): array
    {
        $hoje = Carbon::now();

        [$inicio, $fim] = match ($periodo) {
            'hoje' => [$hoje->copy()->startOfDay(), $hoje->copy()->endOfDay()],
            'semana' => [$hoje->copy()->startOfWeek(), $hoje->copy()->endOfWeek()],
            'personalizado' => [
                $dataInicio ? Carbon::parse($dataInicio)->startOfDay() : $hoje->copy()->startOfMonth(),
                $dataFim ? Carbon::parse($dataFim)->endOfDay() : $hoje->copy()->endOfDay(),
            ],
            'todos' => [Carbon::createFromTimestamp(0), $hoje->copy()->endOfDay()],
            default => [$hoje->copy()->startOfMonth(), $hoje->copy()->endOfMonth()],
        };

        // Intervalo anterior com a mesma duração, para comparações (ex.:
        // "esta semana" compara com os 7 dias imediatamente anteriores).
        $duracaoDias = $inicio->diffInDays($fim) + 1;
        $anteriorFim = $inicio->copy()->subSecond();
        $anteriorInicio = $anteriorFim->copy()->subDays($duracaoDias - 1)->startOfDay();

        return [
            'inicio' => $inicio,
            'fim' => $fim,
            'anteriorInicio' => $anteriorInicio,
            'anteriorFim' => $anteriorFim,
        ];
    }
}
