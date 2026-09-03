<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Um pedido autenticado registado pelo middleware RegistarAcesso — quem,
 * quando, o quê (URL/método), e de onde (IP/user-agent). Sem `updated_at`:
 * cada linha é escrita uma única vez e nunca alterada.
 */
class AcessoSistema extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'acessos_sistema';

    protected $fillable = ['user_id', 'url', 'metodo', 'ip', 'user_agent', 'status_code', 'duracao_ms', 'tempo_bd_ms'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
