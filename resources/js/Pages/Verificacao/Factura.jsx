import { Head } from "@inertiajs/react";
import { BadgeCheck, Droplets } from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const estadoConfig = {
    paga: { label: "Paga", classes: "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400" },
    pendente: { label: "Pendente", classes: "border-amber-600 text-amber-700 dark:border-amber-500 dark:text-amber-400" },
    parcial: { label: "Parcialmente paga", classes: "border-cyan-600 text-cyan-700 dark:border-cyan-500 dark:text-cyan-400" },
    anulada: { label: "Anulada", classes: "border-slate-400 text-slate-500 dark:border-slate-600 dark:text-slate-400" },
};

/**
 * Página pública (sem autenticação) de verificação de autenticidade de uma
 * factura, acedida através do QR code impresso no documento. Chegar aqui já
 * prova que a assinatura da URL é válida — o middleware `signed` rejeita
 * qualquer id adulterado antes de chegar a este componente.
 */
export default function Factura({ documento }) {
    const estado = estadoConfig[documento.estado] ?? estadoConfig.pendente;
    const ehLigacao = documento.tipo === "ligacao";

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
            <Head title={`Verificar factura ${documento.numero}`} />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
                <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-700 text-white">
                        <Droplets className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-950 dark:text-white">Aquafuros</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gestão de Furos de Água</p>
                    </div>
                </div>

                <div className="px-6 py-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                    >
                        <BadgeCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <p className="text-sm font-semibold">Documento verificado — factura autêntica</p>
                    </motion.div>

                    <dl className="mt-6 space-y-4 text-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Número da factura</dt>
                            <dd className="font-semibold text-slate-950 dark:text-white">{documento.numero}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Cliente</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">{documento.cliente}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">
                                {ehLigacao ? "Tipo" : "Período de facturação"}
                            </dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">
                                {ehLigacao ? "Taxa de ligação de água" : `${meses[documento.mes - 1]} de ${documento.ano}`}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Emitida em</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">
                                {formatDateTime(documento.emitidaEm)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Estado</dt>
                            <dd>
                                <span className={`rounded border px-2.5 py-1 text-xs font-bold ${estado.classes}`}>
                                    {estado.label}
                                </span>
                            </dd>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <dt className="font-semibold text-slate-700 dark:text-slate-300">Total a pagar</dt>
                            <dd className="text-lg font-bold text-slate-950 dark:text-white">
                                {formatCurrency(documento.total)}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
                    Verificação automática — não requer autenticação.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços
                </div>
            </motion.div>
        </div>
    );
}
