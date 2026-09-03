<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Identidade da empresa (nome, NUIT, localização, logotipo) — singleton
 * editado pelo Desenvolvedor em /dev/configuracoes, usado como padrão em
 * toda a app (cabeçalho de facturas/recibos impressos, etc.).
 */
class EmpresaPerfil extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'nuit', 'localizacao', 'logotipo_path'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('empresa_perfil');
    }

    protected $table = 'empresa_perfil';

    protected $fillable = ['nome', 'nuit', 'localizacao', 'logotipo_path'];

    /**
     * Sempre a mesma linha (id 1) — cria-a com os valores por omissão se
     * ainda não existir, para nunca haver que verificar null nos chamadores.
     */
    public static function atual(): self
    {
        return static::firstOrCreate(['id' => 1], ['nome' => 'Aquafuros']);
    }

    public function getLogotipoUrlAttribute(): ?string
    {
        return $this->logotipo_path ? Storage::disk('public')->url($this->logotipo_path) : null;
    }

    public function toArray(): array
    {
        return [
            'nome' => $this->nome,
            'nuit' => $this->nuit,
            'localizacao' => $this->localizacao,
            'logotipoUrl' => $this->logotipo_url,
        ];
    }
}
