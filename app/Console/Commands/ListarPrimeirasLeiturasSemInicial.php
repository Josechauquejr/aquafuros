<?php

namespace App\Console\Commands;

use App\Models\Cliente;
use Illuminate\Console\Command;

/**
 * Só de leitura: lista os clientes cuja primeira leitura teve "anterior = 0",
 * para revisão manual. Não altera leituras nem facturas.
 */
class ListarPrimeirasLeiturasSemInicial extends Command
{
    protected $signature = 'leituras:primeira-anterior-zero';

    protected $description = 'Lista os clientes cuja primeira leitura teve anterior = 0 (só leitura, não altera dados)';

    public function handle(): int
    {
        $linhas = [];

        Cliente::withTrashed()->with([
            'leituras' => fn ($q) => $q->orderBy('ano')->orderBy('mes')->with('factura'),
        ])->orderBy('nome')->get()->each(function (Cliente $cliente) use (&$linhas) {
            $primeira = $cliente->leituras->first();

            if ($primeira && (float) $primeira->leitura_anterior === 0.0) {
                $linhas[] = [
                    $cliente->numero_cliente,
                    $cliente->nome.($cliente->trashed() ? ' (lixeira)' : ''),
                    sprintf('%02d/%d', $primeira->mes, $primeira->ano),
                    number_format((float) $primeira->leitura_actual, 2, ',', ' '),
                    $primeira->factura
                        ? $primeira->factura->numero_factura.' — MZN '.number_format((float) $primeira->factura->total_pagar, 2, ',', ' ')
                        : '—',
                ];
            }
        });

        if ($linhas === []) {
            $this->info('Nenhum cliente com a primeira leitura a partir de 0.');

            return self::SUCCESS;
        }

        $this->table(['Nº', 'Cliente', 'Período', 'Leitura actual', 'Factura'], $linhas);
        $this->line(count($linhas).' cliente(s) para rever manualmente. Nada foi alterado.');

        return self::SUCCESS;
    }
}
