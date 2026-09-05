<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Pagamento extends Model
{
    use SoftDeletes;
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['valor_pago', 'metodo_pagamento', 'referencia_pagamento'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pagamento')
            ->setDescriptionForEvent(
                fn (string $evento) => "Pagamento {$this->numero_recibo} foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_recibo',
        'factura_id',
        'cliente_id',
        'valor_pago',
        'metodo_pagamento',
        'referencia_pagamento',
        'recebido_por',
    ];

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function recebidoPor()
    {
        return $this->belongsTo(User::class, 'recebido_por');
    }
}
