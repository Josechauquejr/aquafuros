<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/** Porquê e por quem um mês foi isentado de multas (o estado em si vive em Configuracao). */
class IsencaoMultaMensal extends Model
{
    use LogsActivity;

    protected $table = 'isencoes_multa_mensais';

    protected $fillable = ['ano', 'mes', 'motivo', 'desactivada_por', 'desactivada_em', 'reactivada_em', 'reactivada_por'];

    protected $casts = [
        'ano' => 'integer',
        'mes' => 'integer',
        'desactivada_em' => 'datetime',
        'reactivada_em' => 'datetime',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['motivo', 'reactivada_em'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('configuracao')
            ->setDescriptionForEvent(
                fn (string $evento) => sprintf('Registo de isenção de multas de %02d/%04d foi %s', $this->mes, $this->ano, Eventos::verbo($evento)),
            );
    }

    public function autor()
    {
        return $this->belongsTo(User::class, 'desactivada_por');
    }

    public function reactivador()
    {
        return $this->belongsTo(User::class, 'reactivada_por');
    }
}
