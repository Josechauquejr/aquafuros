<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Cópia de segurança (antes/depois) de uma alteração feita pelo painel do Desenvolvedor. */
class DevSnapshot extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'dev_snapshots';

    protected $fillable = ['user_id', 'acao', 'tabela', 'total', 'reversivel', 'linhas', 'resumo', 'desfeita_em', 'desfeita_por'];

    protected $casts = [
        'linhas' => 'array',
        'resumo' => 'array',
        'reversivel' => 'boolean',
        'desfeita_em' => 'datetime',
    ];

    protected static function booted(): void
    {
        // Só se acrescenta; o único campo que muda é o "desfeita".
        static::deleting(fn () => throw new \LogicException('Os snapshots não podem ser apagados.'));
    }

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
