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
            ->logOnly(['divida_anterior', 'divida_anterior_incluida', 'multa', 'total_pagar', 'estado', 'motivo_anulacao'])
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
        'divida_anterior_incluida',
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
        'divida_anterior_incluida' => 'boolean',
    ];

    /**
     * O que esta factura factura DE FACTO (consumo + multa, ou a taxa de
     * ligação), sem a dívida anterior de facturas antigas. Nas facturas
     * antigas o total_pagar incluía essa dívida (a dobrar); nas novas não.
     * Versão SQL para somas na base de dados.
     */
    public const SQL_VALOR_PROPRIO = '(CASE WHEN divida_anterior_incluida THEN total_pagar - divida_anterior ELSE total_pagar END)';

    public function valorProprio(): float
    {
        return round((float) $this->total_pagar - ($this->divida_anterior_incluida ? (float) $this->divida_anterior : 0.0), 2);
    }

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

    /** Soma dos pagamentos já registados (usa a relação se estiver carregada). */
    public function totalPago(): float
    {
        $soma = $this->relationLoaded('pagamentos')
            ? $this->pagamentos->sum('valor_pago')
            : $this->pagamentos()->sum('valor_pago');

        return round((float) $soma, 2);
    }

    /**
     * Valor que ainda falta pagar. Uma factura parcial pode ser paga várias
     * vezes, por isso o que conta é o remanescente, não o total. Paga e
     * anulada não têm nada em falta.
     */
    public function emFalta(): float
    {
        if (! in_array($this->estado, ['pendente', 'parcial'], true)) {
            return 0.0;
        }

        return max(0.0, round((float) $this->total_pagar - $this->totalPago(), 2));
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
    public function envios()
    {
        return $this->hasMany(EnvioEmail::class);
    }

    public function ultimoEnvio()
    {
        return $this->hasOne(EnvioEmail::class)->latestOfMany();
    }

    public function pagamentos(){
        return $this->hasMany(Pagamento::class);
    }
}
