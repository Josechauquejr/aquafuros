<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Uma excepção reportada pela aplicação (ver bootstrap/app.php →
 * withExceptions). Sem `updated_at`, excepto o campo `resolvido` que o
 * Desenvolvedor pode marcar depois de investigar.
 */
class ErroSistema extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'erros_sistema';

    protected $fillable = ['mensagem', 'excepcao', 'ficheiro', 'linha', 'url', 'metodo', 'user_id', 'trace', 'resolvido'];

    protected $casts = [
        'resolvido' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
