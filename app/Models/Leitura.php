<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Leitura extends Model
{
    protected $fillable = [
        'cliente_id',
        'mes',
        'ano',
        'leitura_anterior',
        'leitura_actual',
        'confirmado',
        'registado_por'
    ];

    // Uma leitura pertence a um cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Uma leitura é registada por um utilizador
    public function registadoPor()
    {
        return $this->belongsTo(User::class, 'registado_por');
    }

    // Uma leitura pode ter uma factura associada
    public function factura()
    {
        return $this->hasOne(Factura::class);
    }

}
