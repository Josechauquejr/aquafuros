<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Gerador de números sequenciais para documentos (clientes, facturas,
 * recibos) — mesma lógica (regex sobre o sufixo numérico + reduce ao
 * máximo) antes duplicada em cada controller.
 */
class NumeracaoDocumentos
{
    /**
     * @param  Builder  $query  Query já filtrada (ex.: por prefixo/ano) para o modelo em causa.
     * @param  string  $coluna  Coluna que guarda o número (ex.: numero_factura).
     */
    public static function proximoNumero(Builder $query, string $coluna, string $formato): string
    {
        $max = $query->get()->reduce(function ($carry, $registo) use ($coluna) {
            preg_match('/(\d+)$/', $registo->{$coluna}, $m);

            return max($carry, (int) ($m[1] ?? 0));
        }, 0);

        return sprintf($formato, $max + 1);
    }
}
