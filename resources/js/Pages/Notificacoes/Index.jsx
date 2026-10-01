import { Head, Link, router } from "@inertiajs/react";
import { BellRing, Mail, RotateCw, Send, Trash2 } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import Pagination from "@/Components/Pagination";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatDateTime } from "@/lib/utils";

const tipos = {
    lembrete_vencimento: "Lembrete de vencimento",
    atraso: "Atraso",
    atraso_grave: "Atraso grave",
};
const tomEstado = { pendente: "amber", enviada: "emerald", falhou: "rose" };
const rotuloEstado = { pendente: "Por enviar", enviada: "Enviado", falhou: "Falhou" };

export default function Index({ notificacoes, contagens, automatico, filtros }) {
    const separadores = [
        ["pendente", `Por enviar (${contagens.pendente})`],
        ["enviada", `Enviados (${contagens.enviada})`],
        ["falhou", `Falharam (${contagens.falhou})`],
        ["todas", "Todos"],
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Cobrança</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Emails de cobrança</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Lembretes antes do vencimento e avisos de atraso, com a factura em PDF anexada. Saem por email, só para clientes que têm email.{" "}
                            {automatico
                                ? "O envio é automático, todos os dias às 08:00."
                                : "O envio automático está desligado (Administração › Email) — use \"Gerar e enviar agora\"."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/emails" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                            <Mail className="h-4 w-4" aria-hidden="true" /> Histórico de emails
                        </Link>
                        <AnimatedButton variant="secondary" onClick={() => router.post("/notificacoes/gerar", {}, { preserveScroll: true })}>
                            <BellRing className="h-4 w-4" aria-hidden="true" />
                            Gerar e enviar agora
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Emails de cobrança" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <nav className="flex flex-wrap gap-2" aria-label="Estado">
                        {separadores.map(([valor, rotulo]) => (
                            <Link
                                key={valor}
                                href={`/notificacoes?estado=${valor}`}
                                preserveScroll
                                className={cn(
                                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                                    filtros.estado === valor
                                        ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
                                )}
                            >
                                {rotulo}
                            </Link>
                        ))}
                    </nav>

                    <AnimatedPanel className="overflow-hidden">
                        {notificacoes.data.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum email nesta lista.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notificacoes.data.map((n) => (
                                    <li key={n.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-white">
                                                {n.cliente?.nome ?? "Cliente removido"}
                                                <StatusBadge tone={tomEstado[n.estado]}>{rotuloEstado[n.estado]}</StatusBadge>
                                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{tipos[n.tipo] ?? n.tipo}</span>
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.mensagem}</p>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                                                <span className="inline-flex items-center gap-1">
                                                    <Mail className="h-3 w-3" aria-hidden="true" /> {n.email ?? "sem email"}
                                                </span>
                                                {n.dias_atraso > 0 && <span className="font-medium text-amber-600">{n.dias_atraso} dia(s) de atraso hoje</span>}
                                                <span>criado {formatDateTime(n.created_at)}</span>
                                                {n.enviada_em && <span>· enviado {formatDateTime(n.enviada_em)}</span>}
                                                {n.erro && <span className="text-rose-500">· {n.erro}</span>}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => router.post(`/notificacoes/${n.id}/enviar`, {}, { preserveScroll: true })}
                                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200"
                                            >
                                                {n.estado === "enviada" ? <RotateCw className="h-3.5 w-3.5" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                                                {n.estado === "enviada" ? "Reenviar" : n.estado === "falhou" ? "Tentar de novo" : "Enviar agora"}
                                            </button>
                                            {n.estado !== "enviada" && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.delete(`/notificacoes/${n.id}`, { preserveScroll: true })}
                                                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs text-slate-500 hover:text-rose-600"
                                                    aria-label="Descartar email"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AnimatedPanel>

                    <Pagination paginador={notificacoes} />
                </div>
            </div>
        </AdminLayout>
    );
}
