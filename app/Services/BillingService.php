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
    public function valorConsumo(Leitura $leitura, Cliente $cliente): float
    {
        return round($this->calcularValorConsumo($this->calcularConsumo($leitura), $cliente), 2);
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
        return $cliente->saldoEmAberto();
    }

}
