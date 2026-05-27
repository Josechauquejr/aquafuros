<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Divida extends Model
{
    protected $fillable = [
        'cliente_id',
        'valor_divida',
        'meses_atraso',
        'em_corte',
        'data_ultimo_pagamento',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}
