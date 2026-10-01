<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * "Prometeu pagar X até ao dia Y." O estado é avaliado sozinho a partir dos
 * pagamentos do cliente: cumprida se desde a promessa pagou pelo menos o valor
 * prometido até ao fim do dia combinado; falhada se o dia passou sem isso.
 */
class PromessaPagamento extends Model
{
    protected $table = 'promessas_pagamento';

    protected $fillable = ['cliente_id', 'contacto_id', 'valor', 'data_prometida', 'estado', 'criado_por', 'avaliada_em'];

    protected $casts = [
        'data_prometida' => 'date',
        'avaliada_em' => 'datetime',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function criadoPor()
    {
        return $this->belongsTo(User::class, 'criado_por')->withTrashed();
    }

    /** Avalia as promessas pendentes (barato: só olha para as pendentes). Devolve quantas mudaram. */
    public static function avaliarPendentes(?Carbon $agora = null): int
    {
        $agora ??= now();
        $mudaram = 0;

        static::where('estado', 'pendente')->get()->each(function (self $promessa) use ($agora, &$mudaram) {
            $limite = $promessa->data_prometida->copy()->endOfDay();

            $pago = (float) Pagamento::where('cliente_id', $promessa->cliente_id)
                ->where('origem_credito', false)
                ->whereBetween('pago_em', [$promessa->created_at, $limite])
                ->sum('valor_pago');

            if ($pago + 0.005 >= (float) $promessa->valor) {
                $promessa->update(['estado' => 'cumprida', 'avaliada_em' => $agora]);
                $mudaram++;
            } elseif ($limite->lt($agora)) {
                $promessa->update(['estado' => 'falhada', 'avaliada_em' => $agora]);
                $mudaram++;
            }
        });

        return $mudaram;
    }
}
