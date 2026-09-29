<?php

namespace App\Models;

use App\Support\Eventos;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Cliente extends Model
{
    use SoftDeletes;
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'endereco', 'telefone', 'bairro', 'tarifa_id', 'estado'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('cliente')
            ->setDescriptionForEvent(
                fn (string $evento) => "Cliente {$this->nome} ({$this->numero_cliente}) foi " . Eventos::verbo($evento),
            );
    }

    protected $fillable = [
        'numero_cliente',
        'nome',
        'endereco',
        'telefone',
        'bairro',
        'tarifa_id',
        'estado',
        'data_adesao'
    ];

    // Um cliente pertence a uma tarifa
    public function tarifa()
    {
        return $this->belongsTo(Tarifa::class);
    }

    // Um cliente pode ter muitas leituras
    public function leituras()
    {
        return $this->hasMany(Leitura::class);
    }

    // Um cliente pode ter muitas facturas
    public function facturas()
    {
        return $this->hasMany(Factura::class);
    }

    // Um cliente pode ter muitos pagamentos
    public function pagamentos(){
        return $this->hasMany(Pagamento::class);
    }

    public function divida(){
        return $this->hasOne(Divida::class);
    }

    /**
     * Saldo total em aberto (facturas pendentes/parciais, vencidas ou não) —
     * sempre calculado a partir das facturas actuais, nunca um valor
     * guardado que só actualizava quando havia um pagamento (por isso um
     * cliente com facturas por pagar mas nenhum pagamento feito mostrava
     * sempre dívida 0,00). Usado como "dívida anterior" ao gerar uma nova
     * factura e como o total "em aberto" mostrado ao utilizador.
     */
    public function saldoEmAberto(): float
    {
        $facturas = $this->facturas()
            ->whereIn('estado', ['pendente', 'parcial'])
            ->with('pagamentos')
            ->get();

        return round(
            $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - $f->pagamentos->sum('valor_pago'))),
            2,
        );
    }

    /**
     * Só a parte do saldo em aberto que já passou da data de vencimento —
     * a que conta para a regra de corte e para os alertas de "em atraso".
     * Uma factura recém-emitida (ainda dentro do prazo) faz parte do saldo
     * em aberto, mas não desta dívida.
     */
    public function dividaEmAtraso(): array
    {
        $vencidas = $this->facturas()
            ->whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->with('pagamentos')
            ->get();

        $valor = round(
            $vencidas->sum(fn ($f) => max(0, (float) $f->total_pagar - $f->pagamentos->sum('valor_pago'))),
            2,
        );

        return [
            'valor' => $valor,
            'facturas_vencidas' => $vencidas->count(),
            'em_corte' => $this->tarifa && $valor >= (float) $this->tarifa->limiar_corte,
        ];
    }

    /**
     * Soma da dívida em atraso (facturas vencidas) de todos os clientes,
     * numa única consulta agregada — usada no cartão "Dívida total em
     * atraso" dos dashboards, em vez de Cliente::dividaEmAtraso() por
     * cliente (que seria uma consulta por cliente).
     */
    public static function dividaTotalEmAtraso(): float
    {
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar']);

        return round(
            $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))),
            2,
        );
    }

    /**
     * Os clientes com maior dívida em atraso (facturas vencidas), para o
     * painel "Maiores devedores". Mantém a forma {cliente, valor_divida,
     * em_corte} que os dashboards já esperavam da tabela dividas, mas
     * calculada a partir das facturas actuais.
     */
    public static function maioresDevedores(int $limite): \Illuminate\Support\Collection
    {
        $porCliente = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar'])
            ->groupBy('cliente_id')
            ->map(fn ($facturas) => round(
                $facturas->sum(fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0))),
                2,
            ))
            ->filter(fn ($valor) => $valor > 0)
            ->sortDesc()
            ->take($limite);

        $clientes = static::withTrashed()->with('tarifa')->whereIn('id', $porCliente->keys())->get()->keyBy('id');

        return $porCliente->map(function ($valor, $clienteId) use ($clientes) {
            $cliente = $clientes->get($clienteId);

            return (object) [
                'cliente' => $cliente,
                'valor_divida' => $valor,
                'em_corte' => (bool) ($cliente?->tarifa && $valor >= (float) $cliente->tarifa->limiar_corte),
            ];
        })->values();
    }
}
