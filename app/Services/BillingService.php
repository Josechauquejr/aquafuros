<?php

namespace App\Services;

use App\Models\Leitura;
use App\Models\Cliente;

class BillingService
{
    public function calcular(Leitura $leitura, Cliente $cliente): array
    {
        $consumo         = $leitura->consumo();
        return $this->calcularParaConsumo($consumo, $cliente);
    }

    public function calcularParaConsumo(float $consumo, Cliente $cliente): array
    {
        $valorConsumo    = $this->calcularValorConsumo($consumo, $cliente);
        $multaAnterior   = $cliente->saldoMultasEmAberto();
        $dividaAnterior  = max(0, $this->calcularDividaAnterior($cliente) - $multaAnterior);
        // O saldo anterior é apresentado no documento; a dívida mantém a sua origem.
        $multa           = 0.0;
        $totalPagar      = $valorConsumo;

        return [
            'consumo_m3'      => round($consumo, 2),
            'valor_consumo'   => round($valorConsumo, 2),
            'divida_anterior' => round($dividaAnterior, 2),
            'multa'           => round($multa, 2),
            'multa_anterior'  => round($multaAnterior, 2),
            'total_pagar'     => round($totalPagar, 2),
            'total_emitido'   => round($dividaAnterior + $multaAnterior + $valorConsumo, 2),
        ];
    }

    /** Só o valor do consumo da leitura, sem dívida anterior nem multa (para corrigir uma factura já emitida). */
    public function valorConsumo(Leitura $leitura, Cliente $cliente, ?array $tarifaSnapshot = null): float
    {
        return round($this->calcularValorConsumo($leitura->consumo(), $cliente, $tarifaSnapshot), 2);
    }

    public function valorConsumoVolume(float $consumo, Cliente $cliente, ?array $tarifaSnapshot = null): float
    {
        return round($this->calcularValorConsumo($consumo, $cliente, $tarifaSnapshot), 2);
    }

    private function calcularValorConsumo(float $consumo, Cliente $cliente, ?array $tarifaSnapshot = null): float
    {
        $tarifa = $tarifaSnapshot ?? $cliente->tarifa;
        $consumoMinimo = (float) (is_array($tarifa) ? $tarifa['consumo_minimo_m3'] : $tarifa->consumo_minimo_m3);
        $taxaMinima = (float) (is_array($tarifa) ? $tarifa['taxa_minima'] : $tarifa->taxa_minima);
        $precoM3 = (float) (is_array($tarifa) ? $tarifa['preco_m3'] : $tarifa->preco_m3);

        if ($consumo <= $consumoMinimo) {
            return $taxaMinima;
        }

        return $consumo * $precoM3;
    }

    private function calcularDividaAnterior(Cliente $cliente): float
    {
        return $cliente->saldoEmAberto();
    }

}
