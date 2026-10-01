<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Registo de uma factura enviada (ou que falhou ao enviar) por email a um cliente. */
class EnvioEmail extends Model
{
    protected $table = 'envios_email';

    protected $fillable = ['factura_id', 'cliente_id', 'tipo', 'origem', 'email', 'assunto', 'estado', 'tentativas', 'erro', 'anexos', 'corpo', 'enviado_por'];

    protected $casts = ['anexos' => 'array', 'tentativas' => 'integer'];

    public function factura()
    {
        return $this->belongsTo(Factura::class)->withTrashed();
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function enviadoPor()
    {
        return $this->belongsTo(User::class, 'enviado_por')->withTrashed();
    }
}
