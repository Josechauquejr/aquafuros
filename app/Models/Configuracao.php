<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Configurações de negócio editáveis a partir da interface (ex.: a taxa de
 * ligação de novo contrato), guardadas como pares chave/valor em vez de
 * espalhadas em ficheiros de config — para poderem ser alteradas sem
 * precisar de acesso ao servidor.
 */
class Configuracao extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['valor'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('configuracao')
            ->setDescriptionForEvent(
                fn (string $evento) => "Configuração \"{$this->chave}\" foi " . Eventos::verbo($evento),
            );
    }

    protected $table = 'configuracoes';

    protected $fillable = ['chave', 'valor'];

    protected $casts = [
        'valor' => 'decimal:2',
    ];

    public static function valor(string $chave, float $omissao = 0.0): float
    {
        return (float) (static::where('chave', $chave)->value('valor') ?? $omissao);
    }

    public static function definir(string $chave, float $valor): void
    {
        static::updateOrCreate(['chave' => $chave], ['valor' => $valor]);
    }
}
