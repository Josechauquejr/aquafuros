<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cliente extends Model
{
    use SoftDeletes;

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
