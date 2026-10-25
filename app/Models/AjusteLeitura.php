<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AjusteLeitura extends Model
{
    protected $table = 'ajustes_leitura';

    protected $fillable = ['cliente_id', 'leitura_id', 'user_id', 'tipo', 'motivo', 'antes', 'depois', 'ajuste_revertido_id'];

    protected $casts = ['antes' => 'array', 'depois' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function reversao()
    {
        return $this->hasOne(self::class, 'ajuste_revertido_id');
    }

    public function ajusteRevertido()
    {
        return $this->belongsTo(self::class, 'ajuste_revertido_id');
    }
}
