<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AjusteLeitura extends Model
{
    protected $table = 'ajustes_leitura';

    protected $fillable = ['cliente_id', 'leitura_id', 'user_id', 'tipo', 'motivo', 'antes', 'depois'];

    protected $casts = ['antes' => 'array', 'depois' => 'array'];
}
