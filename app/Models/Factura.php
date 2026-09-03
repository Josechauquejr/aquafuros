<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Factura extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['divida_anterior', 'multa', 'total_pagar', 'estado'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('factura')
            ->setDescriptionForEvent(
                fn (string $evento) => "Factura {$this->numero_factura} foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_factura',
        'cliente_id',
        'leitura_id',
        'tipo',
        'mes',
        'ano',
        'valor_consumo',
        'divida_anterior',
        'multa',
        'total_pagar',
        'estado',
        'gerada_por',
    ];

    // Uma factura pertence a um cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Uma factura pode estar associada a uma leitura
    public function leitura()
    {
        return $this->belongsTo(Leitura::class);
    }

    public function geradaPor()
    {
        return $this->belongsTo(User::class, 'gerada_por');
    }

    // Uma factura pode ter muitos pagamentos
    public function pagamentos(){
        return $this->hasMany(Pagamento::class);
    }
}
