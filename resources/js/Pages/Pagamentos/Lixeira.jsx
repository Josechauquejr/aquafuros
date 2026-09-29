import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import StatusBadge from "@/Components/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

/**
 * Pagamentos estornados (PagamentoController::destroy) ou eliminados
 * isoladamente — não inclui os que fazem parte da lixeira de um cliente
 * eliminado.
 */
export default function Lixeira({ pagamentos, diasRetencao }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);

    const restaurar = (pagamento) => {
        router.post(`/pagamentos/lixeira/${pagamento.id}/restaurar`, {}, { preserveScroll: true });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/pagamentos/lixeira/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div>
                    <Link
                        href="/pagamentos"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar a Pagamentos
                    </Link>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Administração
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        Lixeira de pagamentos
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Pagamentos estornados ficam aqui {diasRetencao} dias antes de serem apagados
                        automaticamente.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira de pagamentos" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    {pagamentos.length === 0 ? (
                        <AnimatedPanel delay={0.1}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                A lixeira está vazia.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                            {pagamentos.map((pagamento) => (
                                <motion.div key={pagamento.id} variants={itemVariants}>
                                    <AnimatedPanel className="p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {pagamento.numero_recibo} &middot; {pagamento.cliente}
                                                    </p>
                                                    <StatusBadge tone={pagamento.dias_restantes <= 5 ? "rose" : "amber"}>
                                                        {pagamento.dias_restantes > 0
                                                            ? `${pagamento.dias_restantes} dia(s) restante(s)`
                                                            : "elimina no próximo acesso à lixeira"}
                                                    </StatusBadge>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {formatCurrency(pagamento.valor_pago)} &middot;{" "}
                                                    {metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}
                                                    {pagamento.factura ? ` · Factura ${pagamento.factura}` : ""}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                    Eliminado em {formatDateTime(pagamento.eliminado_em)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <IconButton tone="success" onClick={() => restaurar(pagamento)} title="Recuperar pagamento">
                                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                                </IconButton>
                                                <IconButton tone="danger" onClick={() => setParaEliminar(pagamento)} title="Eliminar definitivamente">
                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                </IconButton>
                                            </div>
                                        </div>
                                    </AnimatedPanel>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar definitivamente"
                confirmLabel="Eliminar para sempre"
                description={
                    paraEliminar
                        ? `Eliminar o recibo ${paraEliminar.numero_recibo} definitivamente? Esta acção não pode ser desfeita.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
