<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Leitura extends Model
{
    use SoftDeletes;
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['leitura_actual', 'confirmado', 'motivo_anulacao'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('leitura')
            ->setDescriptionForEvent(
                fn (string $evento) => "Leitura de {$this->mes}/{$this->ano} foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'cliente_id',
        'mes',
        'ano',
        'leitura_anterior',
        'leitura_actual',
        'confirmado',
        'confirmado_por',
        'confirmado_em',
        'registado_por',
        'motivo_anulacao',
        'anulada_por',
        'anulada_em',
    ];

    protected $casts = [
        'confirmado' => 'boolean',
        'confirmado_em' => 'datetime',
        'anulada_em' => 'datetime',
    ];

    // Uma leitura pertence a um cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Uma leitura é registada por um utilizador
    public function registadoPor()
    {
        return $this->belongsTo(User::class, 'registado_por');
    }

    // Uma leitura pode ter uma factura associada
    public function factura()
    {
        return $this->hasOne(Factura::class);
    }

    // A correcção mais recente ainda por desfazer (só o administrador corrige leituras confirmadas).
    public function correccaoActiva()
    {
        return $this->hasOne(LeituraCorreccao::class)->whereNull('desfeita_em')->latestOfMany();
    }

    /**
     * Indica se esta é a primeira leitura já registada para o cliente —
     * usado nos recibos/facturas impressas para não tratar a leitura
     * anterior (0) como se fosse um período real.
     */
    public function ehPrimeira(): bool
    {
        return ! static::where('cliente_id', $this->cliente_id)
            ->where('id', '!=', $this->id)
            ->where(function ($query) {
                $query->where('ano', '<', $this->ano)
                    ->orWhere(function ($query) {
                        $query->where('ano', $this->ano)->where('mes', '<', $this->mes);
                    });
            })
            ->exists();
    }

    /**
     * A leitura do período imediatamente anterior deste mesmo cliente —
     * usada para mostrar o consumo do mês anterior nas facturas impressas.
     */
    public function anterior(): ?self
    {
        return static::where('cliente_id', $this->cliente_id)
            ->where('id', '!=', $this->id)
            ->where(function ($query) {
                $query->where('ano', '<', $this->ano)
                    ->orWhere(function ($query) {
                        $query->where('ano', $this->ano)->where('mes', '<', $this->mes);
                    });
            })
            ->orderByDesc('ano')
            ->orderByDesc('mes')
            ->first();
    }

    public function consumo(): float
    {
        return max(0, (float) $this->leitura_actual - (float) $this->leitura_anterior);
    }
}
