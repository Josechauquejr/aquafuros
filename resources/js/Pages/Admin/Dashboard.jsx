import { Head, Link } from "@inertiajs/react";
import {
    AlertTriangle,
    BarChart3,
    Banknote,
    Clock,
    Download,
    Droplets,
    FileStack,
    FileText,
    Gauge,
    Receipt,
    TrendingUp,
    UserPlus,
    Wallet,
    Waves,
} from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import KpiCard from "@/Components/KpiCard";
import SeletorMes from "@/Components/SeletorMes";
import DevedoresChart from "@/Components/charts/DevedoresChart";
import DistribuicaoMetodoChart from "@/Components/charts/DistribuicaoMetodoChart";
import GraficoSerie, { FILTROS_MESES, formatarCompacto, rotuloMensal } from "@/Components/charts/GraficoSerie";
import { formatMoney, formatVolume } from "@/lib/utils";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dashboard({
    mesReferencia,
    contadores,
    mesActual,
    evolucaoMensal,
    distribuicaoPorMetodo,
    maioresDevedores,
    dividaTotal,
    consumoTotalMes,
    facturasVencidas,
}) {
    const nomeMes = meses[mesActual.mes - 1];
    // Os cartões abrem a página com o MESMO intervalo, onde o total tem de bater certo.
    const ultimoDia = new Date(mesActual.ano, mesActual.mes, 0).getDate();
    const mm = String(mesActual.mes).padStart(2, "0");
    const intervalo = `periodo=personalizado&data_inicio=${mesActual.ano}-${mm}-01&data_fim=${mesActual.ano}-${mm}-${ultimoDia}`;
    const ultimos = evolucaoMensal.slice(-6);
    const totalLeituras = contadores.leiturasConfirmadas + contadores.leiturasPendentes;

    // Indicadores DO MÊS escolhido — cada um com um gráfico desenhado com
    // os números reais (evolução dos últimos meses, percentagem, partes).
    const doMes = [
        {
            label: `Facturado — ${nomeMes}`,
            value: formatMoney(mesActual.totalFacturado),
            detail: `${mesActual.numeroFacturas} factura(s) emitida(s) no mês`,
            icon: FileText,
            tone: "cyan",
            href: `/facturas?${intervalo}`,
            grafico: {
                tipo: "spark",
                serie: ultimos.map((d) => d.facturado),
                rotulos: ultimos.map(rotuloMensal),
                formatar: formatMoney,
            },
        },
        {
            label: `Recebido — ${nomeMes}`,
            value: formatMoney(mesActual.totalRecebido),
            detail: `${mesActual.numeroPagamentos} pagamento(s) recebido(s) no mês`,
            icon: Banknote,
            tone: "emerald",
            href: `/pagamentos?${intervalo}`,
            grafico: {
                tipo: "spark",
                serie: ultimos.map((d) => d.recebido),
                rotulos: ultimos.map(rotuloMensal),
                formatar: formatMoney,
            },
        },
        {
            label: "Taxa de cobrança",
            value: mesActual.taxaCobranca === null ? "—" : `${mesActual.taxaCobranca}%`,
            detail: "recebido no mês ÷ facturado no mês",
            icon: TrendingUp,
            tone: "amber",
            grafico: { tipo: "radial", valor: mesActual.taxaCobranca ?? 0 },
        },
        {
            label: "Leituras por confirmar",
            value: contadores.leiturasPendentes,
            detail: `${contadores.leiturasConfirmadas} de ${totalLeituras} já confirmadas`,
            icon: Clock,
            tone: "rose",
            href: "/leituras?estado=pendente",
            grafico: {
                tipo: "donut",
                series: [contadores.leiturasConfirmadas, contadores.leiturasPendentes],
                labels: ["Confirmadas", "Por confirmar"],
                cores: ["#10b981", "#f43f5e"],
                formatar: (v) => String(Math.round(v)),
            },
        },
    ];

    // Situação de AGORA — não depende do mês escolhido.
    const situacao = [
        {
            label: "Dívida total em atraso",
            value: formatMoney(dividaTotal),
            detail: contadores.clientesCortadosSemDivida > 0
                ? `${contadores.clientesCortados} cortado(s) — ${contadores.clientesCortadosSemDivida} já sem dívida`
                : `${contadores.clientesCortados} cliente(s) cortado(s)`,
            icon: Wallet,
            tone: "rose",
            href: "/clientes?so_divida=1",
        },
        {
            label: "Facturas vencidas",
            value: facturasVencidas.quantidade,
            detail: `${formatMoney(facturasVencidas.valor)} por receber`,
            icon: AlertTriangle,
            tone: facturasVencidas.quantidade > 0 ? "rose" : "emerald",
            href: "/facturas?estado=vencida",
        },
        {
            label: "Leituras confirmadas sem factura",
            value: contadores.leiturasSemFactura,
            detail: "prontas para facturar",
            icon: Receipt,
            tone: "amber",
            href: "/facturas",
        },
        {
            label: `Consumo de água — ${nomeMes}`,
            value: formatVolume(consumoTotalMes),
            detail: "somado de todas as leituras do mês",
            icon: Droplets,
            tone: "cyan",
        },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Painel do administrador
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Visão geral
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <SeletorMes rota="/admin/dashboard" mesReferencia={mesReferencia} />
                        <Link
                            href="/admin/kpis"
                            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="Ver painel de KPIs dedicado, com filtros de período"
                        >
                            <Gauge className="h-4 w-4" aria-hidden="true" />
                            KPIs
                        </Link>
                        <a
                            href={`/admin/dashboard/exportar${mesReferencia.eActual ? "" : `?mes=${mesReferencia.valor}`}`}
                            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                    <section className="flex flex-wrap gap-2">
                        {[
                            { label: "Emitir factura", href: "/facturas", icon: FileStack },
                            { label: "Registar leitura", href: "/leituras", icon: Waves },
                            { label: "Registar pagamento", href: "/pagamentos", icon: Banknote },
                            { label: "Novo cliente", href: "/clientes", icon: UserPlus },
                        ].map((accao) => (
                            <Link
                                key={accao.label}
                                href={accao.href}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
                            >
                                <accao.icon className="h-4 w-4" aria-hidden="true" />
                                {accao.label}
                            </Link>
                        ))}
                    </section>

                    <section>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {mesReferencia.rotulo}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                            {doMes.map((metric, index) => (
                                <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Situação actual
                            <span className="ml-2 font-normal normal-case tracking-normal">
                                — o estado de agora, não depende do mês escolhido
                                {!mesReferencia.eActual && ` (excepto o consumo de ${nomeMes})`}
                            </span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            {situacao.map((metric, index) => (
                                <KpiCard key={metric.label} {...metric} delay={0.24 + index * 0.05} />
                            ))}
                        </div>
                    </section>

                    <GraficoSerie
                        titulo="Evolução mensal"
                        descricao={`Facturado vs. recebido, até ${nomeMes}`}
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
                        <DistribuicaoMetodoChart
                            dados={distribuicaoPorMetodo}
                            descricao={`Valor recebido em ${nomeMes} de ${mesActual.ano}, por método`}
                        />
                        <DevedoresChart devedores={maioresDevedores} />
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
