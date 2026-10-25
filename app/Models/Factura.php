<?php

namespace App\Models;

use App\Support\Eventos;
use App\Models\Concerns\UsesHumanRouteKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Factura extends Model
{
    use SoftDeletes;
    use LogsActivity;
    use UsesHumanRouteKey;

    protected string $humanRouteKey = 'numero_factura';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['divida_anterior', 'divida_anterior_incluida', 'multa', 'multa_anterior', 'valor_acerto_leitura', 'total_pagar', 'estado', 'motivo_anulacao'])
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
        'leitura_estimada_id',
        'tipo',
        'mes',
        'ano',
        'data_vencimento',
        'valor_consumo',
        'consumo_m3',
        'valor_acerto_leitura',
        'divida_anterior',
        'divida_anterior_incluida',
        'transferida_para_id',
        'multa',
        'multa_anterior',
        'total_pagar',
        'estado',
        'gerada_por',
        'motivo_anulacao',
        'anulada_por',
        'anulada_em',
        'emissao_original',
        'saldo_inicial',
    ];

    protected $casts = [
        'data_vencimento' => 'date',
        'anulada_em' => 'datetime',
        'divida_anterior_incluida' => 'boolean',
        'emissao_original' => 'array',
        'consumo_m3' => 'decimal:2',
        'valor_acerto_leitura' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $factura) {
            if (! Schema::hasColumn('facturas', 'emissao_original')) return;
            if ($factura->emissao_original === null) {
                $factura->emissao_original = array_merge([
                    'valor_consumo' => 0, 'multa' => 0, 'multa_anterior' => 0,
                    'divida_anterior' => 0, 'divida_anterior_incluida' => false,
                    'saldo_inicial' => 0, 'total_pagar' => 0,
                ], $factura->getAttributes());
            }
        });
    }

    /**
     * O que esta factura factura DE FACTO (consumo + multa, ou a taxa de
     * ligação), sem a dívida anterior de facturas antigas. Nas facturas
     * antigas o total_pagar incluía essa dívida (a dobrar); nas novas não.
     * Versão SQL para somas na base de dados.
     */
    public const SQL_VALOR_PROPRIO = '(CASE WHEN divida_anterior_incluida THEN total_pagar - divida_anterior - multa_anterior ELSE total_pagar END)';

    public function valorProprio(): float
    {
        return round((float) $this->total_pagar - ($this->divida_anterior_incluida ? (float) $this->divida_anterior + (float) $this->multa_anterior : 0.0), 2);
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
        if (! $this->relationLoaded('pagamentos') && array_key_exists('pagamentos_sum_valor_pago', $this->getAttributes())) {
            return round((float) $this->pagamentos_sum_valor_pago, 2);
        }
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

    /** Multa de atraso apresentada ao caixa, calculada uma única vez sobre o principal em aberto. */
    public function multaAtrasoPrevista(): float
    {
        if (! in_array($this->estado, ['pendente', 'parcial'], true)
            || ! $this->data_vencimento
            || $this->data_vencimento->toDateString() >= now()->toDateString()
            || (float) $this->multa > 0
            || ($this->emissao_original === null && (float) $this->multa_anterior > 0)) {
            return 0.0;
        }

        $tarifa = $this->cliente?->tarifa;
        if (! $tarifa) {
            return 0.0;
        }

        // Os pagamentos são imputados primeiro ao principal; a multa não capitaliza.
        $principal = $this->principalEmFalta();
        if ($principal <= 0) {
            return 0.0;
        }

        return round($principal * (float) $tarifa->percentagem_multa, 2);
    }

    /** Multas já registadas que ainda não foram pagas; as parcelas pagam primeiro o principal. */
    public function multaEmFalta(): float
    {
        $multa = (float) $this->multa + (float) $this->multa_anterior;
        $this->loadMissing('pagamentos');
        $principal = max(0, (float) $this->total_pagar - $multa);
        $principalPago = $this->pagamentos->sum(fn ($p) => (float) ($p->valor_principal ?? $p->valor_pago));
        $multaPaga = $this->pagamentos->sum(fn ($p) => (float) ($p->valor_multa ?? 0)) + max(0, $principalPago - $principal);
        return max(0, round($multa - $multaPaga, 2));
    }

    public function principalEmFalta(): float
    {
        $this->loadMissing('pagamentos');
        $pago = $this->pagamentos->sum(fn ($p) => (float) ($p->valor_principal ?? $p->valor_pago));
        return max(0, round((float) $this->total_pagar - (float) $this->multa - (float) $this->multa_anterior - $pago, 2));
    }

    public function origensSaldo()
    {
        return $this->belongsToMany(self::class, 'factura_saldos', 'factura_id', 'origem_id');
    }

    public function prepararDocumento(): self
    {
        $this->cobranca = app(\App\Services\CobrancaFactura::class)->resumo($this);
        return $this;
    }

    public function registarMultaAtraso(): float
    {
        $multa = $this->multaAtrasoPrevista();
        if ($multa <= 0) {
            return 0.0;
        }

        $this->multa = round((float) $this->multa + $multa, 2);
        $this->total_pagar = round((float) $this->total_pagar + $multa, 2);
        $this->save();

        return $multa;
    }

    public function facturaSeguinte()
    {
        return $this->belongsTo(self::class, 'transferida_para_id');
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

    public function leituraEstimada()
    {
        return $this->belongsTo(LeituraEstimada::class, 'leitura_estimada_id');
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
        return $this->hasOne(EnvioEmail::class)->where('tipo', 'factura')->latestOfMany();
    }

    public function pagamentos(){
        $modelo = app()->runningInConsole() && ! Schema::hasTable('pagamento_imputacoes') ? Pagamento::class : PagamentoAplicado::class;
        return $this->hasMany($modelo, 'factura_id');
    }
}
