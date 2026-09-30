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
    UserX,
    Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import DevedoresChart from "@/Components/charts/DevedoresChart";
import PeriodoFiltro from "@/Components/PeriodoFiltro";
import StatusBadge from "@/Components/StatusBadge";
import DistribuicaoMetodoChart from "@/Components/charts/DistribuicaoMetodoChart";
import GraficoSerie, { FILTROS_MESES, formatarCompacto, rotuloMensal } from "@/Components/charts/GraficoSerie";
import { formatCurrency, formatMoney, formatVolume } from "@/lib/utils";
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
    const { actual, anterior, variacaoFacturado, variacaoRecebido, variacaoConsumo } = periodo;
    const ultimos = evolucaoMensal.slice(-6);
    const consumos = consumoMensal.slice(-6);

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
            grafico: { tipo: "spark", serie: ultimos.map((d) => d.facturado), rotulos: ultimos.map(rotuloMensal), formatar: formatMoney },
        },
        {
            label: "Total recebido",
            value: formatCurrency(actual.totalRecebido),
            detail: `${actual.numeroPagamentos} pagamento(s) no período`,
            icon: Receipt,
            tone: "emerald",
            variacao: variacaoRecebido,
            grafico: { tipo: "spark", serie: ultimos.map((d) => d.recebido), rotulos: ultimos.map(rotuloMensal), formatar: formatMoney },
        },
        {
            label: "Taxa de cobrança",
            value: actual.taxaCobranca === null ? "—" : `${actual.taxaCobranca}%`,
            detail: anterior.taxaCobranca === null ? "sem termo de comparação" : `período anterior: ${anterior.taxaCobranca}%`,
            icon: TrendingUp,
            tone: "amber",
            grafico: { tipo: "radial", valor: actual.taxaCobranca ?? 0 },
        },
        {
            label: "Consumo de água",
            value: formatarM3(actual.consumoM3),
            detail: `período anterior: ${formatarM3(anterior.consumoM3)}`,
            icon: Droplets,
            tone: "cyan",
            variacao: variacaoConsumo,
            grafico: { tipo: "spark", serie: consumos.map((d) => d.consumo), rotulos: consumos.map(rotuloMensal), formatar: formatVolume },
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
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <GraficoSerie
                            titulo="Tendência — facturado vs. recebido"
                            icone={AreaChartIcon}
                            dados={evolucaoMensal}
                            series={[
                                { chave: "facturado", label: "Facturado", cor: "#2a78d6" },
                                { chave: "recebido", label: "Recebido", cor: "#1baf7a" },
                            ]}
                            tipo="area"
                            filtros={FILTROS_MESES}
                            formatar={formatMoney}
                            formatarEixo={formatarCompacto}
                        />

                        <DistribuicaoMetodoChart
                            dados={distribuicaoPorMetodo}
                            descricao="Valor recebido no período seleccionado, por método"
                        />
                    </section>

                    <GraficoSerie
                        titulo="Evolução mensal — barras"
                        descricao="Facturado vs. recebido, mês a mês"
                        icone={BarChart3}
                        dados={evolucaoMensal}
                        series={[
                                { chave: "facturado", label: "Facturado", cor: "#2a78d6" },
                                { chave: "recebido", label: "Recebido", cor: "#1baf7a" },
                            ]}
                        tipo="bar"
                        filtros={FILTROS_MESES}
                        formatar={formatMoney}
                        formatarEixo={formatarCompacto}
                    />

                    <section className="grid gap-6 lg:grid-cols-2">
                        <GraficoSerie
                            titulo="Consumo de água — tendência"
                            descricao="Metros cúbicos registados"
                            icone={Droplets}
                            dados={consumoMensal}
                            series={[{ chave: "consumo", label: "Consumo", cor: "#2a78d6" }]}
                            tipo="line"
                            filtros={FILTROS_MESES}
                            formatar={formatVolume}
                            formatarEixo={formatarCompacto}
                        />

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

                    <DevedoresChart
                        largo
                        devedores={maioresDevedores}
                        delay={0.48}
                        descricao={`Dívida total acumulada: ${formatCurrency(dividaTotal)}`}
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
