import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const roleConfig = {
    administrador: { label: "Administrador", tone: "rose" },
    desenvolvedor: { label: "Desenvolvedor", tone: "slate" },
    gestor: { label: "Gestor", tone: "cyan" },
    caixa: { label: "Caixa", tone: "amber" },
    tecnico: { label: "Técnico", tone: "emerald" },
};

export default function Lixeira({ utilizadores, diasRetencao }) {
    const { flash } = usePage().props;
    const [paraEliminar, setParaEliminar] = useState(null);

    const restaurar = (utilizador) => {
        router.post(`/dev/users/lixeira/${utilizador.id}/restaurar`, {}, { preserveScroll: true });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/dev/users/lixeira/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <DevLayout
            header={
                <div>
                    <Link
                        href="/dev/users"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        Voltar a Usuários
                    </Link>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                        Controlo de acesso
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        Lixeira de usuários
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Contas eliminadas ficam aqui {diasRetencao} dias — o histórico de facturas, leituras e
                        pagamentos que geraram mantém-se sempre, mesmo apagadas de vez.
                    </p>
                </div>
            }
        >
            <Head title="Lixeira de usuários" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    {utilizadores.length === 0 ? (
                        <AnimatedPanel delay={0.1}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                A lixeira está vazia.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                            {utilizadores.map((utilizador) => {
                                const role = roleConfig[utilizador.papel] ?? { label: utilizador.papel ?? "—", tone: "slate" };

                                return (
                                    <motion.div key={utilizador.id} variants={itemVariants}>
                                        <AnimatedPanel className="p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {utilizador.name}
                                                        </p>
                                                        <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                                                        <StatusBadge tone={utilizador.dias_restantes <= 5 ? "rose" : "amber"}>
                                                            {utilizador.dias_restantes > 0
                                                                ? `${utilizador.dias_restantes} dia(s) restante(s)`
                                                                : "elimina no próximo acesso à lixeira"}
                                                        </StatusBadge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        @{utilizador.username} &middot; {utilizador.email}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                        Eliminado em {formatDateTime(utilizador.eliminado_em)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <IconButton tone="success" onClick={() => restaurar(utilizador)} title="Recuperar utilizador">
                                                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton tone="danger" onClick={() => setParaEliminar(utilizador)} title="Eliminar definitivamente">
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </AnimatedPanel>
                                    </motion.div>
                                );
                            })}
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
                        ? `Eliminar "${paraEliminar.name}" (@${paraEliminar.username}) definitivamente? Esta acção não pode ser desfeita.`
                        : ""
                }
            />
        </DevLayout>
    );
}
