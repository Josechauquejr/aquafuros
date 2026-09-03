<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Funcionalidade extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['activa'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('funcionalidade')
            ->setDescriptionForEvent(
                fn (string $evento) => "Secção \"{$this->nome}\" foi " . ($this->activa ? 'activada' : 'desactivada'),
            );
    }

    protected $fillable = ['chave', 'nome', 'activa'];

    protected $casts = [
        'activa' => 'boolean',
    ];
}
