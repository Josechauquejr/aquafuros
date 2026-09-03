import { Head, router } from "@inertiajs/react";
import { Activity, AlertTriangle, Database, FileStack, Gauge, LineChart as LineChartIcon, Timer, Trophy } from "lucide-react";
import { motion } from "motion/react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import PeriodoFiltro from "@/Components/PeriodoFiltro";
import AreaChart from "@/Components/charts/AreaChart";
import LineChart from "@/Components/charts/LineChart";
import { itemVariants, listVariants } from "@/lib/motion";

const FACTURAS_VS_RECIBOS_SERIES = [
    { chave: "facturas", label: "Facturas", cor: "#2a78d6", fill: "rgba(42,120,214,0.15)" },
    { chave: "recibos", label: "Recibos", cor: "#1baf7a", fill: "rgba(27,175,122,0.18)" },
];

const DESEMPENHO_SERIES = [
    { chave: "duracaoMedia", label: "Pedido (total)", cor: "#eb6834", fill: "rgba(235,104,52,0.15)" },
    { chave: "tempoBdMedio", label: "Consulta à BD", cor: "#1baf7a", fill: "rgba(27,175,122,0.18)" },
];

function formatarInteiro(valor) {
    return `${Number(valor).toLocaleString("pt-MZ")}`;
}

function formatarMs(valor) {
    if (valor === null || valor === undefined) return "—";
    return valor >= 1000 ? `${(valor / 1000).toFixed(2)} s` : `${Math.round(valor)} ms`;
}

export default function Painel({
    utilizadoresMaisActivos,
    documentosGerados,
    facturasVsRecibos,
    usoPorSeccao,
    desempenhoBaseDados,
    totalAcessosPeriodo,
    tempoMedioResposta,
    tempoMedioBd,
    errosPorResolver,
    filtros,
}) {
    const aplicarFiltros = (novosFiltros) => {
        router.get("/dev/painel", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const mudarPeriodo = (periodo) => aplicarFiltros({ periodo, data_inicio: undefined, data_fim: undefined });
    const mudarIntervalo = (data_inicio, data_fim) => aplicarFiltros({ periodo: "personalizado", data_inicio, data_fim });

    const totalDocumentos = documentosGerados.reduce((soma, d) => soma + d.valor, 0);
    const seccaoMaisUsada = usoPorSeccao[0];

    // KPIs do Desenvolvedor: só sobre a saúde/performance da app (nunca sobre
    // o negócio de facturação) — o resto do painel abaixo continua a mostrar
    // uso do sistema (secções, utilizadores, documentos) para fins técnicos.
    const metrics = [
        { label: "Pedidos no período", value: formatarInteiro(totalAcessosPeriodo), icon: Activity, tone: "cyan" },
        { label: "Tempo médio de resposta", value: formatarMs(tempoMedioResposta), icon: Timer, tone: "amber" },
        { label: "Tempo médio de consulta à BD", value: formatarMs(tempoMedioBd), icon: Database, tone: "emerald" },
        { label: "Erros por resolver", value: formatarInteiro(errosPorResolver), icon: AlertTriangle, tone: errosPorResolver > 0 ? "rose" : "emerald" },
    ];

    return (
        <DevLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Painel Técnico</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Uso do sistema, documentos gerados, e quem mais acede.
                        </p>
                    </div>
                    <PeriodoFiltro
                        periodo={filtros.periodo}
                        onChange={mudarPeriodo}
                        dataInicio={filtros.data_inicio}
                        dataFim={filtros.data_fim}
                        onChangeIntervalo={mudarIntervalo}
                        layoutId="dev-periodo-pill"
                    />
                </div>
            }
        >
            <Head title="Painel Técnico" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.24}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <LineChartIcon className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Documentos gerados
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Facturas + recibos, últimos 6 meses
                                </p>
                                <div className="mt-5">
                                    <LineChart
                                        dados={documentosGerados}
                                        chave="valor"
                                        cor="#2a78d6"
                                        valorFormatter={(v) => `${formatarInteiro(v)} documento(s)`}
                                    />
                                </div>
                            </div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.3}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <FileStack className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Facturas vs. recibos
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Últimos 6 meses</p>
                                <div className="mt-5">
                                    <AreaChart
                                        dados={facturasVsRecibos}
                                        series={FACTURAS_VS_RECIBOS_SERIES}
                                        valorFormatter={(v) => `${formatarInteiro(v)} documento(s)`}
                                    />
                                </div>
                            </div>
                        </AnimatedPanel>
                    </section>

                    <AnimatedPanel delay={0.33}>
                        <div className="p-6">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <Gauge className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Performance — tempo de pedido e de base de dados
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Médias diárias, últimos 14 dias (milissegundos)
                            </p>
                            <div className="mt-5">
                                <AreaChart
                                    dados={desempenhoBaseDados}
                                    series={DESEMPENHO_SERIES}
                                    valorFormatter={(v) => `${v} ms`}
                                    obterRotulo={(d) => d.rotulo}
                                    obterRotuloEixo={(d) => d.rotulo}
                                />
                            </div>
                        </div>
                    </AnimatedPanel>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.36} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                    Utilizadores mais activos
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No período seleccionado</p>
                            </div>
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                {utilizadoresMaisActivos.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Sem acessos registados neste período.</p>
                                ) : (
                                    utilizadoresMaisActivos.map((linha, index) => (
                                        <motion.div key={linha.utilizador} variants={itemVariants} className="flex items-center justify-between gap-3 px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                    {index + 1}
                                                </span>
                                                <p className="font-medium text-slate-900 dark:text-white">{linha.utilizador}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                                                {formatarInteiro(linha.total)} acesso(s)
                                            </span>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.42} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <Activity className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Uso por secção
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Se uma secção está no fundo desta lista, talvez não seja usada.
                                </p>
                            </div>
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                {usoPorSeccao.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">Sem acessos registados neste período.</p>
                                ) : (
                                    usoPorSeccao.map((linha) => (
                                        <motion.div key={linha.seccao} variants={itemVariants} className="flex items-center justify-between gap-3 px-6 py-3">
                                            <p className="font-medium capitalize text-slate-900 dark:text-white">{linha.seccao}</p>
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                                {formatarInteiro(linha.total)} acesso(s)
                                            </span>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>
                    </section>
                </div>
            </div>
        </DevLayout>
    );
}
