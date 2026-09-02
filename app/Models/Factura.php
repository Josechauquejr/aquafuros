<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Factura extends Model
{
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
