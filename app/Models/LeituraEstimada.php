<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeituraEstimada extends Model
{
    protected $table = 'leituras_estimadas';

    protected $fillable = [
        'cliente_id', 'mes', 'ano', 'consumo_m3', 'metodo', 'leituras_base', 'motivo', 'estado',
        'registado_por', 'confirmado_por', 'confirmado_em', 'reconciliada_por_leitura_id',
        'cancelado_por', 'cancelado_em', 'motivo_cancelamento',
    ];

    protected $casts = [
        'consumo_m3' => 'decimal:2',
        'leituras_base' => 'array',
        'confirmado_em' => 'datetime',
        'cancelado_em' => 'datetime',
    ];

    public function cliente() { return $this->belongsTo(Cliente::class)->withTrashed(); }
    public function registadoPor() { return $this->belongsTo(User::class, 'registado_por')->withTrashed(); }
    public function confirmadoPor() { return $this->belongsTo(User::class, 'confirmado_por')->withTrashed(); }
    public function canceladoPor() { return $this->belongsTo(User::class, 'cancelado_por')->withTrashed(); }
    public function factura() { return $this->hasOne(Factura::class, 'leitura_estimada_id'); }
    public function leituraReal() { return $this->belongsTo(Leitura::class, 'reconciliada_por_leitura_id'); }
}
