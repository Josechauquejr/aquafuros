<?php

namespace App\Support;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Leitura;
use App\Models\ProducaoAgua;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * O ciclo do mês que o menu lateral mostra sempre: "Ciclo de Novembro ·
 * dia 7 de 30 · Leituras até 25 Nov · vence 10 Dez". O ciclo vai do dia 11
 * do mês de referência ao dia 10 do seguinte (ver MesReferencia::actual).
 */
class CicloMes
{
    private const MESES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    private const ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    /**
     * @return array{mes: string, dia: int, dias: int, leiturasAte: string, vence: string, lidas: int, clientes: int, diasParaLimite: int, producaoRegistada: bool}
     */
    public static function resumo(): array
    {
        $mes = MesReferencia::actual();

        return Cache::remember('ciclo-mes.'.$mes->format('Y-m'), 60, function () use ($mes) {
            $inicio = $mes->copy()->day(11)->startOfDay();
            $fim = $mes->copy()->addMonthNoOverflow()->day(10)->startOfDay();
            $hoje = Carbon::today();
            $limite = min(max(Configuracao::regrasDeCobranca()['leituras_dia_limite'], 1), $mes->daysInMonth);

            return [
                'mes' => self::MESES[$mes->month - 1],
                'dia' => (int) min(max($inicio->diffInDays($hoje) + 1, 1), $inicio->diffInDays($fim) + 1),
                'dias' => (int) $inicio->diffInDays($fim) + 1,
                'leiturasAte' => $limite.' '.self::ABREV[$mes->month - 1],
                'vence' => '10 '.self::ABREV[$fim->month - 1],
                'lidas' => Leitura::where('mes', $mes->month)->where('ano', $mes->year)->whereNull('anulada_em')->distinct('cliente_id')->count('cliente_id'),
                'clientes' => Cliente::where('estado', 'ativo')->count(),
                // Dias que faltam até ao dia limite das leituras (negativo = já passou).
                'diasParaLimite' => (int) $hoje->diffInDays($mes->copy()->day($limite)->startOfDay(), false),
                'producaoRegistada' => ProducaoAgua::where('mes', $mes->month)->where('ano', $mes->year)->exists(),
            ];
        });
    }
}
