<?php

namespace App\Services;

use App\Models\Factura;
use Illuminate\Support\Collection;

class CobrancaFactura
{
    public function resumo(Factura $factura): array
    {
        $emissao = $factura->emissao_original ?? $factura->getAttributes();
        $origens = $factura->relationLoaded('origensSaldo')
            ? $factura->origensSaldo->sort(fn (Factura $a, Factura $b) => [$a->ano, $a->mes, $a->id] <=> [$b->ano, $b->mes, $b->id])->values()
            : $factura->origensSaldo()->with('pagamentos', 'cliente.tarifa')
                ->orderBy('ano')->orderBy('mes')->orderBy('facturas.id')->get();
        $todas = $origens->concat([$factura->loadMissing('pagamentos')]);
        $principalAnterior = round($origens->sum(fn ($f) => $f->estado === 'anulada' ? 0 : $f->principalEmFalta()), 2);
        $multasAnteriores = round($origens->sum(fn ($f) => $f->estado === 'anulada' ? 0 : $f->multaEmFalta()), 2);
        $saldo = round($principalAnterior + $multasAnteriores + $factura->emFalta(), 2);
        $apos = $this->pagamentosAposEmissao($factura, $origens, $emissao);
        $emitido = (float) ($emissao['total_pagar'] ?? $factura->total_pagar);
        if ($factura->estado === 'anulada') $saldo = 0;
        $ajustamentos = round($saldo - ($emitido - $apos), 2);
        $multaPeriodoPosterior = round((float) $factura->multa - (float) ($emissao['multa'] ?? 0), 2);
        $multasAnterioresPosteriores = round($origens->sum(fn ($f) => (float) $f->multa) - (float) ($emissao['multa_anterior'] ?? 0), 2);
        return [
            'total_emitido' => $emitido,
            'consumo_emitido' => (float) ($emissao['valor_consumo'] ?? $factura->valor_consumo),
            'principal_anterior_emitido' => ! empty($emissao['divida_anterior_incluida']) ? (float) ($emissao['divida_anterior'] ?? 0) : 0,
            'multas_anteriores_emitidas' => (float) ($emissao['multa_anterior'] ?? 0),
            'multa_emitida' => (float) ($emissao['multa'] ?? 0),
            'saldo_inicial_emitido' => (float) ($emissao['saldo_inicial'] ?? 0),
            'principal_anterior_actual' => $principalAnterior,
            'multas_anteriores_actual' => $multasAnteriores,
            'saldo_anterior_actual' => round($principalAnterior + $multasAnteriores, 2),
            'saldo_factura_actual' => $factura->emFalta(),
            'saldo_actual' => $saldo,
            'pagamentos_apos_emissao' => $apos,
            'ajustamentos_posteriores' => $ajustamentos,
            'multa_periodo_posterior' => $multaPeriodoPosterior,
            'multas_anteriores_posteriores' => $multasAnterioresPosteriores,
            'outros_ajustamentos_posteriores' => round($ajustamentos - $multaPeriodoPosterior - $multasAnterioresPosteriores, 2),
            'multas_previstas' => round($todas->sum(fn ($f) => $f->multaAtrasoPrevista()), 2),
            'origens' => $origens->filter(fn ($f) => $f->emFalta() > 0)->map(fn ($f) => [
                'id' => $f->id, 'numero_factura' => $f->numero_factura,
                'mes' => $f->mes, 'ano' => $f->ano,
                'principal' => $f->principalEmFalta(), 'multa' => $f->multaEmFalta(), 'saldo' => $f->emFalta(),
            ])->values()->all(),
        ];
    }

    private function pagamentosAposEmissao(Factura $factura, Collection $origens, array $emissao): float
    {
        $todas = $origens->concat([$factura]);
        $idsAnteriores = $emissao['pagamentos_anteriores_ids'] ?? null;
        if ($idsAnteriores !== null) {
            return round($todas->sum(fn ($f) => $f->pagamentos
                ->reject(fn ($p) => in_array($p->id, $idsAnteriores, true))->sum('valor_pago')), 2);
        }

        $apos = $todas->sum(fn ($f) => $f->pagamentos
            ->filter(fn ($p) => $p->created_at && $p->created_at->gte($factura->created_at))->sum('valor_pago'));

        // Documentos antigos importados podem ter a mesma data/hora dos
        // recibos anteriores. O saldo anterior guardado na emissão já desconta
        // esses pagamentos; não podem ser descontados uma segunda vez.
        if ($origens->isEmpty() || empty($emissao['divida_anterior_incluida'])) {
            return round($apos, 2);
        }
        $origens->loadMissing('origensSaldo');
        $valorOriginalOrigens = $origens->sum(function ($origem) {
            $original = $origem->emissao_original ?? $origem->getAttributes();
            $herdado = ! empty($original['divida_anterior_incluida']) && $origem->origensSaldo->isNotEmpty()
                ? (float) ($original['divida_anterior'] ?? 0) + (float) ($original['multa_anterior'] ?? 0) : 0;
            return (float) ($original['total_pagar'] ?? $origem->total_pagar) - $herdado;
        });
        $saldoAnteriorEmitido = (float) ($emissao['divida_anterior'] ?? 0) + (float) ($emissao['multa_anterior'] ?? 0);
        $pagosAntes = $origens->sum(fn ($f) => $f->pagamentos
            ->filter(fn ($p) => $p->created_at && $p->created_at->lt($factura->created_at))->sum('valor_pago'));
        $simultaneosAnteriores = $origens->sum(fn ($f) => $f->pagamentos->filter(fn ($p) =>
            $p->created_at && $p->created_at->eq($factura->created_at)
            && (int) ($p->factura_documento_id ?? $p->factura_id) !== (int) $factura->id)->sum('valor_pago'));
        $jaConsiderado = min($simultaneosAnteriores, max(0, round($valorOriginalOrigens - $saldoAnteriorEmitido - $pagosAntes, 2)));

        return max(0, round($apos - $jaConsiderado, 2));
    }
}
