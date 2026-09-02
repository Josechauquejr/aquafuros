<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Leitura extends Model
{
    protected $fillable = [
        'cliente_id',
        'mes',
        'ano',
        'leitura_anterior',
        'leitura_actual',
        'confirmado',
        'registado_por'
    ];

    // Uma leitura pertence a um cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Uma leitura é registada por um utilizador
    public function registadoPor()
    {
        return $this->belongsTo(User::class, 'registado_por');
    }

    // Uma leitura pode ter uma factura associada
    public function factura()
    {
        return $this->hasOne(Factura::class);
    }

    /**
     * Indica se esta é a primeira leitura já registada para o cliente —
     * usado nos recibos/facturas impressas para não tratar a leitura
     * anterior (0) como se fosse um período real.
     */
    public function ehPrimeira(): bool
    {
        return ! static::where('cliente_id', $this->cliente_id)
            ->where('id', '!=', $this->id)
            ->where(function ($query) {
                $query->where('ano', '<', $this->ano)
                    ->orWhere(function ($query) {
                        $query->where('ano', $this->ano)->where('mes', '<', $this->mes);
                    });
            })
            ->exists();
    }

    /**
     * A leitura do período imediatamente anterior deste mesmo cliente —
     * usada para mostrar o consumo do mês anterior nas facturas impressas.
     */
    public function anterior(): ?self
    {
        return static::where('cliente_id', $this->cliente_id)
            ->where('id', '!=', $this->id)
            ->where(function ($query) {
                $query->where('ano', '<', $this->ano)
                    ->orWhere(function ($query) {
                        $query->where('ano', $this->ano)->where('mes', '<', $this->mes);
                    });
            })
            ->orderByDesc('ano')
            ->orderByDesc('mes')
            ->first();
    }

    public function consumo(): float
    {
        return max(0, (float) $this->leitura_actual - (float) $this->leitura_anterior);
    }
}
