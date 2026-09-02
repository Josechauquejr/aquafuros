import { Head } from "@inertiajs/react";
import { BadgeCheck, Droplets } from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

/**
 * Página pública (sem autenticação) de verificação de autenticidade de um
 * recibo de pagamento, acedida através do QR code impresso no documento.
 * Chegar aqui já prova que a assinatura da URL é válida — o middleware
 * `signed` rejeita qualquer id adulterado antes de chegar a este componente.
 */
export default function Pagamento({ documento }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
            <Head title={`Verificar recibo ${documento.numero}`} />

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
                        <p className="text-sm font-semibold">Documento verificado — recibo autêntico</p>
                    </motion.div>

                    <dl className="mt-6 space-y-4 text-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Número do recibo</dt>
                            <dd className="font-semibold text-slate-950 dark:text-white">{documento.numero}</dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Cliente</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">{documento.cliente}</dd>
                        </div>
                        {documento.factura && (
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                <dt className="text-slate-500 dark:text-slate-400">Referente à factura</dt>
                                <dd className="font-medium text-slate-800 dark:text-slate-200">{documento.factura}</dd>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Método de pagamento</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">
                                {metodoLabels[documento.metodo] ?? documento.metodo}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <dt className="text-slate-500 dark:text-slate-400">Emitido em</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200">
                                {formatDateTime(documento.emitidoEm)}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <dt className="font-semibold text-slate-700 dark:text-slate-300">Valor pago</dt>
                            <dd className="text-lg font-bold text-slate-950 dark:text-white">
                                {formatCurrency(documento.valor)}
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
