<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Movimento do crédito de um cliente: entrada (adiantamento ou excesso de um
 * pagamento) com valor positivo, utilização (usado a pagar uma factura) com
 * valor negativo. O saldo é a soma — nunca um número guardado.
 */
class Credito extends Model
{
    protected $table = 'creditos';

    protected $fillable = [
        'cliente_id', 'tipo', 'valor', 'metodo_pagamento', 'referencia_pagamento', 'numero_recibo',
        'pagamento_id', 'recebido_por', 'pago_em', 'nota',
    ];

    protected $casts = ['pago_em' => 'datetime'];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function recebidoPor()
    {
        return $this->belongsTo(User::class, 'recebido_por')->withTrashed();
    }

    public static function saldoDe(int $clienteId): float
    {
        return round((float) static::where('cliente_id', $clienteId)->sum('valor'), 2);
    }
}
