<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Factura extends Model
{
    use SoftDeletes;
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['divida_anterior', 'multa', 'total_pagar', 'estado', 'motivo_anulacao'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('factura')
            ->setDescriptionForEvent(
                fn (string $evento) => "Factura {$this->numero_factura} foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_factura',
        'cliente_id',
        'leitura_id',
        'tipo',
        'mes',
        'ano',
        'data_vencimento',
        'valor_consumo',
        'divida_anterior',
        'multa',
        'total_pagar',
        'estado',
        'gerada_por',
        'motivo_anulacao',
        'anulada_por',
        'anulada_em',
    ];

    protected $casts = [
        'data_vencimento' => 'date',
        'anulada_em' => 'datetime',
    ];

    protected $appends = ['esta_vencida'];

    /**
     * "Vencida" nunca é guardado como estado — é sempre calculado a partir
     * da data de vencimento, para nunca desincronizar (não depende de uma
     * tarefa agendada a correr todos os dias). Só pendente/parcial podem
     * estar vencidas; paga e anulada não têm significado de atraso.
     */
    public function getEstaVencidaAttribute(): bool
    {
        return in_array($this->estado, ['pendente', 'parcial'], true)
            && $this->data_vencimento !== null
            && $this->data_vencimento->isPast();
    }

    // Uma factura pertence a um cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Uma factura pode estar associada a uma leitura
    public function leitura()
    {
        return $this->belongsTo(Leitura::class);
    }

    public function geradaPor()
    {
        return $this->belongsTo(User::class, 'gerada_por');
    }

    public function anuladaPor()
    {
        return $this->belongsTo(User::class, 'anulada_por');
    }

    // Uma factura pode ter muitos pagamentos
    public function pagamentos(){
        return $this->hasMany(Pagamento::class);
    }
}
