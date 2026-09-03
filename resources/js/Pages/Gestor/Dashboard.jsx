import { Head, Link } from "@inertiajs/react";
import {
    AlertTriangle,
    Banknote,
    FileText,
    TrendingUp,
    UserX,
    Users,
    Waves,
} from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InlineNotice from "@/Components/InlineNotice";
import KpiCard from "@/Components/KpiCard";
import { formatCurrency } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const atalhos = [
    { label: "Clientes", href: "/clientes", icon: Users, tone: "cyan" },
    { label: "Leituras", href: "/leituras", icon: Waves, tone: "emerald" },
    { label: "Facturas", href: "/facturas", icon: FileText, tone: "amber" },
    { label: "Pagamentos", href: "/pagamentos", icon: Banknote, tone: "rose" },
];

const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default function Dashboard({ resumoMes, contadores, dividaTotal, maioresDevedores }) {
    const metrics = [
        {
            label: "Facturado este mês",
            value: formatCurrency(resumoMes.totalFacturado),
            detail: `${resumoMes.numeroFacturas} factura(s)`,
            icon: FileText,
            tone: "cyan",
        },
        {
            label: "Recebido este mês",
            value: formatCurrency(resumoMes.totalRecebido),
            icon: Banknote,
            tone: "emerald",
        },
        {
            label: "Taxa de cobrança",
            value: resumoMes.taxaCobranca === null ? "—" : `${resumoMes.taxaCobranca}%`,
            icon: TrendingUp,
            tone: "amber",
        },
        {
            label: "Clientes activos",
            value: contadores.clientesActivos,
            detail: contadores.clientesCortados > 0 ? `${contadores.clientesCortados} cortado(s)` : undefined,
            icon: Users,
            tone: "rose",
        },
    ];

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Gestão operacional
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        Painel do Gestor
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {meses[resumoMes.mes - 1]} de {resumoMes.ano} — visão geral de facturação, cobrança e leituras.
                    </p>
                </div>
            }
        >
            <Head title="Painel do Gestor" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={contadores.leiturasSemFactura > 0} tone="error">
                        {contadores.leiturasSemFactura} leitura(s) confirmada(s) ainda sem factura emitida —{" "}
                        <Link href="/facturas" className="font-semibold underline">
                            emitir agora
                        </Link>
                        .
                    </InlineNotice>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <AnimatedPanel delay={0.24} className="p-6">
                        <h3 className="font-semibold text-slate-950 dark:text-white">Acesso rápido</h3>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {atalhos.map((atalho) => {
                                const Icon = atalho.icon;
                                return (
                                    <Link
                                        key={atalho.href}
                                        href={atalho.href}
                                        className="flex items-center gap-3 rounded-md border border-slate-200 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/50 dark:border-slate-800 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/20"
                                    >
                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClasses[atalho.tone]}`}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">{atalho.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </AnimatedPanel>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.3} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <UserX className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                                    Maiores devedores
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Dívida total acumulada: {formatCurrency(dividaTotal)}
                                </p>
                            </div>
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {maioresDevedores.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Nenhum cliente em dívida no momento.
                                    </p>
                                ) : (
                                    maioresDevedores.map((divida, index) => (
                                        <motion.div key={divida.id} variants={itemVariants}>
                                            <Link
                                                href="/clientes"
                                                className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        {index + 1}
                                                    </span>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {divida.cliente?.nome ?? "Cliente removido"}
                                                    </p>
                                                </div>
                                                <span className="font-semibold text-rose-600 dark:text-rose-400">
                                                    {formatCurrency(divida.valor_divida)}
                                                </span>
                                            </Link>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.36} className="p-6">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                Pendências operacionais
                            </h3>
                            <dl className="mt-4 space-y-3 text-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                    <dt className="text-slate-600 dark:text-slate-300">Leituras por confirmar</dt>
                                    <dd className="font-semibold text-slate-950 dark:text-white">{contadores.leiturasPendentes}</dd>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                    <dt className="text-slate-600 dark:text-slate-300">Leituras confirmadas sem factura</dt>
                                    <dd className="font-semibold text-slate-950 dark:text-white">{contadores.leiturasSemFactura}</dd>
                                </div>
                                <div className="flex items-center justify-between">
                                    <dt className="text-slate-600 dark:text-slate-300">Clientes cortados</dt>
                                    <dd className="font-semibold text-slate-950 dark:text-white">{contadores.clientesCortados}</dd>
                                </div>
                            </dl>
                        </AnimatedPanel>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
