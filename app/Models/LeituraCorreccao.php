<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Correcção, feita pelo administrador, a uma leitura já confirmada — com o necessário para a desfazer. */
class LeituraCorreccao extends Model
{
    protected $table = 'leitura_correccoes';

    protected $fillable = [
        'leitura_id', 'user_id', 'leitura_antes', 'leitura_depois', 'motivo',
        'factura_id', 'factura_antes', 'leitura_seguinte_id', 'leitura_seguinte_anterior_antes',
        'desfeita_em', 'desfeita_por',
    ];

    protected $casts = [
        'factura_antes' => 'array',
        'desfeita_em' => 'datetime',
    ];

    public function leitura()
    {
        return $this->belongsTo(Leitura::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
