<?php

namespace App\Services;

use App\Models\Leitura;
use App\Models\Cliente;

class BillingService
{
    public function calcular(Leitura $leitura, Cliente $cliente): array
    {
        $consumo         = $this->calcularConsumo($leitura);
        $valorConsumo    = $this->calcularValorConsumo($consumo, $cliente);
        $dividaAnterior  = $this->calcularDividaAnterior($cliente);
        $multa           = $this->calcularMulta($dividaAnterior, $cliente);
        $totalPagar      = $valorConsumo + $dividaAnterior + $multa;

        return [
            'consumo_m3'      => round($consumo, 2),
            'valor_consumo'   => round($valorConsumo, 2),
            'divida_anterior' => round($dividaAnterior, 2),
            'multa'           => round($multa, 2),
            'total_pagar'     => round($totalPagar, 2),
        ];
    }

    private function calcularConsumo(Leitura $leitura): float
    {
        // max(0) protege contra leitura_actual menor que leitura_anterior por erro de registo
        return max(0, (float) $leitura->leitura_actual - (float) $leitura->leitura_anterior);
    }

    private function calcularValorConsumo(float $consumo, Cliente $cliente): float
    {
        $tarifa = $cliente->tarifa;

        if ($consumo <= $tarifa->consumo_minimo_m3) {
            return (float) $tarifa->taxa_minima;
        }

        return $consumo * (float) $tarifa->preco_m3;
    }

    private function calcularDividaAnterior(Cliente $cliente): float
    {
        $divida = $cliente->divida;

        return $divida ? (float) $divida->valor_divida : 0.00;
    }

    private function calcularMulta(float $dividaAnterior, Cliente $cliente): float
    {
        $tarifa = $cliente->tarifa;

        if ($dividaAnterior >= (float) $tarifa->limiar_corte) {
            return $dividaAnterior * (float) $tarifa->percentagem_multa;
        }

        return 0.00;
    }
}
