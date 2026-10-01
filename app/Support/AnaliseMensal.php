<?php

namespace App\Support;

use App\Models\Cliente;
use Spatie\Activitylog\Models\Activity;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

/**
 * Análise de um mês para a página de KPIs. Os números base (facturado,
 * recebido, taxa de cobrança) vêm de ResumoMensal — a mesma definição do
 * painel, das Facturas e dos Pagamentos — e tudo o resto constrói-se sobre eles.
 *
 * "Do mês" = o que aconteceu nesse mês (facturas emitidas, dinheiro recebido,
 * leituras desse mês). "Situação" = o estado de agora (dívida por idade,
 * clientes cortados), que não se pode reconstruir para o passado.
 */
class AnaliseMensal
{
    /** Números do mês usados nas comparações (mês anterior, mesmo mês do ano passado). */
    public static function base(Carbon $mes): array
    {
        $resumo = ResumoMensal::calcular($mes->month, $mes->year);

        return [
            ...$resumo,
            'consumoM3' => ResumoMensal::leituras($mes->month, $mes->year)['consumoM3'],
            'clientesNovos' => Cliente::whereBetween('data_adesao', [$mes->copy()->startOfMonth(), $mes->copy()->endOfMonth()])->count(),
        ];
    }

    public static function variacao(float|int|null $actual, float|int|null $anterior): ?float
    {
        $actual = (float) $actual;
        $anterior = (float) $anterior;

        if ($anterior == 0.0) {
            return $actual > 0 ? null : 0.0;
        }

        return round((($actual - $anterior) / $anterior) * 100, 1);
    }

    /**
     * Cobrança: quanto do facturado se recebe, quão depressa, e quanto da
     * dívida antiga se recupera.
     */
    public static function cobranca(Carbon $mes, array $base): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        // Acumulado até ao fim do mês: tudo o que foi facturado vs. tudo o que foi recebido.
        $facturadoAcumulado = (float) Factura::where('created_at', '<=', $fim)->where('estado', '!=', 'anulada')->sum(DB::raw(Factura::SQL_VALOR_PROPRIO));
        $recebidoAcumulado = (float) Pagamento::where('pago_em', '<=', $fim)
            ->whereHas('factura', fn ($q) => $q->where('estado', '!=', 'anulada'))
            ->sum('valor_pago');

        // Tempo médio entre emitir a factura e receber o último pagamento (facturas que ficaram pagas neste mês).
        $pagas = Factura::where('estado', 'paga')
            ->withMax('pagamentos', 'pago_em')
            ->get(['id', 'created_at'])
            ->filter(fn ($f) => $f->pagamentos_max_pago_em
                && Carbon::parse($f->pagamentos_max_pago_em)->between($inicio, $fim));
        $dias = $pagas->map(fn ($f) => max(0, $f->created_at->diffInDays(Carbon::parse($f->pagamentos_max_pago_em))));

        // Dinheiro recebido neste mês de facturas emitidas ANTES dele.
        $recuperado = (float) Pagamento::whereBetween('pago_em', [$inicio, $fim])
            ->whereHas('factura', fn ($q) => $q->where('created_at', '<', $inicio))
            ->sum('valor_pago');

        $porMetodo = Pagamento::whereBetween('pago_em', [$inicio, $fim])->get()
            ->groupBy('metodo_pagamento')
            ->map(fn (Collection $grupo, $metodo) => [
                'metodo' => $metodo,
                'total' => round((float) $grupo->sum('valor_pago'), 2),
                'quantidade' => $grupo->count(),
                'ticketMedio' => round((float) $grupo->avg('valor_pago'), 2),
            ])
            ->sortByDesc('total')
            ->values();
        $totalMetodos = (float) $porMetodo->sum('total');

        return [
            'taxaMes' => $base['taxaCobranca'],
            'taxaAcumulada' => $facturadoAcumulado > 0 ? round($recebidoAcumulado / $facturadoAcumulado * 100, 1) : null,
            'tempoMedioPagamentoDias' => $dias->isEmpty() ? null : round((float) $dias->avg(), 1),
            'facturasPagasNoMes' => $pagas->count(),
            'recuperacaoDividaAntiga' => round($recuperado, 2),
            'porMetodo' => $porMetodo->map(fn ($linha) => [
                ...$linha,
                'percentagem' => $totalMetodos > 0 ? round($linha['total'] / $totalMetodos * 100, 1) : 0,
            ])->all(),
        ];
    }

    /**
     * Situação de agora: o que falta receber, por idade (dias depois do prazo).
     *
     * @return array<int, array{chave: string, rotulo: string, quantidade: int, valor: float}>
     */
    public static function antiguidadeDivida(): array
    {
        $hoje = now()->startOfDay();
        $baldes = [
            'aVencer' => ['A vencer (dentro do prazo)', 0, 0.0],
            'd30' => ['1–30 dias de atraso', 0, 0.0],
            'd60' => ['31–60 dias', 0, 0.0],
            'd90' => ['61–90 dias', 0, 0.0],
            'd90mais' => ['Mais de 90 dias', 0, 0.0],
        ];

        Factura::whereIn('estado', ['pendente', 'parcial'])
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar', 'data_vencimento'])
            ->each(function ($f) use (&$baldes, $hoje) {
                $falta = max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0));
                $atraso = $f->data_vencimento && $f->data_vencimento->lt($hoje) ? $f->data_vencimento->diffInDays($hoje) : 0;

                $chave = match (true) {
                    $atraso === 0 => 'aVencer',
                    $atraso <= 30 => 'd30',
                    $atraso <= 60 => 'd60',
                    $atraso <= 90 => 'd90',
                    default => 'd90mais',
                };
                $baldes[$chave][1]++;
                $baldes[$chave][2] += $falta;
            });

        return collect($baldes)->map(fn ($b, $chave) => [
            'chave' => $chave,
            'rotulo' => $b[0],
            'quantidade' => $b[1],
            'valor' => round($b[2], 2),
        ])->values()->all();
    }

    /**
     * Consumo: medido vs. facturado, por cliente, e anomalias (consumo muito
     * acima/abaixo da média das 3 leituras anteriores do próprio cliente).
     */
    public static function consumo(Carbon $mes, array $base): array
    {
        $consumoDe = fn (Leitura $l) => max(0.0, (float) $l->leitura_actual - (float) $l->leitura_anterior);

        $leituras = Leitura::where('mes', $mes->month)->where('ano', $mes->year)
            ->with(['cliente' => fn ($q) => $q->withTrashed(), 'factura'])
            ->get();

        $medido = (float) $leituras->sum($consumoDe);
        $facturado = (float) $leituras
            ->filter(fn ($l) => $l->factura && $l->factura->estado !== 'anulada')
            ->sum($consumoDe);

        $anomalias = $leituras->map(function (Leitura $l) use ($mes, $consumoDe) {
            $anteriores = Leitura::where('cliente_id', $l->cliente_id)
                ->whereRaw('(ano * 12 + mes) < ?', [$mes->year * 12 + $mes->month])
                ->orderByDesc('ano')->orderByDesc('mes')->limit(3)->get();
            if ($anteriores->isEmpty()) {
                return null;
            }

            $media = (float) $anteriores->avg($consumoDe);
            $consumo = $consumoDe($l);
            $anormal = ($media > 0 && $consumo >= $media * 1.5 && $consumo - $media >= 1)
                || ($consumo == 0.0 && $media >= 1);

            return $anormal ? [
                'cliente' => $l->cliente?->nome ?? 'Cliente removido',
                'consumo' => round($consumo, 2),
                'media' => round($media, 2),
                'variacao' => round(($consumo - $media) / $media * 100, 0),
            ] : null;
        })->filter()->sortByDesc(fn ($a) => abs($a['variacao']))->values();

        $comLeitura = $leituras->pluck('cliente_id')->unique();
        $semLeitura = Cliente::where('estado', 'ativo')
            ->where(fn ($q) => $q->whereNull('data_adesao')->orWhere('data_adesao', '<=', $mes->copy()->endOfMonth()))
            ->whereNotIn('id', $comLeitura)
            ->orderBy('nome')
            ->get(['id', 'nome']);

        $maiores = $leituras->groupBy('cliente_id')
            ->map(fn ($grupo) => [
                'cliente' => $grupo->first()->cliente?->nome ?? 'Cliente removido',
                'consumo' => round((float) $grupo->sum($consumoDe), 2),
            ])
            ->sortByDesc('consumo')->take(5)->values()->all();

        return [
            'medidoM3' => round($medido, 2),
            'facturadoM3' => round($facturado, 2),
            'percentagemFacturado' => $medido > 0 ? round($facturado / $medido * 100, 1) : null,
            'clientesComLeitura' => $comLeitura->count(),
            'm3PorCliente' => $comLeitura->isEmpty() ? null : round($medido / $comLeitura->count(), 2),
            'anomalias' => $anomalias->take(8)->all(),
            'totalAnomalias' => $anomalias->count(),
            'semLeitura' => ['total' => $semLeitura->count(), 'clientes' => $semLeitura->take(10)->pluck('nome')->all()],
            'maiores' => $maiores,
        ];
    }

    /** Clientes: novos no mês, cortados, e quanto a dívida está concentrada nos maiores devedores. */
    public static function clientes(Carbon $mes, array $base): array
    {
        $total = Cliente::count();
        $cortados = Cliente::where('estado', 'cortado')->count();
        $dividaTotal = Cliente::dividaTotalEmAtraso();
        $top10 = (float) Cliente::maioresDevedores(10)->sum('valor_divida');

        // Movimentos do mês, lidos do registo de actividade (mudanças de estado do cliente).
        $mudancas = Activity::where('log_name', 'cliente')->where('event', 'updated')
            ->whereBetween('created_at', [$mes->copy()->startOfMonth(), $mes->copy()->endOfMonth()])->get()
            ->filter(fn ($a) => isset($a->properties['attributes']['estado']));
        $para = fn (string $estado) => $mudancas->filter(fn ($a) => $a->properties['attributes']['estado'] === $estado);
        $cortadosNoMes = $para('cortado')->count();
        $inactivadosNoMes = $para('inativo')->count();
        $reactivadosNoMes = $para('ativo')->filter(fn ($a) => in_array($a->properties['old']['estado'] ?? null, ['cortado', 'inativo'], true))->count();

        return [
            'movimentos' => [
                'cortados' => $cortadosNoMes,
                'inactivados' => $inactivadosNoMes,
                'reactivados' => $reactivadosNoMes,
                'saldo' => $base['clientesNovos'] + $reactivadosNoMes - $cortadosNoMes - $inactivadosNoMes,
            ],
            'novos' => $base['clientesNovos'],
            'activos' => Cliente::where('estado', 'ativo')->count(),
            'total' => $total,
            'cortados' => $cortados,
            'taxaCorte' => $total > 0 ? round($cortados / $total * 100, 1) : null,
            'dividaTotal' => $dividaTotal,
            'concentracaoTop10' => $dividaTotal > 0 ? round($top10 / $dividaTotal * 100, 1) : null,
        ];
    }

    /** Facturação: ticket médio, peso da multa e da taxa de ligação, anulações. */
    public static function facturacao(Carbon $mes, array $base): array
    {
        $inicio = $mes->copy()->startOfMonth();
        $fim = $mes->copy()->endOfMonth();

        $emitidas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada')->get(['total_pagar', 'divida_anterior', 'divida_anterior_incluida', 'multa', 'tipo']);
        $facturado = (float) $emitidas->sum(fn ($f) => $f->valorProprio());
        $multas = (float) $emitidas->sum('multa');
        $ligacao = (float) $emitidas->where('tipo', 'ligacao')->sum(fn ($f) => $f->valorProprio());

        $anuladas = Factura::where('estado', 'anulada')->whereBetween('anulada_em', [$inicio, $fim])->get(['total_pagar', 'motivo_anulacao']);

        return [
            'ticketMedio' => $emitidas->isEmpty() ? null : round($facturado / $emitidas->count(), 2),
            'multas' => round($multas, 2),
            'pesoMulta' => $facturado > 0 ? round($multas / $facturado * 100, 1) : null,
            'taxaLigacao' => round($ligacao, 2),
            'pesoLigacao' => $facturado > 0 ? round($ligacao / $facturado * 100, 1) : null,
            'anuladas' => [
                'quantidade' => $anuladas->count(),
                'valor' => round((float) $anuladas->sum('total_pagar'), 2),
                'motivos' => $anuladas->groupBy(fn ($f) => trim((string) $f->motivo_anulacao) ?: 'Sem motivo')
                    ->map(fn ($g, $motivo) => ['motivo' => $motivo, 'quantidade' => $g->count()])
                    ->sortByDesc('quantidade')->take(5)->values()->all(),
            ],
        ];
    }

    /** Acrescenta a média móvel de 3 meses às séries mensais (facturado e recebido). */
    public static function comMediaMovel(array $serie): array
    {
        return collect($serie)->values()->map(function ($ponto, $i) use ($serie) {
            $janela = collect($serie)->slice(max(0, $i - 2), min(3, $i + 1));

            return [
                ...$ponto,
                'facturadoMedia' => round((float) $janela->avg('facturado'), 2),
                'recebidoMedia' => round((float) $janela->avg('recebido'), 2),
            ];
        })->all();
    }
}
