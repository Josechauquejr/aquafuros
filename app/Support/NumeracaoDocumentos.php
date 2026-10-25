<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

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
    public static function proximoNumero(string $chave, Builder $query, string $coluna, string $formato): string
    {
        return DB::transaction(function () use ($chave, $query, $coluna, $formato) {
            $sequencia = DB::table('numeracoes_documentos')->where('chave', $chave)->lockForUpdate()->first();

            if (! $sequencia) {
                $max = $query->withoutEagerLoads()->whereNotNull($coluna)->get([$coluna])->reduce(function ($carry, $registo) use ($coluna) {
                    preg_match('/(\d+)$/', $registo->{$coluna}, $m);

                    return max($carry, (int) ($m[1] ?? 0));
                }, 0);

                DB::table('numeracoes_documentos')->insertOrIgnore([
                    'chave' => $chave,
                    'proximo_numero' => $max + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Outra transacção pode inicializar a mesma chave em paralelo;
                // após o insert concorrente, ambas lêem o mesmo contador bloqueado.
                $sequencia = DB::table('numeracoes_documentos')->where('chave', $chave)->lockForUpdate()->first();
            }

            $numero = (int) $sequencia->proximo_numero;
            DB::table('numeracoes_documentos')->where('chave', $chave)->update([
                'proximo_numero' => $numero + 1,
                'updated_at' => now(),
            ]);

            return sprintf($formato, $numero);
        });
    }
}
