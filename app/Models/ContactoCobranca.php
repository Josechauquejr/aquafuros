<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Um contacto de cobrança feito a um cliente (chamada, visita, WhatsApp...) e o seu resultado. */
class ContactoCobranca extends Model
{
    protected $table = 'contactos_cobranca';

    public const CANAIS = ['telefone', 'presencial', 'whatsapp', 'sms', 'outro'];

    public const RESULTADOS = ['sem_resposta', 'prometeu_pagar', 'recusou', 'pagou', 'outro'];

    protected $fillable = ['cliente_id', 'user_id', 'canal', 'resultado', 'nota'];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function utilizador()
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function promessa()
    {
        return $this->hasOne(PromessaPagamento::class, 'contacto_id');
    }
}
