import { Head, Link } from "@inertiajs/react";
import { Banknote, Lock, Plus, Receipt, Wallet } from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import StatusBadge from "@/Components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const estadoFacturaConfig = {
    pendente: { label: "Pendente", tone: "amber" },
    parcial: { label: "Parcial", tone: "cyan" },
};

export default function Dashboard({ resumoHoje, ultimosPagamentos, facturasEmAberto, contadorFacturasEmAberto }) {
    const metrics = [
        { label: "Recebido hoje", value: formatCurrency(resumoHoje.totalRecebido), icon: Wallet, tone: "cyan" },
        { label: "Pagamentos hoje", value: resumoHoje.quantidade, icon: Receipt, tone: "emerald" },
        {
            label: "Ticket médio hoje",
            value: resumoHoje.ticketMedio === null ? "—" : formatCurrency(resumoHoje.ticketMedio),
            icon: Banknote,
            tone: "amber",
        },
        { label: "Facturas em aberto", value: contadorFacturasEmAberto, icon: Receipt, tone: "rose" },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Tesouraria
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Painel da Caixa
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            O que recebeu hoje e as facturas ainda por cobrar.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/pagamentos/fecho-caixa"
                            target="_blank"
                            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <Lock className="h-4 w-4" aria-hidden="true" />
                            Fecho de caixa
                        </Link>
                        <Link
                            href="/pagamentos"
                            className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Registar pagamento
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Painel da Caixa" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.24} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="font-semibold text-slate-950 dark:text-white">
                                    Os seus últimos recibos
                                </h3>
                            </div>
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {ultimosPagamentos.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Ainda não registou pagamentos hoje.
                                    </p>
                                ) : (
                                    ultimosPagamentos.map((pagamento) => (
                                        <motion.div
                                            key={pagamento.id}
                                            variants={itemVariants}
                                            className="flex items-center justify-between gap-3 px-6 py-3"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">
                                                    {pagamento.cliente?.nome ?? "Cliente removido"}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {pagamento.numero_recibo} &middot; {metodoLabels[pagamento.metodo_pagamento]} &middot;{" "}
                                                    {formatDateTime(pagamento.created_at)}
                                                </p>
                                            </div>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(pagamento.valor_pago)}
                                            </span>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.3} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="font-semibold text-slate-950 dark:text-white">Facturas em aberto</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    As mais antigas primeiro — prioridade de cobrança.
                                </p>
                            </div>
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {facturasEmAberto.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Não há facturas pendentes ou parciais no momento.
                                    </p>
                                ) : (
                                    facturasEmAberto.map((factura) => {
                                        const estado = estadoFacturaConfig[factura.estado];
                                        return (
                                            <motion.div key={factura.id} variants={itemVariants}>
                                                <Link
                                                    href="/pagamentos"
                                                    className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                >
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">
                                                            {factura.cliente?.nome ?? "Cliente removido"}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {factura.numero_factura} &middot; {meses[factura.mes - 1]}/{factura.ano}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(factura.total_pagar)}
                                                        </span>
                                                        <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </motion.div>
                        </AnimatedPanel>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
