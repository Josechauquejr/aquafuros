<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Item do checklist de ToDos do Desenvolvedor — pessoal a cada developer.
 */
class TarefaDev extends Model
{
    protected $table = 'tarefas_dev';

    protected $fillable = ['user_id', 'titulo', 'descricao', 'concluida'];

    protected $casts = [
        'concluida' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
