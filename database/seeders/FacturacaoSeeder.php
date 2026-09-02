<?php

namespace Database\Seeders;

use App\Models\Cliente;
use App\Models\Divida;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Database\Seeder;

class FacturacaoSeeder extends Seeder
{
    /**
     * Simula dois ciclos de facturação (Jun/2026 e Jul/2026) usando o
     * BillingService real, para que Leituras, Facturas, Pagamentos e Dívidas
     * fiquem coerentes entre si — tal como aconteceria na aplicação normal.
     */
    public function run(): void
    {
        $tecnico = User::where('username', 'sergio.nhaca')->first();
        $gestor = User::where('username', 'graca.simbine')->first();
        $caixas = User::whereIn('username', ['celia.machel', 'ivan.mondlane'])->get();

        // [numero_cliente => [ [mes, consumo, resultado], ... ] ]
        // resultado: 'paga' (paga na totalidade), 'parcial' (paga cerca de metade), 'pendente' (sem pagamento)
        $plano = [
            'CLI-0001' => [[6, 10, 'paga'], [7, 12, 'paga']],
            'CLI-0002' => [[6, 9, 'paga'], [7, 9, 'pendente']],
            'CLI-0003' => [[6, 34, 'parcial'], [7, 38, 'parcial']],
            'CLI-0004' => [[6, 7, 'pendente'], [7, 6, 'pendente']],
            'CLI-0005' => [[6, 50, 'paga'], [7, 54, 'paga']],
            'CLI-0006' => [[6, 6, 'pendente'], [7, 5, 'pendente']],
            'CLI-0007' => [[6, 20, 'paga'], [7, 22, 'paga']],
            'CLI-0008' => [[6, 8, 'paga'], [7, 8, 'paga']],
            'CLI-0009' => [[6, 4, 'pendente'], [7, 4, 'pendente']],
            'CLI-0010' => [[6, 28, 'paga'], [7, 31, 'parcial']],
        ];

        $billing = app(BillingService::class);
        $numeroFactura = 30;
        $numeroRecibo = 120;
        $ano = 2026;
        $indiceCaixa = 0;

        foreach ($plano as $numeroCliente => $ciclos) {
            $cliente = Cliente::where('numero_cliente', $numeroCliente)->firstOrFail();
            $leituraAnterior = 40 + ((int) substr($numeroCliente, -2)) * 3;

            foreach ($ciclos as [$mes, $consumo, $resultado]) {
                $leituraActual = $leituraAnterior + $consumo;

                $leitura = Leitura::create([
                    'cliente_id' => $cliente->id,
                    'mes' => $mes,
                    'ano' => $ano,
                    'leitura_anterior' => $leituraAnterior,
                    'leitura_actual' => $leituraActual,
                    'confirmado' => true,
                    'registado_por' => $tecnico->id,
                ]);

                $cliente->load(['tarifa', 'divida']);
                $calculo = $billing->calcular($leitura, $cliente);

                $factura = Factura::create([
                    'numero_factura' => sprintf('FAT-%d-%04d', $ano, $numeroFactura++),
                    'cliente_id' => $cliente->id,
                    'leitura_id' => $leitura->id,
                    'mes' => $mes,
                    'ano' => $ano,
                    'valor_consumo' => $calculo['valor_consumo'],
                    'divida_anterior' => $calculo['divida_anterior'],
                    'multa' => $calculo['multa'],
                    'total_pagar' => $calculo['total_pagar'],
                    'estado' => 'pendente',
                    'gerada_por' => $gestor->id,
                ]);

                $valorPago = match ($resultado) {
                    'paga' => $factura->total_pagar,
                    'parcial' => round($factura->total_pagar * 0.5, 2),
                    default => 0,
                };

                if ($valorPago > 0) {
                    $caixa = $caixas[$indiceCaixa % max(1, $caixas->count())];
                    $indiceCaixa++;

                    Pagamento::create([
                        'numero_recibo' => sprintf('REC-%d-%04d', $ano, $numeroRecibo++),
                        'factura_id' => $factura->id,
                        'cliente_id' => $cliente->id,
                        'valor_pago' => $valorPago,
                        'metodo_pagamento' => ['dinheiro', 'banco', 'mpesa', 'e-mola'][($numeroRecibo) % 4],
                        'recebido_por' => $caixa->id,
                    ]);
                }

                $factura->update(['estado' => $resultado === 'paga' ? 'paga' : ($resultado === 'parcial' ? 'parcial' : 'pendente')]);

                $saldoRestante = round((float) $factura->total_pagar - $valorPago, 2);
                $tarifa = $cliente->tarifa;

                Divida::updateOrCreate(
                    ['cliente_id' => $cliente->id],
                    [
                        'valor_divida' => $saldoRestante,
                        'meses_atraso' => $saldoRestante > 0 ? (($cliente->divida->meses_atraso ?? 0) + 1) : 0,
                        'em_corte' => $saldoRestante >= (float) $tarifa->limiar_corte,
                        'data_ultimo_pagamento' => $valorPago > 0 ? now() : $cliente->divida?->data_ultimo_pagamento,
                    ],
                );

                $leituraAnterior = $leituraActual;
            }
        }
    }
}
