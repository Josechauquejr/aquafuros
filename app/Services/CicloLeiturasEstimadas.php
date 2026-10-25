<?php

namespace App\Services;

use App\Models\AcertoLeitura;
use App\Models\Cliente;
use App\Models\Credito;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\LeituraEstimada;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CicloLeiturasEstimadas
{
    public function prever(int $clienteId, int $mes, int $ano): array
    {
        $cliente = Cliente::findOrFail($clienteId);
        $periodoActual = (int) now()->format('Ym');
        if (($ano * 100 + $mes) > $periodoActual) {
            throw ValidationException::withMessages(['periodo' => 'Não é possível estimar um período futuro.']);
        }
        $existeLeitura = Leitura::where('cliente_id', $clienteId)->where('mes', $mes)->where('ano', $ano)->exists();
        $existeEstimativa = LeituraEstimada::where('cliente_id', $clienteId)->where('mes', $mes)->where('ano', $ano)->exists();
        $temLeituraPosterior = Leitura::where('cliente_id', $clienteId)
            ->where(fn ($q) => $q->where('ano', '>', $ano)->orWhere(fn ($q) => $q->where('ano', $ano)->where('mes', '>', $mes)))
            ->exists();
        $temEstimativaPosterior = LeituraEstimada::where('cliente_id', $clienteId)
            ->where(fn ($q) => $q->where('ano', '>', $ano)->orWhere(fn ($q) => $q->where('ano', $ano)->where('mes', '>', $mes)))
            ->exists();
        if ($temLeituraPosterior || $temEstimativaPosterior) {
            throw ValidationException::withMessages(['periodo' => 'Registe as estimativas em ordem cronológica e antes da próxima leitura real.']);
        }
        if ($existeLeitura || $existeEstimativa) {
            throw ValidationException::withMessages(['periodo' => 'Já existe uma leitura real ou estimada para este período.']);
        }

        $leituras = Leitura::where('cliente_id', $clienteId)->where('confirmado', true)
            ->where(fn ($q) => $q->where('ano', '<', $ano)->orWhere(fn ($q) => $q->where('ano', $ano)->where('mes', '<', $mes)))
            ->orderByDesc('ano')->orderByDesc('mes')->limit(3)->get();
        $leiturasBase = $leituras->map(fn (Leitura $leitura) => [
            'leitura_id' => $leitura->id,
            'mes' => (int) $leitura->mes,
            'ano' => (int) $leitura->ano,
            'consumo_m3' => round($leitura->consumo(), 2),
        ])->values();
        $media = $leituras->count() === 3
            ? round((float) $leituras->avg(fn (Leitura $leitura) => $leitura->consumo()), 2)
            : null;

        return [
            'cliente' => ['id' => $cliente->id, 'nome' => $cliente->nome, 'numero_cliente' => $cliente->numero_cliente],
            'mes' => $mes,
            'ano' => $ano,
            'leituras_base' => $leiturasBase,
            'media_m3' => $media,
            'pode_estimar_automaticamente' => $media !== null && $media > 0,
            'consumo_manual_necessario' => $media === null || $media <= 0,
        ];
    }

    public function registar(array $dados, int $userId): LeituraEstimada
    {
        return DB::transaction(function () use ($dados, $userId) {
            Cliente::whereKey($dados['cliente_id'])->lockForUpdate()->firstOrFail();
            $preview = $this->prever((int) $dados['cliente_id'], (int) $dados['mes'], (int) $dados['ano']);
            $manual = array_key_exists('consumo_m3', $dados) && $dados['consumo_m3'] !== null;
            if (! $preview['pode_estimar_automaticamente'] && ! $manual) {
                throw ValidationException::withMessages(['consumo_m3' => 'São necessárias três leituras reais para calcular a média. Indique um consumo manual e o motivo.']);
            }
            if ($manual && blank($dados['motivo'] ?? null)) {
                throw ValidationException::withMessages(['motivo' => 'Indique o motivo da estimativa manual.']);
            }

            return LeituraEstimada::create([
                'cliente_id' => $dados['cliente_id'],
                'mes' => $dados['mes'],
                'ano' => $dados['ano'],
                'consumo_m3' => $manual ? $dados['consumo_m3'] : $preview['media_m3'],
                'metodo' => $manual ? 'manual' : 'media_real',
                'leituras_base' => $manual ? $preview['leituras_base'] : $preview['leituras_base']->all(),
                'motivo' => $dados['motivo'] ?? null,
                'estado' => 'pendente',
                'registado_por' => $userId,
            ]);
        });
    }

    public function confirmar(LeituraEstimada $estimativa, int $userId): LeituraEstimada
    {
        return DB::transaction(function () use ($estimativa, $userId) {
            Cliente::whereKey($estimativa->cliente_id)->lockForUpdate()->firstOrFail();
            $estimativa = LeituraEstimada::whereKey($estimativa->id)->lockForUpdate()->firstOrFail();
            if ($estimativa->estado !== 'pendente') {
                throw ValidationException::withMessages(['estimativa' => 'Esta estimativa já foi confirmada ou encerrada.']);
            }
            $estimativa->update(['estado' => 'confirmada', 'confirmado_por' => $userId, 'confirmado_em' => now()]);

            return $estimativa->fresh();
        });
    }

    public function reconciliarAoConfirmar(Leitura $leitura, int $userId): ?AcertoLeitura
    {
        return DB::transaction(function () use ($leitura, $userId) {
            Cliente::whereKey($leitura->cliente_id)->lockForUpdate()->firstOrFail();
            $leitura = Leitura::whereKey($leitura->id)->lockForUpdate()->firstOrFail();
            if (! $leitura->confirmado || AcertoLeitura::where('leitura_real_id', $leitura->id)->exists()) return null;

            $ultimaReal = Leitura::where('cliente_id', $leitura->cliente_id)->where('confirmado', true)
                ->where('id', '!=', $leitura->id)
                ->where(fn ($q) => $q->where('ano', '<', $leitura->ano)->orWhere(fn ($q) => $q->where('ano', $leitura->ano)->where('mes', '<', $leitura->mes)))
                ->orderByDesc('ano')->orderByDesc('mes')->first();

            $estimativasQuery = LeituraEstimada::with('factura')->where('cliente_id', $leitura->cliente_id)
                ->where('estado', '!=', 'cancelada')
                ->where(fn ($q) => $q->where('ano', '<', $leitura->ano)->orWhere(fn ($q) => $q->where('ano', $leitura->ano)->where('mes', '<', $leitura->mes)));
            if ($ultimaReal) {
                $estimativasQuery->where(fn ($q) => $q->where('ano', '>', $ultimaReal->ano)
                    ->orWhere(fn ($q) => $q->where('ano', $ultimaReal->ano)->where('mes', '>', $ultimaReal->mes)));
            }
            $estimativas = $estimativasQuery->with('factura.pagamentos')->orderBy('ano')->orderBy('mes')->lockForUpdate()->get();
            if ($estimativas->isEmpty() || $estimativas->contains(fn ($item) => $item->estado !== 'facturada' || ! $item->factura)) return null;
            $facturasBloqueadas = Factura::with(['pagamentos', 'cliente.tarifa'])
                ->whereIn('id', $estimativas->map(fn ($item) => $item->factura->id))
                ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            if ($facturasBloqueadas->count() !== $estimativas->count()) return null;
            foreach ($estimativas as $estimativa) {
                $estimativa->setRelation('factura', $facturasBloqueadas->get($estimativa->factura->id));
            }

            $mesInicio = (int) ($estimativas->first()->mes);
            $anoInicio = (int) ($estimativas->first()->ano);
            $base = (float) ($ultimaReal?->leitura_actual ?? $leitura->leitura_anterior ?? 0);
            $consumoReal = round(max(0, (float) $leitura->leitura_actual - $base), 2);
            $consumoEstimado = round((float) $estimativas->sum('consumo_m3'), 2);
            $diferenca = round($consumoReal - $consumoEstimado, 2);

            // Distribui o consumo medido pelo peso das estimativas de cada mês,
            // respeitando a tarifa congelada em cada factura original.
            $valorReal = 0.0;
            $billing = app(BillingService::class);
            foreach ($estimativas as $item) {
                $factura = $item->factura;
                if (! $factura) return null;
                $peso = $consumoEstimado > 0 ? (float) $item->consumo_m3 / $consumoEstimado : 0;
                $tarifa = data_get($factura->emissao_original, 'tarifa');
                $valorReal += $billing->valorConsumoVolume($consumoReal * $peso, $factura->cliente, $tarifa);
            }
            $valorEstimado = (float) $estimativas->sum(fn ($item) => (float) $item->factura->valor_consumo);
            $valorAcerto = $diferenca > 0
                ? max(0, round($valorReal - $valorEstimado, 2))
                : ($diferenca < 0 ? -max(0, round($valorEstimado - $valorReal, 2)) : 0.0);
            $estado = abs($valorAcerto) < 0.01 ? 'sem_acerto' : 'a_confirmar';

            $acerto = AcertoLeitura::create([
                'cliente_id' => $leitura->cliente_id,
                'leitura_real_id' => $leitura->id,
                'mes_inicio' => $mesInicio,
                'ano_inicio' => $anoInicio,
                'consumo_real_m3' => $consumoReal,
                'consumo_estimado_m3' => $consumoEstimado,
                'diferenca_m3' => $diferenca,
                'valor_acerto' => $valorAcerto,
                'estado' => $estado,
                'detalhes' => [
                    'base_real_m3' => $base,
                    'estimativas' => $estimativas->map(fn ($item) => [
                        'id' => $item->id, 'mes' => $item->mes, 'ano' => $item->ano,
                        'consumo_m3' => (float) $item->consumo_m3, 'factura_id' => $item->factura->id,
                        'factura' => $item->factura->numero_factura,
                        'estado_factura' => $item->factura->estado,
                        'valor_facturado' => (float) $item->factura->valor_consumo,
                        'valor_pago' => $item->factura->totalPago(),
                    ])->all(),
                    'valor_estimado' => round($valorEstimado, 2),
                    'valor_real_estimado_por_mes' => round($valorReal, 2),
                    'formula_valor' => 'Consumo real distribuído proporcionalmente pelos períodos estimados, com a tarifa congelada em cada factura.',
                ],
                'registado_por' => $userId,
            ]);
            if ($estado === 'sem_acerto') {
                LeituraEstimada::whereIn('id', $estimativas->pluck('id'))
                    ->update(['estado' => 'reconciliada', 'reconciliada_por_leitura_id' => $leitura->id]);
            }

            return $acerto;
        });
    }

    public function aprovarAcerto(AcertoLeitura $acerto, int $userId): AcertoLeitura
    {
        return DB::transaction(function () use ($acerto, $userId) {
            Cliente::whereKey($acerto->cliente_id)->lockForUpdate()->firstOrFail();
            $acerto = AcertoLeitura::whereKey($acerto->id)->lockForUpdate()->firstOrFail();
            if ($acerto->estado !== 'a_confirmar') {
                throw ValidationException::withMessages(['acerto' => 'Este acerto já foi confirmado ou não tem movimento financeiro.']);
            }

            if ((float) $acerto->valor_acerto > 0) {
                $acerto->estado = 'por_facturar';
            } else {
                $credito = Credito::create([
                    'cliente_id' => $acerto->cliente_id,
                    'tipo' => 'acerto_leitura',
                    'valor' => abs((float) $acerto->valor_acerto),
                    'recebido_por' => null,
                    'pago_em' => null,
                    'nota' => 'Crédito de reconciliação de leituras estimadas, acerto #'.$acerto->id,
                ]);
                $acerto->credito_id = $credito->id;
                $acerto->estado = 'credito';
            }

            $acerto->aprovado_por = $userId;
            $acerto->aprovado_em = now();
            $acerto->save();
            LeituraEstimada::whereIn('id', collect($acerto->detalhes['estimativas'] ?? [])->pluck('id'))
                ->update(['estado' => 'reconciliada', 'reconciliada_por_leitura_id' => $acerto->leitura_real_id]);

            return $acerto->fresh();
        });
    }

    public function cancelar(LeituraEstimada $estimativa, int $userId, string $motivo): void
    {
        DB::transaction(function () use ($estimativa, $userId, $motivo) {
            Cliente::whereKey($estimativa->cliente_id)->lockForUpdate()->firstOrFail();
            $estimativa = LeituraEstimada::whereKey($estimativa->id)->lockForUpdate()->firstOrFail();
            if (! in_array($estimativa->estado, ['pendente', 'confirmada'], true)
                || Factura::withTrashed()->where('leitura_estimada_id', $estimativa->id)->exists()) {
                throw ValidationException::withMessages(['estimativa' => 'Só é possível cancelar estimativas ainda não facturadas.']);
            }
            $estimativa->update([
                'estado' => 'cancelada', 'cancelado_por' => $userId,
                'cancelado_em' => now(), 'motivo_cancelamento' => $motivo,
            ]);
        });
    }
}
