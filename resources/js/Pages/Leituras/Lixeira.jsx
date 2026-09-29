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
import { formatDateTime, formatNumero } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

/**
 * Leituras eliminadas isoladamente (nunca facturadas) — não inclui as
 * anuladas em cascata ao anular uma factura, nem as apagadas junto com um
 * cliente (essas ficam na lixeira desse cliente).
 */
export default function Lixeira({ leituras, diasRetencao }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);

    const restaurar = (leitura) => {
        router.post(`/leituras/lixeira/${leitura.id}/restaurar`, {}, { preserveScroll: true });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/leituras/lixeira/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div>
                    <Link
                        href="/leituras"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar a Leituras
                    </Link>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Administração
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        Lixeira de leituras
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Leituras eliminadas ficam aqui {diasRetencao} dias antes de serem apagadas
                        automaticamente.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira de leituras" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    {leituras.length === 0 ? (
                        <AnimatedPanel delay={0.1}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                A lixeira está vazia.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                            {leituras.map((leitura) => (
                                <motion.div key={leitura.id} variants={itemVariants}>
                                    <AnimatedPanel className="p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {leitura.cliente}
                                                    </p>
                                                    <StatusBadge tone={leitura.dias_restantes <= 5 ? "rose" : "amber"}>
                                                        {leitura.dias_restantes > 0
                                                            ? `${leitura.dias_restantes} dia(s) restante(s)`
                                                            : "elimina no próximo acesso à lixeira"}
                                                    </StatusBadge>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {leitura.periodo} &middot; leitura {formatNumero(leitura.leitura_actual)}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                    Eliminada em {formatDateTime(leitura.eliminado_em)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <IconButton tone="success" onClick={() => restaurar(leitura)} title="Recuperar leitura">
                                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                                </IconButton>
                                                <IconButton tone="danger" onClick={() => setParaEliminar(leitura)} title="Eliminar definitivamente">
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
                        ? `Eliminar a leitura de ${paraEliminar.cliente} (${paraEliminar.periodo}) definitivamente? Esta acção não pode ser desfeita.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
