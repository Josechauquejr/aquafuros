<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pagamento extends Model
{
    protected $fillable = [
        'numero_recibo',
        'factura_id',
        'cliente_id',
        'valor_pago',
        'metodo_pagamento',
        'referencia_pagamento',
        'recebido_por',
    ];

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function recebidoPor()
    {
        return $this->belongsTo(User::class, 'recebido_por');
    }
}
