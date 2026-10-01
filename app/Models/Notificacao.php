<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Mensagem a enviar a um cliente (lembrete de vencimento, aviso de atraso). Fica numa fila até ser enviada. */
class Notificacao extends Model
{
    protected $table = 'notificacoes';

    protected $fillable = ['cliente_id', 'factura_id', 'tipo', 'canal', 'email', 'telefone', 'mensagem', 'estado', 'enviada_em', 'erro'];

    protected $casts = ['enviada_em' => 'datetime'];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function factura()
    {
        return $this->belongsTo(Factura::class)->withTrashed();
    }
}
