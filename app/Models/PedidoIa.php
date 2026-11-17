<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Uma chamada à IA (ver App\Support\IA\Gemini): para custos, limites e diagnóstico. */
class PedidoIa extends Model
{
    protected $table = 'pedidos_ia';

    protected $fillable = ['user_id', 'funcionalidade', 'modelo', 'tokens_entrada', 'tokens_saida', 'duracao_ms', 'sucesso', 'erro'];

    protected $casts = [
        'sucesso' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
