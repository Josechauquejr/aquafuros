<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Zona / bairro de abastecimento — a lista estruturada que substitui o bairro de texto livre. */
class Zona extends Model
{
    protected $table = 'zonas';

    protected $fillable = ['nome'];

    public function clientes()
    {
        return $this->hasMany(Cliente::class);
    }
}
