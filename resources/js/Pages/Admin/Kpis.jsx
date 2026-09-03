import { Head, Link, router } from "@inertiajs/react";
import {
    AreaChart as AreaChartIcon,
    ArrowLeft,
    Award,
    BarChart3,
    Droplets,
    FileText,
    PieChart,
    Receipt,
    TrendingUp,
    UserPlus,
    UserX,
    Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import PeriodoFiltro from "@/Components/PeriodoFiltro";
import StatusBadge from "@/Components/StatusBadge";
import AreaChart from "@/Components/charts/AreaChart";
import DistribuicaoMetodoChart from "@/Components/charts/DistribuicaoMetodoChart";
import EvolucaoMensalChart from "@/Components/charts/EvolucaoMensalChart";
import LineChart from "@/Components/charts/LineChart";
import { formatCurrency } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

function formatarM3(valor) {
    return `${Number(valor).toLocaleString("pt-MZ", { maximumFractionDigits: 1 })} m³`;
}

export default function Kpis({
    periodo,
    distribuicaoPorMetodo,
    evolucaoMensal,
    consumoMensal,
    maioresConsumidores,
    desempenhoFuncionarios,
    maioresDevedores,
    dividaTotal,
    filtros,
}) {
    const { actual, anterior, variacaoFacturado, variacaoRecebido, variacaoClientesNovos, variacaoConsumo } = periodo;

    const aplicarFiltros = (novosFiltros) => {
        router.get("/admin/kpis", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const mudarPeriodo = (novoPeriodo) => aplicarFiltros({ periodo: novoPeriodo, data_inicio: undefined, data_fim: undefined });
    const mudarIntervalo = (data_inicio, data_fim) => aplicarFiltros({ periodo: "personalizado", data_inicio, data_fim });

    const metrics = [
        {
            label: "Total facturado",
            value: formatCurrency(actual.totalFacturado),
            detail: `${actual.numeroFacturas} factura(s) no período`,
            icon: FileText,
            tone: "cyan",
            variacao: variacaoFacturado,
        },
        {
            label: "Total recebido",
            value: formatCurrency(actual.totalRecebido),
            detail: `${actual.numeroPagamentos} pagamento(s) no período`,
            icon: Receipt,
            tone: "emerald",
            variacao: variacaoRecebido,
        },
        {
            label: "Taxa de cobrança",
            value: actual.taxaCobranca === null ? "—" : `${actual.taxaCobranca}%`,
            detail: anterior.taxaCobranca === null ? "sem termo de comparação" : `período anterior: ${anterior.taxaCobranca}%`,
            icon: TrendingUp,
            tone: "amber",
        },
        {
            label: "Clientes novos",
            value: actual.clientesNovos,
            detail: `período anterior: ${anterior.clientesNovos}`,
            icon: UserPlus,
            tone: "rose",
            variacao: variacaoClientesNovos,
        },
        {
            label: "Consumo de água",
            value: formatarM3(actual.consumoM3),
            detail: `período anterior: ${formatarM3(anterior.consumoM3)}`,
            icon: Droplets,
            tone: "cyan",
            variacao: variacaoConsumo,
        },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link
                            href="/admin/dashboard"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            Voltar ao painel
                        </Link>
                        <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            KPIs e Estatísticas
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Análise comparativa por período — facturação, cobrança, e desempenho da equipa.
                        </p>
                    </div>
                    <PeriodoFiltro
                        periodo={filtros.periodo}
                        onChange={mudarPeriodo}
                        dataInicio={filtros.data_inicio}
                        dataFim={filtros.data_fim}
                        onChangeIntervalo={mudarIntervalo}
                        layoutId="kpis-periodo-pill"
                    />
                </div>
            }
        >
            <Head title="KPIs e Estatísticas" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.24}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <AreaChartIcon className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Tendência — facturado vs. recebido
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Últimos 6 meses</p>
                                <div className="mt-5">
                                    <AreaChart dados={evolucaoMensal} />
                                </div>
                            </div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.3}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <PieChart className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Pagamentos por método
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">No período seleccionado</p>
                                <div className="mt-5">
                                    <DistribuicaoMetodoChart dados={distribuicaoPorMetodo} variant="donut" />
                                </div>
                            </div>
                        </AnimatedPanel>
                    </section>

                    <AnimatedPanel delay={0.36}>
                        <div className="p-6">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <BarChart3 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Evolução mensal — barras
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Mesma janela de 6 meses, em barras
                            </p>
                            <div className="mt-5">
                                <EvolucaoMensalChart dados={evolucaoMensal} />
                            </div>
                        </div>
                    </AnimatedPanel>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.39}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <Droplets className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Consumo de água — tendência
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Últimos 6 meses, em m&sup3; registados
                                </p>
                                <div className="mt-5">
                                    <LineChart dados={consumoMensal} chave="consumo" />
                                </div>
                            </div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.4} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <Droplets className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Maiores consumidores
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    No período seleccionado — ajuda a identificar consumos fora do normal.
                                </p>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {maioresConsumidores.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Nenhuma leitura registada neste período.
                                    </p>
                                ) : (
                                    maioresConsumidores.map((linha, index) => (
                                        <div key={`${linha.cliente}-${index}`} className="flex items-center justify-between gap-3 px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                    {index + 1}
                                                </span>
                                                <p className="font-medium text-slate-900 dark:text-white">{linha.cliente}</p>
                                            </div>
                                            <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                                {formatarM3(linha.consumo)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </AnimatedPanel>
                    </section>

                    <AnimatedPanel delay={0.42} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                                <Award className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Desempenho por colaborador
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Pagamentos recebidos, facturas geradas e leituras registadas no período — ranking
                                de produtividade, sem metas configuráveis.
                            </p>
                        </div>
                        {desempenhoFuncionarios.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma actividade registada neste período.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">Colaborador</th>
                                            <th className="px-6 py-3 text-right">Pagamentos</th>
                                            <th className="px-6 py-3 text-right">Valor recebido</th>
                                            <th className="px-6 py-3 text-right">Facturas geradas</th>
                                            <th className="px-6 py-3 text-right">Leituras registadas</th>
                                            <th className="px-6 py-3 text-right">Total de acções</th>
                                        </tr>
                                    </thead>
                                    <motion.tbody
                                        variants={listVariants}
                                        initial="hidden"
                                        animate="show"
                                        className="divide-y divide-slate-100 dark:divide-slate-800"
                                    >
                                        {desempenhoFuncionarios.map((linha, index) => (
                                            <motion.tr key={linha.utilizador} variants={itemVariants}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                            {index + 1}
                                                        </span>
                                                        <span className="font-medium text-slate-900 dark:text-white">
                                                            {linha.utilizador}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {linha.pagamentosQuantidade}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                                                    {formatCurrency(linha.pagamentosTotal)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {linha.facturasQuantidade}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {linha.leiturasQuantidade}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <StatusBadge tone="cyan">{linha.totalAcoes}</StatusBadge>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </motion.tbody>
                                </table>
                            </div>
                        )}
                    </AnimatedPanel>

                    <AnimatedPanel delay={0.48} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                                <UserX className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                                Maiores devedores
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Dívida total acumulada: {formatCurrency(dividaTotal)}
                            </p>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {maioresDevedores.length === 0 && (
                                <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                    Nenhum cliente em dívida no momento.
                                </p>
                            )}
                            {maioresDevedores.map((divida, index) => (
                                <Link
                                    key={divida.id}
                                    href="/clientes"
                                    className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {divida.cliente?.nome ?? "Cliente removido"}
                                            </p>
                                            {divida.em_corte && (
                                                <StatusBadge tone="rose" className="mt-1">
                                                    Cortado
                                                </StatusBadge>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                                        {formatCurrency(divida.valor_divida)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </AnimatedPanel>
                </div>
            </div>
        </AdminLayout>
    );
}
