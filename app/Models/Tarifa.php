<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tarifa extends Model
{
    protected $fillable = [
        'nome',
        'preco_m3',
        'taxa_minima',
        'consumo_minimo_m3',
        'percentagem_multa',
        'limiar_corte',
        'is_active'
    ];

    //Uma tarifa pode ser associada a muitos clientes
    public function clientes()
    {
        return $this->hasMany(Cliente::class);
    }
}
