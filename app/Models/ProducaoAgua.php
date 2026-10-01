<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Água captada/bombeada num mês (por zona, ou no sistema todo se não houver zona) — base das perdas de água. */
class ProducaoAgua extends Model
{
    protected $table = 'producoes_agua';

    protected $fillable = ['zona_id', 'mes', 'ano', 'volume_m3', 'registado_por'];

    public function zona()
    {
        return $this->belongsTo(Zona::class);
    }

    public function registadoPor()
    {
        return $this->belongsTo(User::class, 'registado_por')->withTrashed();
    }
}
