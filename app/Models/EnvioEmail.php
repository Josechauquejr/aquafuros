<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Registo de uma factura enviada (ou que falhou ao enviar) por email a um cliente. */
class EnvioEmail extends Model
{
    protected $table = 'envios_email';

    protected $fillable = ['factura_id', 'cliente_id', 'email', 'estado', 'erro', 'enviado_por'];

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }

    public function enviadoPor()
    {
        return $this->belongsTo(User::class, 'enviado_por')->withTrashed();
    }
}
