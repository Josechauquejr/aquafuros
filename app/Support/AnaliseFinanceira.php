<?php

namespace App\Support;

use App\Models\Factura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;

/**
 * Previsão de caixa e evolução da dívida. Ambas são ESTIMATIVAS construídas
 * com o histórico de pagamentos da própria empresa — mostram-se com os
 * componentes à vista para se perceber de onde vem cada número.
 */
class AnaliseFinanceira
{
    /**
     * Quanto se espera receber nos próximos 30 dias:
     *   facturas que vencem nos próximos 30 dias × taxa histórica de pagamento até 15 dias após o vencimento
     * + dívida já em atraso × fracção dela que costuma ser recuperada num mês.
     */
    public static function previsaoCaixa(): array
    {
        $hoje = now()->startOfDay();
        $fim = $hoje->copy()->addDays(30);

        $abertas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar', 'data_vencimento']);
        $falta = fn ($f) => max(0.0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0));

        $aVencer = $abertas->filter(fn ($f) => $f->data_vencimento && $f->data_vencimento->gte($hoje) && $f->data_vencimento->lte($fim));
        $emAtraso = $abertas->filter(fn ($f) => $f->data_vencimento && $f->data_vencimento->lt($hoje));
        $valorAVencer = round((float) $aVencer->sum($falta), 2);
        $valorEmAtraso = round((float) $emAtraso->sum($falta), 2);

        // Taxa de pagamento pontual: facturas de há 2 a 6 meses (já tiveram tempo de ser pagas).
        $historicas = Factura::where('estado', '!=', 'anulada')
            ->whereBetween('created_at', [now()->subMonths(6), now()->subMonths(2)])
            ->with('pagamentos')
            ->get();
        $proprio = (float) $historicas->sum(fn ($f) => $f->valorProprio());
        $pagoAPrazo = (float) $historicas->sum(function ($f) {
            $limite = $f->data_vencimento?->copy()->addDays(15)->endOfDay();
            $pago = (float) $f->pagamentos->filter(fn ($p) => ! $limite || $p->pago_em->lte($limite))->sum('valor_pago');

            return min($pago, $f->valorProprio());
        });
        $taxaPontual = $proprio > 0 ? round($pagoAPrazo / $proprio, 3) : null;

        // Recuperação: o que se recebeu nos últimos 90 dias DEPOIS do vencimento, por mês,
        // em relação à dívida que hoje está em atraso.
        $tardios = (float) Pagamento::whereBetween('pago_em', [now()->subDays(90), now()])
            ->with('factura:id,data_vencimento')->get()
            ->filter(fn ($p) => $p->factura?->data_vencimento && $p->pago_em->gt($p->factura->data_vencimento->copy()->endOfDay()))
            ->sum('valor_pago');
        $recuperadoPorMes = $tardios / 3;
        $taxaRecuperacao = $valorEmAtraso > 0 ? round(min(1.0, $recuperadoPorMes / $valorEmAtraso), 3) : null;

        $previsto = ($taxaPontual === null ? 0.0 : $valorAVencer * $taxaPontual)
            + ($taxaRecuperacao === null ? 0.0 : $valorEmAtraso * $taxaRecuperacao);

        return [
            'previsto' => round($previsto, 2),
            'aVencer' => ['valor' => $valorAVencer, 'facturas' => $aVencer->count(), 'taxa' => $taxaPontual],
            'emAtraso' => ['valor' => $valorEmAtraso, 'facturas' => $emAtraso->count(), 'taxa' => $taxaRecuperacao],
            'fiavel' => $taxaPontual !== null,
        ];
    }

    /**
     * Valor por receber (facturado próprio − pago) no fim de cada um dos
     * últimos N meses, reconstruído com as datas das facturas, das anulações e
     * dos pagamentos — para ver se a dívida sobe ou desce.
     *
     * @return array<int, array{mes: int, ano: int, divida: float}>
     */
    public static function evolucaoDivida(Carbon $referencia, int $meses = 12): array
    {
        $facturas = Factura::with('pagamentos:id,factura_id,valor_pago,pago_em')
            ->get(['id', 'created_at', 'total_pagar', 'divida_anterior', 'divida_anterior_incluida', 'estado', 'anulada_em']);

        return collect(range($meses - 1, 0))->map(function ($atras) use ($referencia, $facturas) {
            $fim = $referencia->copy()->startOfMonth()->subMonthsNoOverflow($atras)->endOfMonth();

            $divida = $facturas
                ->filter(fn ($f) => $f->created_at->lte($fim) && ($f->estado !== 'anulada' || ($f->anulada_em && $f->anulada_em->gt($fim))))
                ->sum(function ($f) use ($fim) {
                    $pago = (float) $f->pagamentos->filter(fn ($p) => $p->pago_em->lte($fim))->sum('valor_pago');

                    return max(0.0, $f->valorProprio() - $pago);
                });

            return ['mes' => $fim->month, 'ano' => $fim->year, 'divida' => round((float) $divida, 2)];
        })->all();
    }
}
