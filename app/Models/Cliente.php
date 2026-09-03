<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Cliente extends Model
{
    use SoftDeletes;
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'endereco', 'telefone', 'bairro', 'tarifa_id', 'estado'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('cliente')
            ->setDescriptionForEvent(
                fn (string $evento) => "Cliente {$this->nome} ({$this->numero_cliente}) foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_cliente',
        'nome',
        'endereco',
        'telefone',
        'bairro',
        'tarifa_id',
        'estado',
        'data_adesao'
    ];

    // Um cliente pertence a uma tarifa
    public function tarifa()
    {
        return $this->belongsTo(Tarifa::class);
    }

    // Um cliente pode ter muitas leituras
    public function leituras()
    {
        return $this->hasMany(Leitura::class);
    }

    // Um cliente pode ter muitas facturas
    public function facturas()
    {
        return $this->hasMany(Factura::class);
    }

    // Um cliente pode ter muitos pagamentos
    public function pagamentos(){
        return $this->hasMany(Pagamento::class);
    }

    public function divida(){
        return $this->hasOne(Divida::class);
    }
    
}
