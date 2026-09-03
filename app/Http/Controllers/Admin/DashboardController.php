<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Divida;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\User;
use App\Support\ResolvedorPeriodo;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    private const MESES = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];

    private const MESES_COMPLETOS = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];

    /**
     * Painel do administrador com KPIs reais calculados a partir da base de
     * dados: taxa de cobrança, dívida em atraso, evolução mensal,
     * distribuição de pagamentos por método e maiores devedores.
     */
    public function index()
    {
        return Inertia::render('Admin/Dashboard', $this->dadosPainel());
    }

    /**
     * Exportação em CSV de todos os KPIs e estatísticas do painel — um
     * ficheiro com secções separadas, pronto a abrir no Excel.
     */
    public function exportar(): StreamedResponse
    {
        $dados = $this->dadosPainel();
        $utilizador = request()->user();
        $nomeFicheiro = 'aquafuros-kpis-' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($dados, $utilizador) {
            $saida = fopen('php://output', 'w');
            // BOM UTF-8 — para acentos aparecerem correctamente no Excel
            fwrite($saida, "\xEF\xBB\xBF");

            // Cabeçalho / identificação institucional
            fputcsv($saida, ['RJM CONSULTÓRIOS E SERVIÇOS']);
            fputcsv($saida, ['Aquafuros — Sistema de Gestão de Furos de Água']);
            fputcsv($saida, ['Relatório de KPIs e Estatísticas']);
            fputcsv($saida, []);
            fputcsv($saida, ['Gerado em', now()->format('d/m/Y \à\s H:i')]);
            fputcsv($saida, ['Gerado por', $utilizador?->name ?? '—']);
            fputcsv($saida, ['Período de referência', "{$this->nomeMesCompleto($dados['mesActual']['mes'])} de {$dados['mesActual']['ano']}"]);
            fputcsv($saida, []);
            fputcsv($saida, []);

            fputcsv($saida, ["RESUMO DO MÊS — {$this->nomeMes($dados['mesActual']['mes'])}/{$dados['mesActual']['ano']}"]);
            fputcsv($saida, ['Métrica', 'Valor']);
            fputcsv($saida, ['Total facturado (MZN)', $dados['mesActual']['totalFacturado']]);
            fputcsv($saida, ['Total recebido (MZN)', $dados['mesActual']['totalRecebido']]);
            fputcsv($saida, ['Taxa de cobrança (%)', $dados['mesActual']['taxaCobranca']]);
            fputcsv($saida, ['Nº de facturas emitidas', $dados['mesActual']['numeroFacturas']]);
            fputcsv($saida, ['Nº de pagamentos registados', $dados['mesActual']['numeroPagamentos']]);
            fputcsv($saida, ['Consumo total (m³)', $dados['consumoTotalMes']]);
            fputcsv($saida, ['Clientes novos no mês', $dados['clientesNovosMes']]);
            fputcsv($saida, ['Ticket médio por pagamento (MZN)', $dados['ticketMedioPagamento']]);
            fputcsv($saida, ['Tempo médio até pagamento (dias)', $dados['tempoMedioPagamentoDias']]);
            fputcsv($saida, []);
            fputcsv($saida, []);

            fputcsv($saida, ['CONTADORES GERAIS']);
            fputcsv($saida, ['Métrica', 'Valor']);
            $rotulosContadores = [
                'clientesActivos' => 'Clientes activos',
                'clientesTotal' => 'Clientes (total)',
                'clientesCortados' => 'Clientes cortados',
                'leiturasPendentes' => 'Leituras por confirmar',
                'leiturasSemFactura' => 'Leituras confirmadas sem factura',
            ];
            foreach ($dados['contadores'] as $chave => $valor) {
                fputcsv($saida, [$rotulosContadores[$chave] ?? $chave, $valor]);
            }
            fputcsv($saida, ['Dívida total em atraso (MZN)', $dados['dividaTotal']]);
            fputcsv($saida, []);
            fputcsv($saida, []);

            fputcsv($saida, ['EVOLUÇÃO MENSAL']);
            fputcsv($saida, ['Mês', 'Ano', 'Facturado (MZN)', 'Recebido (MZN)']);
            foreach ($dados['evolucaoMensal'] as $linha) {
                fputcsv($saida, [$this->nomeMes($linha['mes']), $linha['ano'], $linha['facturado'], $linha['recebido']]);
            }
            fputcsv($saida, []);
            fputcsv($saida, []);

            fputcsv($saida, ['PAGAMENTOS POR MÉTODO — MÊS ACTUAL']);
            fputcsv($saida, ['Método', 'Total (MZN)', 'Quantidade']);
            foreach ($dados['distribuicaoPorMetodo'] as $linha) {
                fputcsv($saida, [$linha['metodo'], $linha['total'], $linha['quantidade']]);
            }
            fputcsv($saida, []);
            fputcsv($saida, []);

            fputcsv($saida, ['MAIORES DEVEDORES']);
            fputcsv($saida, ['Cliente', 'Dívida (MZN)', 'Cortado']);
            foreach ($dados['maioresDevedores'] as $divida) {
                fputcsv($saida, [
                    $divida->cliente->nome ?? 'Cliente removido',
                    $divida->valor_divida,
                    $divida->em_corte ? 'Sim' : 'Não',
                ]);
            }

            fclose($saida);
        }, $nomeFicheiro, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Página dedicada a KPIs — com filtro de período (hoje/semana/mês/
     * personalizado), comparação com o período anterior equivalente,
     * distribuição por método, evolução mensal e ranking de desempenho
     * por colaborador.
     */
    public function kpis(Request $request)
    {
        $periodo = $request->query('periodo', 'mes');
        $intervalo = ResolvedorPeriodo::resolver($periodo, $request->query('data_inicio'), $request->query('data_fim'));

        $actual = $this->resumoIntervalo($intervalo['inicio'], $intervalo['fim']);
        $anterior = $this->resumoIntervalo($intervalo['anteriorInicio'], $intervalo['anteriorFim']);

        return Inertia::render('Admin/Kpis', [
            'periodo' => [
                'actual' => $actual,
                'anterior' => $anterior,
                'variacaoFacturado' => $this->variacaoPercentual($actual['totalFacturado'], $anterior['totalFacturado']),
                'variacaoRecebido' => $this->variacaoPercentual($actual['totalRecebido'], $anterior['totalRecebido']),
                'variacaoClientesNovos' => $this->variacaoPercentual($actual['clientesNovos'], $anterior['clientesNovos']),
                'variacaoConsumo' => $this->variacaoPercentual($actual['consumoM3'], $anterior['consumoM3']),
            ],
            'distribuicaoPorMetodo' => $this->distribuicaoPorMetodoIntervalo($intervalo['inicio'], $intervalo['fim']),
            'evolucaoMensal' => $this->evolucaoMensal(Carbon::now(), 6),
            'consumoMensal' => $this->consumoMensal(Carbon::now(), 6),
            'maioresConsumidores' => $this->maioresConsumidores($intervalo['inicio'], $intervalo['fim']),
            'desempenhoFuncionarios' => $this->desempenhoFuncionarios($intervalo['inicio'], $intervalo['fim']),
            'maioresDevedores' => Divida::where('valor_divida', '>', 0)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('valor_divida')
                ->limit(8)
                ->get(),
            'dividaTotal' => (float) Divida::sum('valor_divida'),
            'filtros' => [
                'periodo' => $periodo,
                'data_inicio' => $request->query('data_inicio'),
                'data_fim' => $request->query('data_fim'),
            ],
        ]);
    }

    /**
     * Resumo financeiro sobre um intervalo de datas concreto (não um mês de
     * facturação) — permite granularidade de dia/semana no filtro de KPIs.
     * Baseado em created_at (quando a transacção aconteceu), diferente de
     * resumoPeriodo() que agrupa por mes/ano de facturação.
     */
    private function resumoIntervalo(Carbon $inicio, Carbon $fim): array
    {
        $facturas = Factura::whereBetween('created_at', [$inicio, $fim])->where('estado', '!=', 'anulada')->get();
        $pagamentos = Pagamento::whereBetween('created_at', [$inicio, $fim])->get();
        $totalFacturado = (float) $facturas->sum('total_pagar');
        $totalRecebido = (float) $pagamentos->sum('valor_pago');

        return [
            'totalFacturado' => $totalFacturado,
            'totalRecebido' => $totalRecebido,
            'taxaCobranca' => $totalFacturado > 0 ? round(($totalRecebido / $totalFacturado) * 100, 1) : null,
            'numeroFacturas' => $facturas->count(),
            'numeroPagamentos' => $pagamentos->count(),
            'clientesNovos' => Cliente::whereBetween('created_at', [$inicio, $fim])->count(),
            'consumoM3' => (float) Leitura::whereBetween('created_at', [$inicio, $fim])
                ->get()
                ->sum(fn ($l) => max(0, $l->leitura_actual - $l->leitura_anterior)),
        ];
    }

    private function variacaoPercentual(float $actual, float $anterior): ?float
    {
        if ($anterior == 0.0) {
            return $actual > 0 ? null : 0.0;
        }

        return round((($actual - $anterior) / $anterior) * 100, 1);
    }

    private function distribuicaoPorMetodoIntervalo(Carbon $inicio, Carbon $fim): array
    {
        return Pagamento::whereBetween('created_at', [$inicio, $fim])
            ->get()
            ->groupBy('metodo_pagamento')
            ->map(fn ($grupo, $metodo) => [
                'metodo' => $metodo,
                'total' => (float) $grupo->sum('valor_pago'),
                'quantidade' => $grupo->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values()
            ->toArray();
    }

    /**
     * Ranking de desempenho por colaborador no intervalo: pagamentos
     * recebidos, facturas geradas e leituras registadas — sem sistema de
     * metas configuráveis, só produtividade comparável entre utilizadores.
     */
    private function desempenhoFuncionarios(Carbon $inicio, Carbon $fim): array
    {
        $pagamentosPorUser = Pagamento::whereBetween('created_at', [$inicio, $fim])
            ->whereNotNull('recebido_por')
            ->get()
            ->groupBy('recebido_por');

        $facturasPorUser = Factura::whereBetween('created_at', [$inicio, $fim])
            ->whereNotNull('gerada_por')
            ->get()
            ->groupBy('gerada_por');

        $leiturasPorUser = Leitura::whereBetween('created_at', [$inicio, $fim])
            ->get()
            ->groupBy('registado_por');

        $userIds = collect()
            ->merge($pagamentosPorUser->keys())
            ->merge($facturasPorUser->keys())
            ->merge($leiturasPorUser->keys())
            ->unique();

        $utilizadores = User::whereIn('id', $userIds)->get(['id', 'name'])->keyBy('id');

        return $userIds->map(function ($userId) use ($pagamentosPorUser, $facturasPorUser, $leiturasPorUser, $utilizadores) {
            $pagamentos = $pagamentosPorUser->get($userId, collect());
            $facturas = $facturasPorUser->get($userId, collect());
            $leituras = $leiturasPorUser->get($userId, collect());

            return [
                'utilizador' => $utilizadores->get($userId)?->name ?? 'Utilizador removido',
                'pagamentosQuantidade' => $pagamentos->count(),
                'pagamentosTotal' => (float) $pagamentos->sum('valor_pago'),
                'facturasQuantidade' => $facturas->count(),
                'leiturasQuantidade' => $leituras->count(),
                'totalAcoes' => $pagamentos->count() + $facturas->count() + $leituras->count(),
            ];
        })
            ->filter(fn ($linha) => $linha['totalAcoes'] > 0)
            ->sortByDesc('totalAcoes')
            ->values()
            ->toArray();
    }

    private function dadosPainel(): array
    {
        $hoje = Carbon::now();

        return [
            'contadores' => [
                'clientesActivos' => Cliente::where('estado', 'ativo')->count(),
                'clientesTotal' => Cliente::count(),
                'clientesCortados' => Cliente::where('estado', 'cortado')->count(),
                'leiturasPendentes' => Leitura::where('confirmado', false)->count(),
                'leiturasSemFactura' => Leitura::whereDoesntHave('factura')->where('confirmado', true)->count(),
            ],
            'mesActual' => $this->resumoPeriodo($hoje->month, $hoje->year),
            'evolucaoMensal' => $this->evolucaoMensal($hoje, 6),
            'distribuicaoPorMetodo' => $this->distribuicaoPorMetodo($hoje->month, $hoje->year),
            'maioresDevedores' => Divida::where('valor_divida', '>', 0)
                ->with(['cliente' => fn ($q) => $q->withTrashed()])
                ->orderByDesc('valor_divida')
                ->limit(5)
                ->get(),
            'dividaTotal' => (float) Divida::sum('valor_divida'),
            'clientesNovosMes' => Cliente::whereMonth('data_adesao', $hoje->month)
                ->whereYear('data_adesao', $hoje->year)
                ->count(),
            'consumoTotalMes' => (float) Leitura::where('mes', $hoje->month)
                ->where('ano', $hoje->year)
                ->get()
                ->sum(fn ($l) => max(0, $l->leitura_actual - $l->leitura_anterior)),
            'ticketMedioPagamento' => $this->ticketMedioPagamento($hoje->month, $hoje->year),
            'tempoMedioPagamentoDias' => $this->tempoMedioPagamentoDias(),
        ];
    }

    private function resumoPeriodo(int $mes, int $ano): array
    {
        $facturas = Factura::where('mes', $mes)->where('ano', $ano)->where('estado', '!=', 'anulada')->get();
        $totalFacturado = (float) $facturas->sum('total_pagar');
        $totalRecebido = (float) Pagamento::whereIn('factura_id', $facturas->pluck('id'))->sum('valor_pago');

        return [
            'mes' => $mes,
            'ano' => $ano,
            'totalFacturado' => $totalFacturado,
            'totalRecebido' => $totalRecebido,
            'taxaCobranca' => $totalFacturado > 0 ? round(($totalRecebido / $totalFacturado) * 100, 1) : null,
            'numeroFacturas' => $facturas->count(),
            'numeroPagamentos' => Pagamento::whereMonth('created_at', $mes)->whereYear('created_at', $ano)->count(),
        ];
    }

    private function evolucaoMensal(Carbon $referencia, int $meses): array
    {
        // startOfMonth() antes de subtrair: subtrair meses a partir do dia 31
        // pode "transbordar" para o mês seguinte em meses mais curtos
        // (ex: 31 Ago - 2 meses = "31 Jun", que não existe, vira 1 Jul).
        $base = $referencia->copy()->startOfMonth();

        $periodos = collect(range(0, $meses - 1))
            ->map(fn ($i) => $base->copy()->subMonths($i))
            ->reverse()
            ->values();

        return $periodos->map(function (Carbon $periodo) {
            $resumo = $this->resumoPeriodo($periodo->month, $periodo->year);

            return [
                'mes' => $periodo->month,
                'ano' => $periodo->year,
                'facturado' => $resumo['totalFacturado'],
                'recebido' => $resumo['totalRecebido'],
            ];
        })->toArray();
    }

    /**
     * Consumo total (m³) registado por mês, últimos N meses — indicador de
     * gestão de água, independente da facturação (uma leitura pode ser
     * registada antes de ser confirmada/facturada).
     */
    private function consumoMensal(Carbon $referencia, int $meses): array
    {
        $base = $referencia->copy()->startOfMonth();

        $periodos = collect(range(0, $meses - 1))
            ->map(fn ($i) => $base->copy()->subMonths($i))
            ->reverse()
            ->values();

        return $periodos->map(function (Carbon $periodo) {
            $consumo = (float) Leitura::whereBetween(
                'created_at',
                [$periodo->copy()->startOfMonth(), $periodo->copy()->endOfMonth()],
            )
                ->get()
                ->sum(fn ($l) => max(0, $l->leitura_actual - $l->leitura_anterior));

            return [
                'mes' => $periodo->month,
                'ano' => $periodo->year,
                'consumo' => $consumo,
            ];
        })->toArray();
    }

    /**
     * Clientes com maior consumo (m³) no intervalo seleccionado — ajuda a
     * identificar grandes consumidores ou possíveis fugas/anomalias.
     */
    private function maioresConsumidores(Carbon $inicio, Carbon $fim, int $limite = 5): array
    {
        return Leitura::whereBetween('created_at', [$inicio, $fim])
            ->with(['cliente' => fn ($q) => $q->withTrashed()])
            ->get()
            ->groupBy('cliente_id')
            ->map(fn ($grupo) => [
                'cliente' => $grupo->first()->cliente?->nome ?? 'Cliente removido',
                'consumo' => (float) $grupo->sum(fn ($l) => max(0, $l->leitura_actual - $l->leitura_anterior)),
            ])
            ->sortByDesc('consumo')
            ->take($limite)
            ->values()
            ->toArray();
    }

    private function distribuicaoPorMetodo(int $mes, int $ano): array
    {
        return Pagamento::whereMonth('created_at', $mes)
            ->whereYear('created_at', $ano)
            ->get()
            ->groupBy('metodo_pagamento')
            ->map(fn ($grupo, $metodo) => [
                'metodo' => $metodo,
                'total' => (float) $grupo->sum('valor_pago'),
                'quantidade' => $grupo->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values()
            ->toArray();
    }

    private function ticketMedioPagamento(int $mes, int $ano): ?float
    {
        $pagamentos = Pagamento::whereMonth('created_at', $mes)->whereYear('created_at', $ano)->get();

        return $pagamentos->isEmpty() ? null : round((float) $pagamentos->avg('valor_pago'), 2);
    }

    /**
     * Média de dias entre a emissão da factura e o primeiro pagamento
     * recebido, sobre as facturas pagas nos últimos 6 meses — indicador de
     * eficiência de cobrança.
     */
    private function tempoMedioPagamentoDias(): ?float
    {
        $desde = Carbon::now()->subMonths(6)->startOfMonth();

        $facturas = Factura::where('estado', 'paga')
            ->where('created_at', '>=', $desde)
            ->with(['pagamentos' => fn ($q) => $q->orderBy('created_at')])
            ->get()
            ->filter(fn ($f) => $f->pagamentos->isNotEmpty());

        if ($facturas->isEmpty()) {
            return null;
        }

        $mediasDias = $facturas->map(
            fn ($f) => $f->created_at->diffInDays($f->pagamentos->first()->created_at),
        );

        return round((float) $mediasDias->avg(), 1);
    }

    private function nomeMes(int $mes): string
    {
        return self::MESES[$mes - 1] ?? (string) $mes;
    }

    private function nomeMesCompleto(int $mes): string
    {
        return self::MESES_COMPLETOS[$mes - 1] ?? (string) $mes;
    }
}
