import { Head } from "@inertiajs/react";
import {
    Banknote,
    ClipboardCheck,
    FileText,
    Gauge,
    TrendingUp,
    Users,
    Waves,
} from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";

const metrics = [
    {
        label: "Clientes activos",
        value: "1.248",
        detail: "+8.2% este mes",
        icon: Users,
    },
    {
        label: "Leituras registadas",
        value: "892",
        detail: "72% do ciclo",
        icon: Gauge,
    },
    {
        label: "Facturas emitidas",
        value: "1.104",
        detail: "MZN 1.8M",
        icon: FileText,
    },
    {
        label: "Pagamentos",
        value: "MZN 946k",
        detail: "+14.5% recuperado",
        icon: Banknote,
    },
];

const actions = [
    "Registar nova leitura",
    "Emitir facturas do ciclo",
    "Confirmar pagamentos pendentes",
];

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Operacao Aquafuros
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Página Principal
                        </h2>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200">
                        <Waves className="h-4 w-4" aria-hidden="true" />
                        Ciclo de cobranca em curso
                    </div>
                </div>
            }
        >
            <Head title="Página Principal" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => {
                            const Icon = metric.icon;

                            return (
                                <AnimatedPanel key={metric.label} delay={index * 0.06}>
                                    <div className="flex items-start justify-between p-5">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {metric.label}
                                            </p>
                                            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                                                {metric.value}
                                            </p>
                                            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                                <TrendingUp
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                />
                                                {metric.detail}
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                    </div>
                                </AnimatedPanel>
                            );
                        })}
                    </section>

                    <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                        <AnimatedPanel className="overflow-hidden" delay={0.22}>
                            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                                    Visao operacional
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Acompanhe o estado do ciclo de leituras e cobrancas.
                                </p>
                            </div>

                            <div className="grid gap-4 p-6 md:grid-cols-3">
                                {["Leituras", "Facturacao", "Recebimentos"].map(
                                    (label, index) => (
                                        <div
                                            key={label}
                                            className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {label}
                                            </p>
                                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                <div
                                                    className="h-full rounded-full bg-cyan-600 dark:bg-cyan-400"
                                                    style={{ width: `${82 - index * 14}%` }}
                                                />
                                            </div>
                                            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {82 - index * 14}% concluido
                                            </p>
                                        </div>
                                    ),
                                )}
                            </div>
                        </AnimatedPanel>

                        <AnimatedPanel delay={0.3}>
                            <div className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                        <ClipboardCheck
                                            className="h-5 w-5"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-950 dark:text-white">
                                            Accoes prioritarias
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Fluxos para hoje
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {actions.map((action) => (
                                        <button
                                            key={action}
                                            type="button"
                                            className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-800 dark:text-slate-200 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/50 dark:hover:text-cyan-200"
                                        >
                                            {action}
                                            <span className="text-cyan-700 dark:text-cyan-300">
                                                Abrir
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </AnimatedPanel>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
