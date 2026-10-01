<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Factura;
use App\Models\Leitura;
use App\Models\Pagamento;
use App\Models\User;
use App\Support\Alertas;
use App\Support\AnaliseFinanceira;
use App\Support\AnaliseOperacional;
use App\Support\AnaliseMensal;
use App\Support\AnaliseRisco;
use App\Support\MesReferencia;
use App\Support\ResumoMensal;
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

    /**
     * Painel do administrador com KPIs reais calculados a partir da base de
     * dados: taxa de cobrança, dívida em atraso, evolução mensal,
     * distribuição de pagamentos por método e maiores devedores.
     */
    public function index(Request $request)
    {
        return Inertia::render('Admin/Dashboard', $this->dadosPainel(MesReferencia::resolver($request)));
    }

    /**
     * KPIs: a análise do mês escolhido — cobrança, consumo, clientes,
     * facturação, equipa e tendências, sempre comparando com o mês anterior
     * e com o mesmo mês do ano passado. O painel principal é só o estado
     * operacional de agora.
     */
    public function kpis(Request $request)
    {
        $mesRef = MesReferencia::resolver($request);

        return Inertia::render('Admin/Kpis', [
            ...$this->dadosKpis($mesRef, $request->user()->hasRole('administrador')),
            'ehAdministrador' => $request->user()->hasRole('administrador'),
            'mesReferencia' => MesReferencia::paraSeletor($mesRef),
            'filtros' => MesReferencia::foiPedido($request) ? ['mes' => $mesRef->format('Y-m')] : [],
        ]);
    }

    /** CSV da análise do mês — as mesmas secções da página de KPIs, pronto a abrir no Excel. */
    public function exportarKpis(Request $request): StreamedResponse
    {
        $mesRef = MesReferencia::resolver($request);
        $d = $this->dadosKpis($mesRef, $request->user()->hasRole('administrador'));
        $utilizador = $request->user();
        $nomeFicheiro = 'aquafuros-kpis-'.$mesRef->format('Y-m').'.csv';

        return response()->streamDownload(function () use ($d, $mesRef, $utilizador) {
            $saida = fopen('php://output', 'w');
            fwrite($saida, "\xEF\xBB\xBF"); // BOM UTF-8 — acentos correctos no Excel

            $secao = function (string $titulo, array $cabecalho, iterable $linhas) use ($saida) {
                fputcsv($saida, [$titulo]);
                fputcsv($saida, $cabecalho);
                foreach ($linhas as $linha) {
                    fputcsv($saida, $linha);
                }
                fputcsv($saida, []);
            };

            fputcsv($saida, ['RJM CONSULTÓRIOS E SERVIÇOS']);
            fputcsv($saida, ['Aquafuros — Relatório de KPIs e Estatísticas']);
            fputcsv($saida, ['Mês', MesReferencia::rotulo($mesRef)]);
            fputcsv($saida, ['Gerado em', now()->format('d/m/Y \à\s H:i')]);
            fputcsv($saida, ['Gerado por', $utilizador?->name ?? '—']);
            fputcsv($saida, []);

            $m = $d['mes'];
            $secao('RESUMO DO MÊS', ['Indicador', 'Mês', 'Mês anterior', 'Mesmo mês, ano passado'], [
                ['Facturado (MZN)', $m['totalFacturado'], $d['anterior']['totalFacturado'], $d['homologo']['totalFacturado']],
                ['Recebido (MZN)', $m['totalRecebido'], $d['anterior']['totalRecebido'], $d['homologo']['totalRecebido']],
                ['Taxa de cobrança (%)', $m['taxaCobranca'], $d['anterior']['taxaCobranca'], $d['homologo']['taxaCobranca']],
                ['Consumo (m³)', $m['consumoM3'], $d['anterior']['consumoM3'], $d['homologo']['consumoM3']],
                ['Clientes novos', $m['clientesNovos'], $d['anterior']['clientesNovos'], $d['homologo']['clientesNovos']],
            ]);

            $c = $d['cobranca'];
            $secao('COBRANÇA', ['Indicador', 'Valor'], [
                ['Taxa de cobrança do mês (%)', $c['taxaMes']],
                ['Taxa de cobrança acumulada (%)', $c['taxaAcumulada']],
                ['Tempo médio até ao pagamento (dias)', $c['tempoMedioPagamentoDias']],
                ['Recuperação de dívida de meses anteriores (MZN)', $c['recuperacaoDividaAntiga']],
            ]);
            $secao('RECEBIDO POR MÉTODO', ['Método', 'Total (MZN)', 'Quantidade', 'Ticket médio (MZN)', '% do total'],
                array_map(fn ($l) => [$l['metodo'], $l['total'], $l['quantidade'], $l['ticketMedio'], $l['percentagem']], $c['porMetodo']));
            $secao('ANTIGUIDADE DA DÍVIDA (situação de agora)', ['Idade', 'Facturas', 'Em falta (MZN)'],
                array_map(fn ($l) => [$l['rotulo'], $l['quantidade'], $l['valor']], $d['antiguidadeDivida']));

            $k = $d['consumo'];
            $secao('CONSUMO', ['Indicador', 'Valor'], [
                ['Consumo medido (m³)', $k['medidoM3']],
                ['Consumo facturado (m³)', $k['facturadoM3']],
                ['% do consumo facturado', $k['percentagemFacturado']],
                ['Clientes com leitura', $k['clientesComLeitura']],
                ['m³ por cliente', $k['m3PorCliente']],
                ['Clientes activos sem leitura no mês', $k['semLeitura']['total']],
            ]);
            $secao('CONSUMOS ANORMAIS', ['Cliente', 'Consumo (m³)', 'Média 3 meses (m³)', 'Variação (%)'],
                array_map(fn ($l) => [$l['cliente'], $l['consumo'], $l['media'], $l['variacao']], $k['anomalias']));

            $cl = $d['clientes'];
            $secao('CLIENTES', ['Indicador', 'Valor'], [
                ['Novos no mês', $cl['novos']], ['Activos', $cl['activos']], ['Total', $cl['total']],
                ['Cortados', $cl['cortados']], ['Taxa de corte (%)', $cl['taxaCorte']],
                ['Dívida total em atraso (MZN)', $cl['dividaTotal']],
                ['% da dívida nos 10 maiores devedores', $cl['concentracaoTop10']],
            ]);

            $f = $d['facturacao'];
            $secao('FACTURAÇÃO', ['Indicador', 'Valor'], [
                ['Ticket médio por factura (MZN)', $f['ticketMedio']],
                ['Multas (MZN)', $f['multas']], ['Peso da multa (%)', $f['pesoMulta']],
                ['Taxa de ligação (MZN)', $f['taxaLigacao']], ['Peso da taxa de ligação (%)', $f['pesoLigacao']],
                ['Facturas anuladas', $f['anuladas']['quantidade']], ['Valor anulado (MZN)', $f['anuladas']['valor']],
            ]);

            $r = $d['risco'];
            $mn = $d['mensal'];
            $secao('RISCO DE COBRANÇA E COBERTURA', ['Indicador', 'Valor'], [
                ['Eficácia de cobrança das facturas do mês (%)', $mn['eficaciaCoorte']],
                ['Facturas do mês já em atraso (%)', $mn['incumprimento']],
                ['Clientes em atraso', $r['clientesEmAtraso']],
                ['Clientes em atraso (% dos activos)', $r['percentagemEmAtraso']],
                ['Clientes com 2 ou mais facturas vencidas', $r['com2Vencidas']],
                ['Clientes com 3 ou mais facturas vencidas', $r['com3Vencidas']],
                ['Clientes em risco de corte', $r['emRiscoCorte']['total']],
                ['Dívida dos clientes em risco de corte (MZN)', $r['emRiscoCorte']['valor']],
                ['Clientes sem pagar há 3 meses', $r['semPagar3Meses']['total']],
                ['Cobertura de leituras (%)', $mn['cobertura']['percentagemLeituras']],
                ['Leituras confirmadas já facturadas (%)', $mn['cobertura']['percentagemFacturadas']],
                ['Facturado no ano (MZN)', $d['acumuladoAno']['actual']['facturado']],
                ['Facturado no mesmo período do ano passado (MZN)', $d['acumuladoAno']['anoPassado']['facturado']],
                ['Recebido no ano (MZN)', $d['acumuladoAno']['actual']['recebido']],
                ['Recebido no mesmo período do ano passado (MZN)', $d['acumuladoAno']['anoPassado']['recebido']],
            ]);

            $ct = $d['controlo'];
            if ($ct) {
            $secao('CONTROLO', ['Indicador', 'Valor'], [
                ['Facturas anuladas com pagamentos (histórico)', $ct['anuladasComPagamentos']['total']],
                ['Pagamentos electrónicos sem referência', $ct['electronicosSemReferencia']['quantidade']],
                ['Dias com pagamentos e caixa por fechar', $ct['caixasSemFecho']['total']],
            ]);
            $secao('ANULAÇÕES POR UTILIZADOR', ['Utilizador', 'Facturas', 'Valor (MZN)'],
                array_map(fn ($l) => [$l['utilizador'], $l['quantidade'], $l['valor']], $ct['anulacoes']));
            $secao('ESTORNOS POR UTILIZADOR', ['Utilizador', 'Pagamentos', 'Valor (MZN)'],
                array_map(fn ($l) => [$l['utilizador'], $l['quantidade'], $l['valor']], $ct['estornos']));
            }

            $pe = $d['perdas'];
            $secao('PERDAS DE ÁGUA', ['Indicador', 'Valor'], [
                ['Água produzida (m³)', $pe['produzidoM3']], ['Água facturada (m³)', $pe['facturadoM3']],
                ['Perdas (m³)', $pe['perdasM3']], ['Perdas (%)', $pe['perdasPct']],
            ]);
            $secao('RESULTADO POR ZONA', ['Zona', 'Clientes activos', 'Facturado (MZN)', 'Recebido (MZN)', 'Consumo (m³)', 'Em atraso (MZN)', 'Ocorrências abertas'],
                array_map(fn ($l) => [$l['zona'], $l['clientes'], $l['facturado'], $l['recebido'], $l['consumoM3'], $l['emAtraso'], $l['ocorrenciasAbertas']], $d['porZona']));
            $co = $d['cobrancaOp'];
            $oc = $d['ocorrencias'];
            $secao('COBRANÇA E OCORRÊNCIAS', ['Indicador', 'Valor'], [
                ['Contactos de cobrança no mês', $co['contactos']], ['Promessas feitas', $co['promessasFeitas']],
                ['Promessas cumpridas', $co['promessasCumpridas']], ['Promessas falhadas', $co['promessasFalhadas']],
                ['Taxa de cumprimento (%)', $co['taxaCumprimento']], ['Clientes em atraso sem contacto há 15 dias', $co['semContacto15d']],
                ['Ocorrências reportadas', $oc['reportadas']], ['Ocorrências resolvidas', $oc['resolvidas']],
                ['Abertas há mais de 48 h', $oc['maisDe48h']], ['Horas médias até resolver', $oc['horasAteResolver']],
                ['Crédito de clientes em carteira (MZN)', $d['credito']['saldoTotal']],
            ]);

            $secao('DESEMPENHO POR COLABORADOR', ['Colaborador', 'Pagamentos', 'Valor recebido (MZN)', 'Facturas geradas', 'Leituras registadas', 'Total de acções'],
                array_map(fn ($l) => [$l['utilizador'], $l['pagamentosQuantidade'], $l['pagamentosTotal'], $l['facturasQuantidade'], $l['leiturasQuantidade'], $l['totalAcoes']], $d['desempenhoFuncionarios']));
            $secao('EVOLUÇÃO (12 meses)', ['Mês', 'Ano', 'Facturado (MZN)', 'Recebido (MZN)', 'Média móvel facturado', 'Média móvel recebido'],
                array_map(fn ($l) => [$this->nomeMes($l['mes']), $l['ano'], $l['facturado'], $l['recebido'], $l['facturadoMedia'], $l['recebidoMedia']], $d['evolucaoMensal']));
            $secao('MAIORES DEVEDORES', ['Cliente', 'Dívida (MZN)'],
                $d['maioresDevedores']->map(fn ($x) => [$x->cliente->nome ?? 'Cliente removido', $x->valor_divida])->all());

            fclose($saida);
        }, $nomeFicheiro, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function dadosKpis(Carbon $mesRef, bool $incluirControlo = true): array
    {
        $mesRef = $mesRef->copy()->startOfMonth();
        $inicio = $mesRef->copy();
        $fim = $mesRef->copy()->endOfMonth();

        $mes = AnaliseMensal::base($mesRef);
        $anterior = AnaliseMensal::base($mesRef->copy()->subMonthNoOverflow());
        $homologo = AnaliseMensal::base($mesRef->copy()->subYearNoOverflow());

        $variacoes = [];
        foreach (['totalFacturado', 'totalRecebido', 'consumoM3', 'clientesNovos'] as $chave) {
            $variacoes[$chave] = [
                'anterior' => AnaliseMensal::variacao($mes[$chave], $anterior[$chave]),
                'homologo' => AnaliseMensal::variacao($mes[$chave], $homologo[$chave]),
            ];
        }

        return [
            'mes' => $mes,
            'anterior' => $anterior,
            'homologo' => $homologo,
            'variacoes' => $variacoes,
            'cobranca' => AnaliseMensal::cobranca($mesRef, $mes),
            'antiguidadeDivida' => AnaliseMensal::antiguidadeDivida(),
            'consumo' => AnaliseMensal::consumo($mesRef, $mes),
            'clientes' => AnaliseMensal::clientes($mesRef, $mes),
            'facturacao' => AnaliseMensal::facturacao($mesRef, $mes),
            'desempenhoFuncionarios' => $this->desempenhoFuncionarios($inicio, $fim),
            'evolucaoMensal' => AnaliseMensal::comMediaMovel($this->evolucaoMensal($mesRef, 12)),
            'consumoMensal' => $this->consumoMensal($mesRef, 12),
            'maioresDevedores' => Cliente::maioresDevedores(10),
            'risco' => AnaliseRisco::risco(),
            'ciclo' => AnaliseRisco::ciclo($mesRef),
            'previsao' => AnaliseFinanceira::previsaoCaixa(),
            'evolucaoDivida' => AnaliseFinanceira::evolucaoDivida($mesRef, 12),
            'mensal' => AnaliseRisco::mensal($mesRef),
            'acumuladoAno' => AnaliseRisco::acumuladoAno($mesRef),
            // Anulações, estornos e diferenças de caixa: só o administrador.
            'controlo' => $incluirControlo ? AnaliseRisco::controlo($mesRef) : null,
            'perdas' => AnaliseOperacional::perdas($mesRef),
            'porZona' => AnaliseOperacional::porZona($mesRef),
            'cobrancaOp' => AnaliseOperacional::cobranca($mesRef),
            'ocorrencias' => AnaliseOperacional::ocorrencias($mesRef),
            'credito' => AnaliseOperacional::credito($mesRef),
            'mensagens' => AnaliseOperacional::mensagens($mesRef),
        ];
    }

    /**
     * Ranking de desempenho por colaborador no intervalo: pagamentos
     * recebidos, facturas geradas e leituras registadas — sem sistema de
     * metas configuráveis, só produtividade comparável entre utilizadores.
     */
    private function desempenhoFuncionarios(Carbon $inicio, Carbon $fim): array
    {
        $pagamentosPorUser = Pagamento::whereBetween('pago_em', [$inicio, $fim])
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

        $utilizadores = User::withTrashed()->whereIn('id', $userIds)->get(['id', 'name'])->keyBy('id');

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

    /**
     * @param  Carbon  $hoje  mês de referência (por omissão o actual); os
     *                        indicadores "de situação" — dívida, leituras
     *                        por confirmar — são sempre os de agora.
     */
    private function dadosPainel(Carbon $hoje): array
    {
        return [
            'contadores' => [
                'clientesActivos' => Cliente::where('estado', 'ativo')->count(),
                'clientesTotal' => Cliente::count(),
                'clientesCortados' => Cliente::where('estado', 'cortado')->count(),
                'clientesCortadosSemDivida' => Cliente::clientesCortadosSemDividaCount(),
                // do mês escolhido — o mesmo que o cartão da página de Leituras
                'leiturasConfirmadas' => Leitura::where('mes', $hoje->month)->where('ano', $hoje->year)->where('confirmado', true)->count(),
                'leiturasPendentes' => Leitura::where('mes', $hoje->month)->where('ano', $hoje->year)->where('confirmado', false)->count(),
                'leiturasSemFactura' => Leitura::whereDoesntHave('factura')->where('confirmado', true)->count(),
            ],
            'alertas' => Alertas::para(true),
            'mesReferencia' => MesReferencia::paraSeletor($hoje),
            'mesActual' => $this->resumoPeriodo($hoje->month, $hoje->year),
            // 6 meses: só para o mini-gráfico dos cartões — a análise completa está nos KPIs.
            'evolucaoMensal' => $this->evolucaoMensal($hoje, 6),
            'dividaTotal' => Cliente::dividaTotalEmAtraso(),
            'clientesNovosMes' => Cliente::whereMonth('data_adesao', $hoje->month)
                ->whereYear('data_adesao', $hoje->year)
                ->count(),
            'consumoTotalMes' => (float) Leitura::where('mes', $hoje->month)
                ->where('ano', $hoje->year)
                ->get()
                ->sum(fn ($l) => max(0, $l->leitura_actual - $l->leitura_anterior)),
            'facturasVencidas' => $this->facturasVencidas(),
        ];
    }

    private function resumoPeriodo(int $mes, int $ano): array
    {
        return ResumoMensal::calcular($mes, $ano);
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
     * Facturas por pagar (pendentes ou parciais) cujo prazo já terminou —
     * quantas são e quanto falta receber delas. Situação de agora.
     *
     * @return array{quantidade: int, valor: float}
     */
    private function facturasVencidas(): array
    {
        $facturas = Factura::whereIn('estado', ['pendente', 'parcial'])
            ->where('data_vencimento', '<', now())
            ->withSum('pagamentos', 'valor_pago')
            ->get(['id', 'total_pagar']);

        return [
            'quantidade' => $facturas->count(),
            'valor' => round((float) $facturas->sum(
                fn ($f) => max(0, (float) $f->total_pagar - (float) ($f->pagamentos_sum_valor_pago ?? 0)),
            ), 2),
        ];
    }

    private function nomeMes(int $mes): string
    {
        return self::MESES[$mes - 1] ?? (string) $mes;
    }
}
