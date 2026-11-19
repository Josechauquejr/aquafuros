<?php

namespace App\Support\IA;

use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Ocorrencia;
use App\Models\Pagamento;
use App\Models\ProducaoAgua;
use App\Models\User;
use App\Support\MesReferencia;
use Illuminate\Support\Carbon;

/** Fornece à Aqua indicadores agregados globais, limitados pelo papel do utilizador. */
class ContextoAssistente
{
    /** Detailed, on-demand context for an explicitly selected customer. */
    public static function clienteConsultado(int $clienteId): array
    {
        $cliente = Cliente::with(['zona', 'tarifa'])->findOrFail($clienteId);
        $facturas = $cliente->facturas()->with('pagamentos')->orderByDesc('ano')->orderByDesc('mes')->orderByDesc('id')->get();
        $leituras = $cliente->leituras()->orderByDesc('ano')->orderByDesc('mes')->orderByDesc('id')->get();
        $pagamentos = $cliente->pagamentos()->with('factura')->latest('pago_em')->limit(20)->get();
        $abertas = $facturas->whereIn('estado', ['pendente', 'parcial']);
        $vencidas = $abertas->filter(fn (Factura $factura) => $factura->esta_vencida);

        return [
            'cliente' => [
                'id' => $cliente->id, 'numero' => $cliente->numero_cliente, 'nome' => $cliente->nome,
                'estado' => $cliente->estado, 'endereco' => $cliente->endereco, 'bairro' => $cliente->bairro,
                'telefone' => $cliente->telefone, 'email' => $cliente->email,
                'zona' => $cliente->zona?->nome, 'data_adesao' => $cliente->data_adesao,
                'leitura_inicial' => $cliente->leitura_inicial,
            ],
            'tarifa_actual' => $cliente->tarifa ? [
                'nome' => $cliente->tarifa->nome, 'preco_m3' => (float) $cliente->tarifa->preco_m3,
                'taxa_minima' => (float) $cliente->tarifa->taxa_minima,
                'consumo_minimo_m3' => (float) $cliente->tarifa->consumo_minimo_m3,
                'percentagem_multa' => (float) $cliente->tarifa->percentagem_multa,
                'limiar_corte' => (float) $cliente->tarifa->limiar_corte,
            ] : null,
            'resumo' => [
                'facturas' => $facturas->count(), 'leituras' => $leituras->count(),
                'pagamentos' => $cliente->pagamentos()->count(),
                'saldo_em_aberto' => round((float) $abertas->sum(fn (Factura $factura) => $factura->emFalta()), 2),
                'saldo_vencido' => round((float) $vencidas->sum(fn (Factura $factura) => $factura->emFalta()), 2),
                'multas_registadas_em_falta' => round((float) $abertas->sum(fn (Factura $factura) => $factura->multaEmFalta()), 2),
                'multas_previstas' => round((float) $abertas->sum(fn (Factura $factura) => $factura->multaAtrasoPrevista()), 2),
                'credito' => \App\Models\Credito::saldoDe($cliente->id),
            ],
            'facturas' => $facturas->take(24)->map(fn (Factura $factura) => [
                'numero' => $factura->numero_factura, 'periodo' => sprintf('%02d/%04d', $factura->mes, $factura->ano),
                'estado' => $factura->estado, 'vencimento' => $factura->data_vencimento?->toDateString(),
                'consumo_m3' => (float) $factura->consumo_m3, 'valor_consumo' => (float) $factura->valor_consumo,
                'divida_anterior_incluida' => (bool) $factura->divida_anterior_incluida,
                'divida_anterior' => (float) $factura->divida_anterior,
                'multa' => (float) $factura->multa, 'multa_anterior' => (float) $factura->multa_anterior,
                'multa_em_falta' => $factura->multaEmFalta(), 'multa_prevista' => $factura->multaAtrasoPrevista(),
                'total_emitido' => (float) $factura->total_pagar, 'total_pago' => $factura->totalPago(),
                'saldo' => $factura->emFalta(), 'vencida' => $factura->esta_vencida,
            ])->values(),
            'leituras' => $leituras->take(24)->map(fn (Leitura $leitura) => [
                'numero' => $leitura->numero_leitura, 'periodo' => sprintf('%02d/%04d', $leitura->mes, $leitura->ano),
                'leitura_anterior' => (float) $leitura->leitura_anterior, 'leitura_actual' => (float) $leitura->leitura_actual,
                'consumo_m3' => $leitura->consumo(), 'confirmada' => (bool) $leitura->confirmado,
            ])->values(),
            'pagamentos' => $pagamentos->map(fn (Pagamento $pagamento) => [
                'recibo' => $pagamento->numero_recibo, 'data' => $pagamento->pago_em?->toDateString(),
                'valor' => (float) $pagamento->valor_pago, 'metodo' => $pagamento->metodo_pagamento,
                'factura' => $pagamento->factura?->numero_factura,
            ])->values(),
            'ocorrencias' => Ocorrencia::where('cliente_id', $cliente->id)->latest('reportada_em')->limit(20)
                ->get(['tipo', 'descricao', 'estado', 'reportada_em', 'resolvida_em'])
                ->map(fn (Ocorrencia $ocorrencia) => [
                    'tipo' => $ocorrencia->tipo, 'descricao' => $ocorrencia->descricao, 'estado' => $ocorrencia->estado,
                    'reportada_em' => $ocorrencia->reportada_em, 'resolvida_em' => $ocorrencia->resolvida_em,
                ])->values(),
        ];
    }

    /** Loads only the invoice explicitly named in the user's question. */
    public static function facturaConsultada(string $numeroFactura): array
    {
        $factura = Factura::with(['cliente.tarifa', 'pagamentos', 'leitura'])
            ->where('numero_factura', $numeroFactura)->first();

        if (! $factura) {
            return ['factura_consultada' => null, 'referencias_locais' => []];
        }

        $referenciaCliente = 'cliente_factura_1';
        $saldoVencidoCliente = null;
        if ($factura->cliente_id) {
            $saldoVencidoCliente = Factura::where('cliente_id', $factura->cliente_id)
                ->whereIn('estado', ['pendente', 'parcial'])
                ->whereDate('data_vencimento', '<', today())
                ->withSum('pagamentos', 'valor_pago')->get(['id', 'total_pagar'])
                ->sum(fn (Factura $item) => max(0, (float) $item->total_pagar - (float) ($item->pagamentos_sum_valor_pago ?? 0)));
        }

        return [
            'id_registo' => $factura->id,
            'factura_consultada' => [
                'numero' => $factura->numero_factura,
                'cliente' => $factura->cliente ? $referenciaCliente : null,
                'mes' => sprintf('%02d/%04d', $factura->mes, $factura->ano),
                'estado' => $factura->estado,
                'data_vencimento' => $factura->data_vencimento?->toDateString(),
                'esta_vencida' => $factura->esta_vencida,
                'consumo_m3' => (float) $factura->consumo_m3,
                'valor_consumo' => (float) $factura->valor_consumo,
                'valor_acerto_leitura' => (float) $factura->valor_acerto_leitura,
                'divida_anterior_incluida' => (bool) $factura->divida_anterior_incluida,
                'divida_anterior' => (float) $factura->divida_anterior,
                'multa' => (float) $factura->multa,
                'multa_anterior' => (float) $factura->multa_anterior,
                'multa_atraso_prevista' => (float) $factura->multaAtrasoPrevista(),
                'total_emitido' => (float) $factura->total_pagar,
                'total_pago' => $factura->totalPago(),
                'saldo_factura' => $factura->emFalta(),
                'saldo_vencido_cliente' => $saldoVencidoCliente === null ? null : round((float) $saldoVencidoCliente, 2),
            ],
            'referencias_locais' => $factura->cliente ? [$referenciaCliente => [
                'nome' => $factura->cliente->nome,
                'numero' => $factura->cliente->numero_cliente,
            ]] : [],
        ];
    }

    public static function construir(User $user): array
    {
        $mes = MesReferencia::actual();
        // O contexto não depende da página aberta: inclui todas as áreas
        // autorizadas para o papel actual.
        $resultadoGlobal = ['ciclo' => self::ciclo($mes)];
        $referenciasLocais = [];
        if ($user->hasAnyRole(['administrador', 'gestor'])) {
            $resultadoGlobal['clientes'] = self::clientes();
            $resultadoGlobal['facturas'] = self::facturas($mes);
            $cobrancaGlobal = self::cobranca();
            $referenciasLocais = $cobrancaGlobal['referencias_locais'] ?? [];
            unset($cobrancaGlobal['referencias_locais']);
            $resultadoGlobal['cobranca'] = $cobrancaGlobal;
            $resultadoGlobal['facturado_por_mes'] = Factura::query()
                ->where('estado', '!=', 'anulada')
                ->where(function ($q) use ($mes) {
                    $q->where('ano', '>', $mes->copy()->subMonths(59)->year)
                        ->orWhere(function ($q) use ($mes) {
                            $inicio = $mes->copy()->subMonths(59);
                            $q->where('ano', $inicio->year)->where('mes', '>=', $inicio->month);
                        });
                })
                ->where(function ($q) use ($mes) {
                    $q->where('ano', '<', $mes->year)
                        ->orWhere(function ($q) use ($mes) {
                            $q->where('ano', $mes->year)->where('mes', '<=', $mes->month);
                        });
                })
                ->selectRaw('ano, mes, SUM(total_pagar) as total_facturado_mzn')
                ->groupBy('ano', 'mes')->get()
                ->mapWithKeys(fn ($item) => [sprintf('%04d-%02d', $item->ano, $item->mes) => round((float) $item->total_facturado_mzn, 2)])
                ->all();
            $resultadoGlobal['facturas_por_mes'] = self::facturasPorMes($mes);
        }
        if ($user->hasAnyRole(['administrador', 'gestor', 'tecnico'])) {
            $resultadoGlobal['leituras'] = self::leituras($mes);
            $resultadoGlobal['producao'] = self::producao($mes);
            $resultadoGlobal['ocorrencias'] = self::ocorrencias();
        }
        if ($user->hasAnyRole(['administrador', 'gestor', 'caixa'])) {
            $resultadoGlobal['pagamentos'] = self::pagamentos();
        }
        return [
            'contexto' => [
                'area' => 'global',
                'referencia' => $mes->format('m/Y'),
                'indicadores' => $resultadoGlobal,
            ],
            // Os nomes e números ficam no servidor; só as referências entram no prompt.
            'referencias_locais' => $referenciasLocais,
        ];
    }

    private static function ciclo(Carbon $mes): array
    {
        $resumo = \App\Support\CicloMes::resumo();

        return [
            'mes_do_ciclo' => $resumo['mes'],
            'leituras_ate' => $resumo['leiturasAte'],
            'dias_para_limite_das_leituras' => $resumo['diasParaLimite'],
            'facturas_do_ciclo_vencem' => $resumo['vence'],
            'clientes_activos' => Cliente::where('estado', 'ativo')->count(),
            'leituras_registadas' => Leitura::where('mes', $mes->month)->where('ano', $mes->year)
                ->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))
                ->distinct('cliente_id')->count('cliente_id'),
            'leituras_por_confirmar' => Leitura::where('mes', $mes->month)->where('ano', $mes->year)
                ->where('confirmado', false)->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))->count(),
        ];
    }

    private static function leituras(Carbon $mes): array
    {
        $dados = self::ciclo($mes);
        $dados['leituras_confirmadas'] = Leitura::where('mes', $mes->month)->where('ano', $mes->year)
            ->where('confirmado', true)->whereHas('cliente', fn ($q) => $q->where('estado', 'ativo'))->count();
        $dados['clientes_sem_leitura'] = max(0, $dados['clientes_activos'] - $dados['leituras_registadas']);

        return $dados;
    }

    private static function facturas(Carbon $mes): array
    {
        $query = Factura::where('mes', $mes->month)->where('ano', $mes->year)->where('estado', '!=', 'anulada');

        return [
            'facturas_emitidas' => (clone $query)->count(),
            'facturas_pendentes' => (clone $query)->where('estado', 'pendente')->count(),
            'facturas_parciais' => (clone $query)->where('estado', 'parcial')->count(),
            'total_facturado_mzn' => round((float) (clone $query)->sum('total_pagar'), 2),
        ];
    }

    /**
     * Emitido, pago e em aberto dos últimos seis meses — para a Aqua poder
     * decompor um total ("Já pago", "Em aberto", "Facturas emitidas").
     */
    private static function facturasPorMes(Carbon $mes): array
    {
        $inicio = $mes->copy()->startOfMonth()->subMonths(5);

        return Factura::query()
            ->where('estado', '!=', 'anulada')
            ->where(fn ($q) => $q->where('ano', '>', $inicio->year)->orWhere(fn ($q) => $q->where('ano', $inicio->year)->where('mes', '>=', $inicio->month)))
            ->where(fn ($q) => $q->where('ano', '<', $mes->year)->orWhere(fn ($q) => $q->where('ano', $mes->year)->where('mes', '<=', $mes->month)))
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'mes', 'ano', 'total_pagar', 'estado'])
            ->groupBy(fn (Factura $factura) => sprintf('%04d-%02d', $factura->ano, $factura->mes))
            ->sortKeys()
            ->map(function ($facturas) {
                $emitido = (float) $facturas->sum('total_pagar');
                $pago = (float) $facturas->sum(fn (Factura $factura) => min((float) $factura->total_pagar, (float) ($factura->pagamentos_sum_valor_pago ?? 0)));

                return [
                    'facturas_emitidas' => $facturas->count(),
                    'emitido_mzn' => round($emitido, 2),
                    'pago_mzn' => round($pago, 2),
                    'em_aberto_mzn' => round(max(0, $emitido - $pago), 2),
                    'facturas_pagas' => $facturas->where('estado', 'paga')->count(),
                ];
            })
            ->all();
    }

    private static function cobranca(): array
    {
        $vencidas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->whereDate('data_vencimento', '<', now()->toDateString())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'cliente_id', 'total_pagar', 'data_vencimento']);

        $porCliente = $vencidas->groupBy('cliente_id')->map(function ($facturas, $clienteId) {
            $maisAntiga = $facturas->min('data_vencimento');

            return [
                'cliente_id' => (int) $clienteId,
                'saldo_vencido_mzn' => round((float) $facturas->sum(
                    fn (Factura $factura) => max(0, (float) $factura->total_pagar - (float) ($factura->pagamentos_sum_valor_pago ?? 0)),
                ), 2),
                'facturas_vencidas' => $facturas->count(),
                'dias_em_atraso' => $maisAntiga ? (int) Carbon::parse($maisAntiga)->startOfDay()->diffInDays(today()->startOfDay()) : 0,
            ];
        })->sortByDesc('saldo_vencido_mzn')->take(5)->values();

        $clientes = Cliente::withTrashed()->whereIn('id', $porCliente->pluck('cliente_id'))
            ->get(['id', 'numero_cliente', 'nome'])->keyBy('id');
        $referenciasLocais = [];
        $ranking = $porCliente->values()->map(function (array $item, int $indice) use ($clientes, &$referenciasLocais) {
            $referencia = 'cliente_'.($indice + 1);
            $cliente = $clientes->get($item['cliente_id']);
            $referenciasLocais[$referencia] = [
                'nome' => $cliente?->nome ?? 'Cliente removido',
                'numero' => $cliente?->numero_cliente,
            ];

            unset($item['cliente_id']);

            return ['referencia' => $referencia, ...$item];
        });

        // Atraso de cada cliente = dias desde a factura vencida mais antiga.
        $atrasos = $vencidas->groupBy('cliente_id')->map(fn ($facturas) => (int) Carbon::parse($facturas->min('data_vencimento'))->startOfDay()->diffInDays(today()->startOfDay()));

        return [
            'facturas_vencidas' => $vencidas->count(),
            'clientes_com_factura_vencida' => $vencidas->unique('cliente_id')->count(),
            'dias_em_atraso_maximo' => (int) ($atrasos->max() ?? 0),
            'clientes_com_atraso_30_dias_ou_mais' => $atrasos->filter(fn ($dias) => $dias >= 30)->count(),
            'clientes_com_atraso_60_dias_ou_mais' => $atrasos->filter(fn ($dias) => $dias >= 60)->count(),
            'clientes_com_atraso_90_dias_ou_mais' => $atrasos->filter(fn ($dias) => $dias >= 90)->count(),
            'saldo_vencido_mzn' => round((float) $vencidas->sum(
                fn (Factura $factura) => max(0, (float) $factura->total_pagar - (float) ($factura->pagamentos_sum_valor_pago ?? 0)),
            ), 2),
            'maiores_saldos_vencidos' => $ranking->all(),
            'referencias_locais' => $referenciasLocais,
        ];
    }

    private static function pagamentos(): array
    {
        $hoje = Pagamento::whereDate('pago_em', today());

        return [
            'pagamentos_registados_hoje' => (clone $hoje)->count(),
            'total_recebido_hoje_mzn' => round((float) (clone $hoje)->sum('valor_pago'), 2),
        ];
    }

    private static function clientes(): array
    {
        return [
            'clientes_activos' => Cliente::where('estado', 'ativo')->count(),
            'clientes_inactivos' => Cliente::where('estado', 'inativo')->count(),
            'clientes_cortados' => Cliente::where('estado', 'cortado')->count(),
        ];
    }

    private static function ocorrencias(): array
    {
        return [
            'ocorrencias_abertas' => Ocorrencia::where('estado', 'aberta')->count(),
            'ocorrencias_em_curso' => Ocorrencia::where('estado', 'em_curso')->count(),
            'ocorrencias_resolvidas_este_mes' => Ocorrencia::where('estado', 'resolvida')
                ->whereMonth('resolvida_em', now()->month)->whereYear('resolvida_em', now()->year)->count(),
        ];
    }

    private static function producao(Carbon $mes): array
    {
        $producao = ProducaoAgua::where('mes', $mes->month)->where('ano', $mes->year);

        return [
            'registos_de_producao' => (clone $producao)->count(),
            'volume_registado_m3' => round((float) (clone $producao)->sum('volume_m3'), 2),
        ];
    }
}
