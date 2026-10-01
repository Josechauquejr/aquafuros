<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Registo de que um caixa fechou o dia — depois de criado, esse
 * (utilizador, data) fica bloqueado para novos pagamentos. Nunca é
 * apagado nem editado, é um registo histórico do que aconteceu.
 */
class FechoCaixa extends Model
{
    use LogsActivity;

    protected $table = 'fechos_caixa';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['utilizador_id', 'data', 'total_geral', 'valor_contado', 'diferenca', 'numero_pagamentos'])
            ->useLogName('fecho_caixa')
            ->setDescriptionForEvent(
                fn () => "Fecho de caixa de {$this->data->format('d/m/Y')} confirmado",
            );
    }

    protected $fillable = [
        'utilizador_id',
        'data',
        'total_geral',
        'total_por_metodo',
        'valor_contado',
        'diferenca',
        'numero_pagamentos',
        'fechado_por',
    ];

    protected $casts = [
        'data' => 'date',
        'total_por_metodo' => 'array',
    ];

    public function utilizador()
    {
        return $this->belongsTo(User::class, 'utilizador_id');
    }

    public function fechadoPor()
    {
        return $this->belongsTo(User::class, 'fechado_por');
    }
}
