<?php

namespace App\Support;

use App\Models\Factura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;

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
    /**
     * @return array{mes: int, ano: int, totalFacturado: float, totalRecebido: float, taxaCobranca: ?float, numeroFacturas: int, numeroPagamentos: int}
     */
    public static function calcular(int $mes, int $ano): array
    {
        $inicio = Carbon::create($ano, $mes, 1)->startOfMonth();
        $fim = $inicio->copy()->endOfMonth();

        $facturas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada');
        $pagamentos = Pagamento::whereBetween('created_at', [$inicio, $fim]);

        $totalFacturado = round((float) (clone $facturas)->sum('total_pagar'), 2);
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
