import { Head, Link } from "@inertiajs/react";
import {
    BarChart3,
    Clock,
    Download,
    Droplets,
    FileText,
    Gauge,
    PieChart,
    Receipt,
    Timer,
    TrendingUp,
    UserPlus,
    UserX,
    Wallet,
    Waves,
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import DistribuicaoMetodoChart from "@/Components/charts/DistribuicaoMetodoChart";
import EvolucaoMensalChart from "@/Components/charts/EvolucaoMensalChart";
import StatusBadge from "@/Components/StatusBadge";
import { formatCurrency } from "@/lib/utils";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dashboard({
    contadores,
    mesActual,
    evolucaoMensal,
    distribuicaoPorMetodo,
    maioresDevedores,
    dividaTotal,
    clientesNovosMes,
    consumoTotalMes,
    ticketMedioPagamento,
    tempoMedioPagamentoDias,
}) {
    const metrics = [
        {
            label: `Taxa de cobrança — ${meses[mesActual.mes - 1]}`,
            value: mesActual.taxaCobranca === null ? "—" : `${mesActual.taxaCobranca}%`,
            detail: `${formatCurrency(mesActual.totalRecebido)} de ${formatCurrency(mesActual.totalFacturado)}`,
            icon: TrendingUp,
            tone: "cyan",
        },
        {
            label: "Dívida total em atraso",
            value: formatCurrency(dividaTotal),
            detail: `${contadores.clientesCortados} cliente(s) cortado(s)`,
            icon: Wallet,
            tone: "rose",
        },
        {
            label: "Leituras por confirmar",
            value: contadores.leiturasPendentes,
            detail: "aguardam validação do técnico",
            icon: Clock,
            tone: "amber",
        },
        {
            label: "Leituras confirmadas sem factura",
            value: contadores.leiturasSemFactura,
            detail: "prontas para facturar",
            icon: FileText,
            tone: "emerald",
        },
    ];

    const secondaryMetrics = [
        {
            label: "Clientes novos este mês",
            value: clientesNovosMes,
            detail: `${contadores.clientesActivos} de ${contadores.clientesTotal} activos`,
            icon: UserPlus,
            tone: "cyan",
        },
        {
            label: "Consumo total do mês",
            value: `${consumoTotalMes.toLocaleString("pt-PT", { maximumFractionDigits: 0 })} m³`,
            detail: "somado de todas as leituras do período",
            icon: Droplets,
            tone: "emerald",
        },
        {
            label: "Ticket médio por pagamento",
            value: ticketMedioPagamento === null ? "—" : formatCurrency(ticketMedioPagamento),
            detail: `${mesActual.numeroPagamentos} pagamento(s) este mês`,
            icon: Receipt,
            tone: "amber",
        },
        {
            label: "Tempo médio até pagamento",
            value: tempoMedioPagamentoDias === null ? "—" : `${tempoMedioPagamentoDias} dia(s)`,
            detail: "da emissão da factura ao 1º pagamento",
            icon: Timer,
            tone: "rose",
        },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Painel do administrador
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Visão geral
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200">
                            <Waves className="h-4 w-4" aria-hidden="true" />
                            Sistema operacional
                        </div>
                        <Link
                            href="/admin/kpis"
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="Ver painel de KPIs dedicado, com filtros de período"
                        >
                            <Gauge className="h-4 w-4" aria-hidden="true" />
                            KPIs
                        </Link>
                        <a
                            href="/admin/dashboard/exportar"
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="Exportar KPIs e estatísticas em CSV"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Exportar
                        </a>
                    </div>
                </div>
            }
        >
            <Head title="Painel do Administrador" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {secondaryMetrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={0.24 + index * 0.05} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.46}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <BarChart3 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Evolução mensal
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Facturado vs. recebido, últimos 6 meses
                                </p>
                                <div className="mt-5">
                                    <EvolucaoMensalChart dados={evolucaoMensal} />
                                </div>
                            </div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.52}>
                            <div className="p-6">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <PieChart className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Pagamentos por método
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {meses[mesActual.mes - 1]} de {mesActual.ano}
                                </p>
                                <div className="mt-5">
                                    <DistribuicaoMetodoChart dados={distribuicaoPorMetodo} />
                                </div>
                            </div>
                        </AnimatedPanel>
                    </section>

                    <AnimatedPanel delay={0.58} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                                <UserX className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                                Maiores devedores
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Top 5 clientes por dívida acumulada
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
