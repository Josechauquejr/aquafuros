import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { AlertTriangle, CheckCircle2, Clock, Hammer, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatDateTime } from "@/lib/utils";

const tipos = { sem_agua: "Sem água", fuga: "Fuga", avaria: "Avaria", contador: "Contador", reclamacao: "Reclamação", outro: "Outro" };
const estados = { aberta: ["Aberta", "rose"], em_curso: ["Em curso", "amber"], resolvida: ["Resolvida", "emerald"] };
const selectClasses =
    "mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function Index({ ocorrencias, zonas, clientes, totais, filtros }) {
    const { auth } = usePage().props;
    const ehAdmin = auth.roles?.includes("administrador") ?? false;
    const [novaAberta, setNovaAberta] = useState(false);
    const [aResolver, setAResolver] = useState(null);
    const form = useForm({ tipo: "sem_agua", descricao: "", cliente_id: "", zona_id: "" });
    const resolver = useForm({ accao: "resolver", resolucao: "" });

    const navegar = (extra) =>
        router.get(
            "/ocorrencias",
            Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([c, v]) => v && v !== "todos" && v !== "todas" && !(c === "estado" && v === "abertas"))),
            { preserveScroll: true, replace: true },
        );

    const registar = (evento) => {
        evento.preventDefault();
        form.post("/ocorrencias", { preserveScroll: true, onSuccess: () => { setNovaAberta(false); form.reset(); } });
    };

    const accao = (ocorrencia, nome) => router.put(`/ocorrencias/${ocorrencia.id}`, { accao: nome }, { preserveScroll: true });

    const concluir = (evento) => {
        evento.preventDefault();
        resolver.put(`/ocorrencias/${aResolver.id}`, { preserveScroll: true, onSuccess: () => { setAResolver(null); resolver.reset(); } });
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Operação</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Avarias e reclamações</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Do aviso à resolução — para saber quanto tempo demora a resposta e onde há mais problemas.
                        </p>
                    </div>
                    <AnimatedButton variant="primary" onClick={() => setNovaAberta(true)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Nova ocorrência
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Ocorrências" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid grid-cols-3 gap-4">
                        <KpiCard label="Abertas" value={totais.abertas} detail="ainda sem ninguém a tratar" icon={AlertTriangle} tone={totais.abertas > 0 ? "rose" : "emerald"} />
                        <KpiCard label="Em curso" value={totais.emCurso} detail="a ser resolvidas" icon={Hammer} tone="amber" />
                        <KpiCard label="Há mais de 48 h" value={totais.maisDe48h} detail="por resolver" icon={Clock} tone={totais.maisDe48h > 0 ? "rose" : "emerald"} />
                    </section>

                    <div className="flex flex-wrap gap-2">
                        <select value={filtros.estado} onChange={(e) => navegar({ estado: e.target.value })} className={`${selectClasses} mt-0 h-10 w-auto`} aria-label="Estado">
                            <option value="abertas">Por resolver</option>
                            <option value="resolvida">Resolvidas</option>
                            <option value="todas">Todas</option>
                        </select>
                        <select value={filtros.tipo} onChange={(e) => navegar({ tipo: e.target.value })} className={`${selectClasses} mt-0 h-10 w-auto`} aria-label="Tipo">
                            <option value="todos">Todos os tipos</option>
                            {Object.entries(tipos).map(([v, r]) => (
                                <option key={v} value={v}>{r}</option>
                            ))}
                        </select>
                        <select value={filtros.zona} onChange={(e) => navegar({ zona: e.target.value })} className={`${selectClasses} mt-0 h-10 w-auto`} aria-label="Zona">
                            <option value="todas">Todas as zonas</option>
                            {zonas.map((z) => (
                                <option key={z.id} value={z.id}>{z.nome}</option>
                            ))}
                        </select>
                    </div>

                    <AnimatedPanel className="overflow-hidden">
                        {ocorrencias.data.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma ocorrência nesta lista.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {ocorrencias.data.map((o) => {
                                    const [rotulo, tom] = estados[o.estado];
                                    return (
                                        <li key={o.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-white">
                                                    {tipos[o.tipo]}
                                                    <StatusBadge tone={tom}>{rotulo}</StatusBadge>
                                                    {o.horas_aberta !== null && o.horas_aberta >= 48 && <StatusBadge tone="rose">há {Math.floor(o.horas_aberta / 24)} dias</StatusBadge>}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{o.descricao}</p>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {o.zona?.nome ?? "sem zona"}
                                                    {o.cliente ? ` · ${o.cliente.nome}` : ""} · reportada {formatDateTime(o.reportada_em)} por {o.registado_por?.name}
                                                    {o.resolvida_em ? ` · resolvida ${formatDateTime(o.resolvida_em)} por ${o.resolvido_por?.name ?? "—"}` : ""}
                                                </p>
                                                {o.resolucao && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">Resolução: {o.resolucao}</p>}
                                            </div>
                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                {o.estado === "aberta" && (
                                                    <SecondaryButton type="button" onClick={() => accao(o, "iniciar")}>
                                                        <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Iniciar
                                                    </SecondaryButton>
                                                )}
                                                {o.estado !== "resolvida" && (
                                                    <SecondaryButton type="button" onClick={() => { resolver.reset(); setAResolver(o); }}>
                                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Resolver
                                                    </SecondaryButton>
                                                )}
                                                {o.estado === "resolvida" && (
                                                    <SecondaryButton type="button" onClick={() => accao(o, "reabrir")}>
                                                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Reabrir
                                                    </SecondaryButton>
                                                )}
                                                {ehAdmin && (
                                                    <button type="button" onClick={() => router.delete(`/ocorrencias/${o.id}`, { preserveScroll: true })} className="px-2 text-slate-400 hover:text-rose-600" aria-label="Apagar ocorrência">
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </AnimatedPanel>
                    <Pagination paginador={ocorrencias} />
                </div>
            </div>

            <Modal show={novaAberta} onClose={() => setNovaAberta(false)} title="Nova ocorrência" maxWidth="lg">
                <form onSubmit={registar} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="tipo" value="Tipo" />
                            <select id="tipo" value={form.data.tipo} onChange={(e) => form.setData("tipo", e.target.value)} className={selectClasses}>
                                {Object.entries(tipos).map(([v, r]) => (
                                    <option key={v} value={v}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="zona_oc" value="Zona" />
                            <select id="zona_oc" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className={selectClasses}>
                                <option value="">— (a do cliente, se indicado)</option>
                                {zonas.map((z) => (
                                    <option key={z.id} value={z.id}>{z.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="cliente_oc" value="Cliente (opcional)" />
                        <select id="cliente_oc" value={form.data.cliente_id} onChange={(e) => form.setData("cliente_id", e.target.value)} className={selectClasses}>
                            <option value="">Nenhum — problema da zona</option>
                            {clientes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.numero_cliente})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <InputLabel htmlFor="descricao" value="O que aconteceu" />
                        <textarea
                            id="descricao"
                            rows={3}
                            value={form.data.descricao}
                            onChange={(e) => form.setData("descricao", e.target.value)}
                            className={cn(selectClasses, "resize-y")}
                            placeholder="Ex.: sem água desde ontem à noite na rua principal"
                        />
                        <InputError message={form.errors.descricao} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setNovaAberta(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={form.processing}>Registar</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={Boolean(aResolver)} onClose={() => setAResolver(null)} title="Resolver ocorrência" maxWidth="md">
                <form onSubmit={concluir} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="resolucao" value="O que foi feito" />
                        <textarea
                            id="resolucao"
                            rows={3}
                            value={resolver.data.resolucao}
                            onChange={(e) => resolver.setData("resolucao", e.target.value)}
                            className={cn(selectClasses, "resize-y")}
                            autoFocus
                        />
                        <InputError message={resolver.errors.resolucao} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setAResolver(null)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={resolver.processing}>Marcar como resolvida</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
