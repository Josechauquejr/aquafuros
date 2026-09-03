import { Head, Link } from "@inertiajs/react";
import { CheckCircle2, Clock, MapPin, Plus, UserCheck, Waves } from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default function Dashboard({ contadores, leiturasPorConfirmar, clientesSemLeitura }) {
    const metrics = [
        {
            label: "Leituras registadas por si este mês",
            value: contadores.leiturasRegistadasEsteMes,
            icon: Waves,
            tone: "cyan",
        },
        {
            label: "Leituras por confirmar",
            value: contadores.leiturasPendentesConfirmacao,
            detail: "de todos os técnicos",
            icon: Clock,
            tone: "amber",
        },
        {
            label: "Clientes sem leitura este mês",
            value: contadores.clientesSemLeituraEsteMes,
            detail: "ainda por visitar",
            icon: MapPin,
            tone: "rose",
        },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Trabalho de campo
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Painel do Técnico
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Leituras por confirmar e clientes ainda por visitar este mês.
                        </p>
                    </div>
                    <Link
                        href="/leituras"
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Nova leitura
                    </Link>
                </div>
            }
        >
            <Head title="Painel do Técnico" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-3">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <AnimatedPanel delay={0.24} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                                    Leituras por confirmar
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    De todos os técnicos — confirme na página de Leituras.
                                </p>
                            </div>
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {leiturasPorConfirmar.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Não há leituras pendentes de confirmação.
                                    </p>
                                ) : (
                                    leiturasPorConfirmar.map((leitura) => (
                                        <motion.div key={leitura.id} variants={itemVariants}>
                                            <Link
                                                href="/leituras"
                                                className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {leitura.cliente?.nome ?? "Cliente removido"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {meses[leitura.mes - 1]}/{leitura.ano}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                                                    {(Number(leitura.leitura_actual) - Number(leitura.leitura_anterior)).toFixed(2)} m&sup3;
                                                </span>
                                            </Link>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.3} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                    <UserCheck className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                                    Clientes sem leitura este mês
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Clientes activos que ainda não têm leitura registada no período actual.
                                </p>
                            </div>
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {clientesSemLeitura.length === 0 ? (
                                    <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">
                                        Todos os clientes activos já têm leitura registada este mês.
                                    </p>
                                ) : (
                                    clientesSemLeitura.map((cliente) => (
                                        <motion.div key={cliente.id} variants={itemVariants}>
                                            <Link
                                                href="/leituras"
                                                className="flex items-center justify-between gap-3 px-6 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{cliente.nome}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {cliente.numero_cliente} &middot; {cliente.bairro || "—"}
                                                    </p>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </AnimatedPanel>
                    </section>
                </div>
            </div>
        </AdminLayout>
    );
}
