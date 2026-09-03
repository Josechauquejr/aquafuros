<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Tarifa extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'preco_m3', 'taxa_minima', 'consumo_minimo_m3', 'percentagem_multa', 'limiar_corte', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('tarifa')
            ->setDescriptionForEvent(
                fn (string $evento) => "Tarifa {$this->nome} foi " . Eventos::verbo($evento),
            );
    }

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
