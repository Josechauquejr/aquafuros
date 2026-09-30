<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Mês que um painel mostra: por omissão o actual, ou qualquer mês passado
 * escolhido com `?mes=AAAA-MM` (até 5 anos para trás; nunca o futuro).
 * Só os indicadores "do mês" seguem este valor; os de situação (dívida
 * total, leituras por confirmar, ...) são sempre o estado de agora.
 */
class MesReferencia
{
    private const MESES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    public static function resolver(Request $request): Carbon
    {
        $actual = Carbon::now()->startOfMonth();
        $pedido = $request->query('mes');

        if (! is_string($pedido) || ! preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $pedido)) {
            return $actual;
        }

        $mes = Carbon::createFromFormat('Y-m-d', "{$pedido}-01")->startOfMonth();

        if ($mes->greaterThan($actual) || $mes->lessThan($actual->copy()->subYears(5))) {
            return $actual;
        }

        return $mes;
    }

    /**
     * O que o frontend precisa para o selector de mês.
     *
     * @return array{valor: string, eActual: bool, rotulo: string, opcoes: array<int, array{valor: string, rotulo: string}>}
     */
    public static function paraSeletor(Carbon $mes, int $quantos = 24): array
    {
        $actual = Carbon::now()->startOfMonth();

        return [
            'valor' => $mes->format('Y-m'),
            'eActual' => $mes->equalTo($actual),
            'rotulo' => self::rotulo($mes),
            'opcoes' => collect(range(0, $quantos - 1))
                ->map(fn ($i) => $actual->copy()->subMonths($i))
                ->map(fn (Carbon $m) => ['valor' => $m->format('Y-m'), 'rotulo' => self::rotulo($m)])
                ->all(),
        ];
    }

    public static function rotulo(Carbon $mes): string
    {
        return self::MESES[$mes->month - 1].' '.$mes->year;
    }
}
