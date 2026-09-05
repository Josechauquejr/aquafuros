import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, FileText, Receipt, RotateCcw, Trash2, Waves } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

export default function Lixeira({ clientes, diasRetencao }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);

    const restaurar = (cliente) => {
        router.post(`/clientes/lixeira/${cliente.id}/restaurar`, {}, { preserveScroll: true });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/clientes/lixeira/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div>
                    <Link
                        href="/clientes"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar a Clientes
                    </Link>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Administração
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Lixeira</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Clientes eliminados ficam aqui {diasRetencao} dias — podem ser recuperados ou apagados
                        definitivamente antes disso. Depois desse prazo, são apagados automaticamente.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    {clientes.length === 0 ? (
                        <AnimatedPanel delay={0.1}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                A lixeira está vazia.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                            {clientes.map((cliente) => (
                                <motion.div key={cliente.id} variants={itemVariants}>
                                    <AnimatedPanel className="p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{cliente.nome}</p>
                                                    <StatusBadge tone={cliente.dias_restantes <= 5 ? "rose" : "amber"}>
                                                        {cliente.dias_restantes > 0
                                                            ? `${cliente.dias_restantes} dia(s) restante(s)`
                                                            : "elimina no próximo acesso à lixeira"}
                                                    </StatusBadge>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {cliente.numero_cliente} &middot; {cliente.bairro || "—"} &middot; {cliente.tarifa ?? "—"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                    Eliminado em {formatDateTime(cliente.eliminado_em)}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {cliente.facturas_count} factura(s)
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Waves className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {cliente.leituras_count} leitura(s)
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {cliente.pagamentos_count} pagamento(s)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <IconButton tone="success" onClick={() => restaurar(cliente)} title="Recuperar cliente">
                                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                                </IconButton>
                                                <IconButton tone="danger" onClick={() => setParaEliminar(cliente)} title="Eliminar definitivamente">
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
                        ? `Eliminar "${paraEliminar.nome}" definitivamente, junto com todas as suas facturas, leituras e pagamentos? Esta acção não pode ser desfeita.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
