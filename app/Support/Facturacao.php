<?php

namespace App\Support;

use App\Models\Configuracao;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Cliente;
use App\Models\LeituraEstimada;
use App\Models\AcertoLeitura;
use App\Services\BillingService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Emissão de facturas a partir de leituras confirmadas. */
class Facturacao
{
    public static function emitir(Leitura $leitura, int $geradaPor): Factura
    {
        return DB::transaction(function () use ($leitura, $geradaPor) {
        // Mantém a ordem de bloqueio usada pelo fluxo de leituras: cliente,
        // depois leitura. A restrição única na base de dados é a última defesa.
        $cliente = Cliente::with('tarifa')->lockForUpdate()->findOrFail($leitura->cliente_id);
        $leitura = Leitura::whereKey($leitura->id)->lockForUpdate()->firstOrFail();

        // Facturas anuladas continuam a ocupar a leitura para preservar o
        // histórico e impedir que uma reexecução crie uma segunda factura.
        if (Factura::withTrashed()->where('leitura_id', $leitura->id)->exists()) {
            throw ValidationException::withMessages([
                'leitura_id' => 'Esta leitura já está associada a uma factura, inclusive anulada.',
            ]);
        }

        $anteriores = Factura::where('cliente_id', $cliente->id)
            ->whereIn('estado', ['pendente', 'parcial'])
            ->lockForUpdate()->get();

        // Cada multa permanece na factura vencida que lhe deu origem.
        foreach ($anteriores as $anterior) {
            $anterior->loadMissing('cliente.tarifa');
            $anterior->registarMultaAtraso();
        }

        $calculo = app(BillingService::class)->calcular($leitura, $cliente);
        $acertos = self::acertosPendentes($cliente->id, (int) $leitura->mes, (int) $leitura->ano);
        $valorAcertos = round((float) $acertos->sum('valor_acerto'), 2);
        $factura = Factura::create([
            'numero_factura' => self::proximoNumero($leitura->ano, $leitura->mes),
            'cliente_id' => $leitura->cliente_id,
            'leitura_id' => $leitura->id,
            'tipo' => 'consumo',
            'mes' => $leitura->mes,
            'ano' => $leitura->ano,
            // Prazo em dias corridos após a emissão (Tarifas > Prazos e limites; 15 por omissão).
            'data_vencimento' => now()->addDays((int) Configuracao::valor('dias_vencimento', 15))->toDateString(),
            'valor_consumo' => $calculo['valor_consumo'],
            'consumo_m3' => $calculo['consumo_m3'],
            'valor_acerto_leitura' => $valorAcertos,
            'divida_anterior' => $calculo['divida_anterior'],
            'divida_anterior_incluida' => false,
            'multa' => $calculo['multa'],
            'multa_anterior' => 0,
            'total_pagar' => round($calculo['total_pagar'] + $valorAcertos, 2),
            'estado' => 'pendente',
            'gerada_por' => $geradaPor,
            'emissao_original' => [
                'valor_consumo' => $calculo['valor_consumo'],
                'divida_anterior' => $calculo['divida_anterior'],
                'divida_anterior_incluida' => true,
                'multa_anterior' => $calculo['multa_anterior'],
                'multa' => $calculo['multa'],
                'total_pagar' => round($calculo['total_emitido'] + $valorAcertos, 2),
                'valor_acerto_leitura' => $valorAcertos,
                'pagamentos_anteriores_ids' => $cliente->pagamentos()->pluck('id')->all(),
                'tarifa' => [
                    'id' => $cliente->tarifa->id,
                    'nome' => $cliente->tarifa->nome,
                    'preco_m3' => (float) $cliente->tarifa->preco_m3,
                    'taxa_minima' => (float) $cliente->tarifa->taxa_minima,
                    'consumo_minimo_m3' => (float) $cliente->tarifa->consumo_minimo_m3,
                ],
            ],
        ]);
        self::marcarAcertosFacturados($acertos, $factura);
        $factura->origensSaldo()->sync($cliente->facturas()->where('id', '!=', $factura->id)->where('estado', '!=', 'anulada')->pluck('id'));

        return $factura;
        });
    }

    public static function emitirEstimativa(LeituraEstimada $estimativa, int $geradaPor): Factura
    {
        return DB::transaction(function () use ($estimativa, $geradaPor) {
            $cliente = Cliente::with('tarifa')->lockForUpdate()->findOrFail($estimativa->cliente_id);
            $estimativa = LeituraEstimada::whereKey($estimativa->id)->lockForUpdate()->firstOrFail();
            if ($estimativa->estado !== 'confirmada') {
                throw ValidationException::withMessages(['estimativa' => 'Só é possível facturar uma estimativa confirmada.']);
            }
            if (Factura::withTrashed()->where('leitura_estimada_id', $estimativa->id)->exists()) {
                throw ValidationException::withMessages(['estimativa' => 'Esta estimativa já tem factura, inclusive anulada.']);
            }

            $anteriores = Factura::where('cliente_id', $cliente->id)->whereIn('estado', ['pendente', 'parcial'])->lockForUpdate()->get();
            foreach ($anteriores as $anterior) {
                $anterior->loadMissing('cliente.tarifa');
                $anterior->registarMultaAtraso();
            }

            $calculo = app(BillingService::class)->calcularParaConsumo((float) $estimativa->consumo_m3, $cliente);
        $acertos = self::acertosPendentes($cliente->id, (int) $estimativa->mes, (int) $estimativa->ano);
            $valorAcertos = round((float) $acertos->sum('valor_acerto'), 2);
            $tarifa = $cliente->tarifa;
            $factura = Factura::create([
                'numero_factura' => self::proximoNumero($estimativa->ano, $estimativa->mes),
                'cliente_id' => $cliente->id,
                'leitura_estimada_id' => $estimativa->id,
                'tipo' => 'consumo_estimado',
                'mes' => $estimativa->mes,
                'ano' => $estimativa->ano,
                'data_vencimento' => now()->addDays((int) Configuracao::valor('dias_vencimento', 15))->toDateString(),
                'consumo_m3' => $calculo['consumo_m3'],
                'valor_consumo' => $calculo['valor_consumo'],
                'valor_acerto_leitura' => $valorAcertos,
                'divida_anterior' => $calculo['divida_anterior'],
                'divida_anterior_incluida' => false,
                'multa' => 0,
                'multa_anterior' => 0,
                'total_pagar' => round($calculo['total_pagar'] + $valorAcertos, 2),
                'estado' => 'pendente',
                'gerada_por' => $geradaPor,
                'emissao_original' => [
                    'valor_consumo' => $calculo['valor_consumo'],
                    'consumo_m3' => $calculo['consumo_m3'],
                    'valor_acerto_leitura' => $valorAcertos,
                    'divida_anterior' => $calculo['divida_anterior'],
                    'divida_anterior_incluida' => true,
                    'multa_anterior' => $calculo['multa_anterior'],
                    'multa' => 0,
                    'total_pagar' => round($calculo['total_emitido'] + $valorAcertos, 2),
                    'estimativa' => ['id' => $estimativa->id, 'metodo' => $estimativa->metodo, 'leituras_base' => $estimativa->leituras_base],
                    'tarifa' => $tarifa ? [
                        'id' => $tarifa->id, 'nome' => $tarifa->nome, 'preco_m3' => (float) $tarifa->preco_m3,
                        'taxa_minima' => (float) $tarifa->taxa_minima, 'consumo_minimo_m3' => (float) $tarifa->consumo_minimo_m3,
                    ] : null,
                ],
            ]);
            $estimativa->update(['estado' => 'facturada']);
            self::marcarAcertosFacturados($acertos, $factura);
            $factura->origensSaldo()->sync($cliente->facturas()->where('id', '!=', $factura->id)->where('estado', '!=', 'anulada')->pluck('id'));

            return $factura;
        });
    }

    private static function acertosPendentes(int $clienteId, int $mes, int $ano): Collection
    {
        return AcertoLeitura::where('cliente_id', $clienteId)->where('estado', 'por_facturar')
            ->whereHas('leituraReal', fn ($q) => $q->where(fn ($q) => $q->where('ano', '<', $ano)->orWhere(fn ($q) => $q->where('ano', $ano)->where('mes', '<', $mes))))
            ->lockForUpdate()->get();
    }

    private static function marcarAcertosFacturados(Collection $acertos, Factura $factura): void
    {
        foreach ($acertos as $acerto) {
            $acerto->update(['estado' => 'facturado', 'factura_id' => $factura->id]);
        }
    }

    public static function proximoNumero(int $ano, int $mes): string
    {
        // withTrashed(): uma factura anulada e movida para a lixeira ainda
        // ocupa o número — ignorá-la geraria um número duplicado.
        return NumeracaoDocumentos::proximoNumero(
            sprintf('FAT-%04d%02d', $ano, $mes),
            Factura::withTrashed()->where('numero_factura', 'like', sprintf('FAT-%04d%02d-', $ano, $mes).'%'),
            'numero_factura',
            sprintf('FAT-%04d%02d-', $ano, $mes).'%04d',
        );
    }

    public static function facturarAoConfirmar(): bool
    {
        return Configuracao::ligado('email_facturar_ao_confirmar', true);
    }

    /** Emite facturas automaticamente quando uma leitura é confirmada, se a opção estiver activa. */
    public static function aoConfirmar(Collection $leituras, int $userId): Collection
    {
        if (! self::facturarAoConfirmar()) {
            return collect();
        }

        $emitidas = DB::transaction(function () use ($leituras, $userId) {
            return Leitura::with('cliente.tarifa', 'factura')->whereIn('id', $leituras->pluck('id'))->get()
                ->filter(fn (Leitura $l) => ! $l->factura
                    && $l->cliente?->tarifa
                    && ! Factura::withTrashed()->where('leitura_id', $l->id)->exists())
                ->sortBy(fn (Leitura $l) => $l->ano * 100 + $l->mes) // do mais antigo para o mais recente: a dívida anterior sai certa
                ->map(fn (Leitura $l) => self::emitir($l, $userId))
                ->values();
        });

        return $emitidas;
    }
}
