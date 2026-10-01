<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Avaria, fuga, falta de água ou reclamação — do aviso à resolução, para medir o tempo de resposta. */
class Ocorrencia extends Model
{
    use SoftDeletes;

    protected $table = 'ocorrencias';

    public const TIPOS = ['sem_agua', 'fuga', 'avaria', 'contador', 'reclamacao', 'outro'];

    protected $fillable = [
        'cliente_id', 'zona_id', 'tipo', 'descricao', 'estado', 'reportada_em', 'iniciada_em',
        'resolvida_em', 'registado_por', 'resolvido_por', 'resolucao',
    ];

    protected $casts = [
        'reportada_em' => 'datetime',
        'iniciada_em' => 'datetime',
        'resolvida_em' => 'datetime',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class)->withTrashed();
    }

    public function zona()
    {
        return $this->belongsTo(Zona::class);
    }

    public function registadoPor()
    {
        return $this->belongsTo(User::class, 'registado_por')->withTrashed();
    }

    public function resolvidoPor()
    {
        return $this->belongsTo(User::class, 'resolvido_por')->withTrashed();
    }
}
