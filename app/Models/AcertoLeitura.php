<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcertoLeitura extends Model
{
    protected $table = 'acertos_leitura';

    protected $fillable = [
        'cliente_id', 'leitura_real_id', 'mes_inicio', 'ano_inicio', 'consumo_real_m3', 'consumo_estimado_m3',
        'diferenca_m3', 'valor_acerto', 'estado', 'factura_id', 'credito_id', 'detalhes', 'registado_por', 'aprovado_por', 'aprovado_em',
    ];

    protected $casts = ['detalhes' => 'array', 'aprovado_em' => 'datetime'];

    public function cliente() { return $this->belongsTo(Cliente::class)->withTrashed(); }
    public function leituraReal() { return $this->belongsTo(Leitura::class, 'leitura_real_id'); }
    public function factura() { return $this->belongsTo(Factura::class); }
    public function credito() { return $this->belongsTo(Credito::class); }
    public function registadoPor() { return $this->belongsTo(User::class, 'registado_por')->withTrashed(); }
    public function aprovadoPor() { return $this->belongsTo(User::class, 'aprovado_por')->withTrashed(); }
}
