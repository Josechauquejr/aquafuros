<?php

namespace App\Models;

use App\Support\Eventos;
use App\Models\Concerns\UsesHumanRouteKey;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Services\ImputacaoPagamento;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Pagamento extends Model
{
    use SoftDeletes { restore as private restoreOriginal; }
    use LogsActivity;
    use UsesHumanRouteKey;

    protected string $humanRouteKey = 'numero_recibo';

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['valor_pago', 'metodo_pagamento', 'referencia_pagamento', 'pago_em'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('pagamento')
            ->setDescriptionForEvent(
                fn (string $evento) => "Pagamento {$this->numero_recibo} foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_recibo',
        'factura_id',
        'cliente_id',
        'valor_pago',
        'metodo_pagamento',
        'referencia_pagamento',
        'pago_em',
        'lote',
        'origem_credito',
        'recebido_por',
    ];

    protected $casts = [
        'pago_em' => 'datetime',
        'origem_credito' => 'boolean',
    ];

    protected $with = ['imputacoes.factura'];

    public function save(array $options = [])
    {
        return DB::transaction(function () use ($options) {
            if (! $this->exists && $this->cliente_id && Schema::hasTable('pagamento_imputacoes')) {
                Cliente::withTrashed()->whereKey($this->cliente_id)->lockForUpdate()->firstOrFail();
            }
            return parent::save($options);
        });
    }
    public function delete() { return DB::transaction(fn () => parent::delete()); }
    public function restore() { return DB::transaction(fn () => $this->restoreOriginal()); }

    public function imputacoes() { return $this->hasMany(PagamentoImputacao::class); }

    protected static function booted(): void
    {
        static::saving(function (Pagamento $pagamento) {
            if ($pagamento->exists && $pagamento->isDirty(['valor_pago', 'factura_id', 'cliente_id'])) {
                throw \Illuminate\Validation\ValidationException::withMessages(['pagamento' => 'O valor e a factura de um recibo são imutáveis. Estorne o recibo e registe o pagamento correcto.']);
            }
        });
        // Sem data indicada, o pagamento é de agora.
        static::creating(function (Pagamento $pagamento) {
            $pagamento->pago_em ??= now();
        });
        static::created(function (Pagamento $pagamento) {
            if (Schema::hasTable('pagamento_imputacoes')) ImputacaoPagamento::aplicar($pagamento);
        });
        static::deleted(function (Pagamento $pagamento) {
            if (Schema::hasTable('pagamento_imputacoes')) ImputacaoPagamento::recalcularCliente($pagamento->cliente_id);
        });
        static::restoring(fn (Pagamento $pagamento) => ImputacaoPagamento::validarReposicao($pagamento));
        static::restored(fn (Pagamento $pagamento) => ImputacaoPagamento::recalcularCliente($pagamento->cliente_id));
    }

    public function factura()
    {
        return $this->belongsTo(Factura::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function recebidoPor()
    {
        return $this->belongsTo(User::class, 'recebido_por');
    }
}
