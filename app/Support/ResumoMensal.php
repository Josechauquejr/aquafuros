<?php

namespace App\Support;

use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * UMA só definição de "facturado" e "recebido" para os painéis — a mesma
 * das páginas de Facturas, Pagamentos e KPIs:
 *
 * - Facturado no mês = facturas (não anuladas) EMITIDAS nesse mês;
 * - Recebido no mês  = dinheiro recebido nesse mês, pela DATA DO PAGAMENTO
 *   (é o "Total recebido" da página de Pagamentos com esse período);
 * - Taxa de cobrança = recebido ÷ facturado do mês (pode passar de 100%
 *   quando se recebe dívida de meses anteriores).
 */
class ResumoMensal
{
    /** @return array{0: Carbon, 1: Carbon} */
    private static function intervalo(int $mes, int $ano): array
    {
        $inicio = Carbon::create($ano, $mes, 1)->startOfMonth();

        return [$inicio, $inicio->copy()->endOfMonth()];
    }

    /**
     * Cartões da página de Facturas para um mês: o que foi facturado
     * (emitido nesse mês), o dinheiro recebido nesse mês (o mesmo do painel e
     * dos Pagamentos), o que ainda falta pagar DAS FACTURAS desse mês e
     * quantas estão por pagar / vencidas.
     *
     * @return array<string, int|float>
     */
    public static function facturas(int $mes, int $ano): array
    {
        [$inicio, $fim] = self::intervalo($mes, $ano);

        $emitidas = Factura::whereBetween('created_at', [$inicio, $fim])
            ->where('estado', '!=', 'anulada')
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida', 'estado', 'data_vencimento']);
        $abertas = $emitidas->whereIn('estado', ['pendente', 'parcial']);
        $falta = fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0));

        return [
            'totalFacturado' => round((float) $emitidas->sum(fn ($f) => $f->valorProprio()), 2),
            'numeroFacturas' => $emitidas->count(),
            'recebidoNoMes' => round((float) Pagamento::whereBetween('pago_em', [$inicio, $fim])->sum('valor_pago'), 2),
            'emAberto' => round((float) $abertas->sum($falta), 2),
            'pendentesCount' => $emitidas->where('estado', 'pendente')->count(),
            'parciaisCount' => $emitidas->where('estado', 'parcial')->count(),
            'vencidasCount' => $abertas->filter(fn ($f) => $f->data_vencimento?->isPast())->count(),
        ];
    }

    /**
     * Cartões da página de Pagamentos para um mês (pela data do pagamento).
     *
     * @return array{totalRecebido: float, totalRegistados: int, metodoMaisUsado: ?string}
     */
    public static function pagamentos(int $mes, int $ano): array
    {
        [$inicio, $fim] = self::intervalo($mes, $ano);
        $query = Pagamento::whereBetween('pago_em', [$inicio, $fim]);

        $metodo = (clone $query)
            ->select('metodo_pagamento')
            ->selectRaw('COUNT(*) as quantidade')
            ->groupBy('metodo_pagamento')
            ->orderByDesc('quantidade')
            ->first();

        return [
            'totalRecebido' => round((float) (clone $query)->sum('valor_pago'), 2),
            'totalRegistados' => (clone $query)->count(),
            'metodoMaisUsado' => $metodo?->metodo_pagamento,
        ];
    }

    /**
     * Cartões da página de Leituras para um mês (o mês a que a leitura
     * pertence): quantas, quantas confirmadas / por confirmar, quantas
     * confirmadas ainda sem factura, e o consumo total.
     *
     * @return array<string, int|float>
     */
    public static function leituras(int $mes, int $ano): array
    {
        $leituras = Leitura::where('mes', $mes)->where('ano', $ano);
        $todas = (clone $leituras)->get(['id', 'confirmado', 'leitura_anterior', 'leitura_actual']);

        return [
            'total' => $todas->count(),
            'confirmadas' => $todas->where('confirmado', true)->count(),
            'pendentes' => $todas->where('confirmado', false)->count(),
            'semFactura' => (clone $leituras)->where('confirmado', true)->whereDoesntHave('factura')->count(),
            'consumoM3' => round((float) $todas->sum(fn ($l) => max(0, (float) $l->leitura_actual - (float) $l->leitura_anterior)), 2),
        ];
    }

    /**
     * @return array{mes: int, ano: int, totalFacturado: float, totalRecebido: float, taxaCobranca: ?float, numeroFacturas: int, numeroPagamentos: int}
     */
    public static function calcular(int $mes, int $ano): array
    {
        $inicio = Carbon::create($ano, $mes, 1)->startOfMonth();
        $fim = $inicio->copy()->endOfMonth();

        $facturas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada');
        $pagamentos = Pagamento::whereBetween('pago_em', [$inicio, $fim]);

        $totalFacturado = round((float) (clone $facturas)->sum(DB::raw(Factura::SQL_VALOR_PROPRIO)), 2);
        $totalRecebido = round((float) (clone $pagamentos)->sum('valor_pago'), 2);

        return [
            'mes' => $mes,
            'ano' => $ano,
            'totalFacturado' => $totalFacturado,
            'totalRecebido' => $totalRecebido,
            'taxaCobranca' => $totalFacturado > 0 ? round(($totalRecebido / $totalFacturado) * 100, 1) : null,
            'numeroFacturas' => (clone $facturas)->count(),
            'numeroPagamentos' => (clone $pagamentos)->count(),
        ];
    }
}
