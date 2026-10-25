import { Head, router } from "@inertiajs/react";
import { CheckCircle2, Eye, Mail, Search, User, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDateTime } from "@/lib/utils";

const selectClasses = "h-10 rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const tons = { teste: "slate", codigo_verificacao: "cyan", codigo_recuperacao: "amber", senha_inicial: "emerald", senha_reposicao: "amber" };

export default function Index({ envios, tipos, totais, filtros }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const [aberto, setAberto] = useState(null);

    const navegar = (extra = {}) => {
        const params = Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([, valor]) => valor && valor !== "todos" && valor !== "todas"));
        router.get("/emails", params, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const timer = setTimeout(() => navegar({ search }), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <AdminLayout header={<div><p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Acessos</p><h2 className="text-2xl font-bold text-slate-950 dark:text-white">Emails de autenticação</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Códigos de verificação e reposição de senha enviados pelo sistema.</p></div>}>
            <Head title="Emails de autenticação" />
            <div className="py-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <KpiCard label="Enviados hoje" value={totais.hoje} detail="códigos entregues" icon={Mail} tone="cyan" />
                    <KpiCard label="Enviados" value={totais.enviados} detail="no total" icon={CheckCircle2} tone="emerald" />
                    <KpiCard label="Automáticos" value={totais.automaticos} detail="enviados pelo fluxo de acesso" icon={User} tone="amber" />
                    <KpiCard label="Falharam" value={totais.falharam} detail="não chegaram a sair" icon={XCircle} tone={totais.falharam > 0 ? "rose" : "emerald"} />
                </section>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar email ou assunto" className="h-10 w-full pl-9" /></div>
                    <select value={filtros.tipo} onChange={(e) => navegar({ tipo: e.target.value })} className={selectClasses} aria-label="Tipo"><option value="todos">Todos os tipos</option>{Object.entries(tipos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select>
                    <select value={filtros.estado} onChange={(e) => navegar({ estado: e.target.value })} className={selectClasses} aria-label="Estado"><option value="todos">Todos os estados</option><option value="enviado">Enviados</option><option value="falhou">Falhados</option></select>
                </div>

                <AnimatedPanel className="overflow-hidden">
                    {envios.data.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum email encontrado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"><tr><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Destinatário</th><th className="px-5 py-3">Assunto</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Quando</th><th className="px-5 py-3 text-right">Acções</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{envios.data.map((envio) => <tr key={envio.id}><td className="px-5 py-4"><StatusBadge tone={tons[envio.tipo] ?? "slate"}>{tipos[envio.tipo] ?? envio.tipo}</StatusBadge></td><td className="px-5 py-4 text-slate-700 dark:text-slate-200">{envio.email}</td><td className="max-w-sm truncate px-5 py-4 text-slate-700 dark:text-slate-200">{envio.assunto ?? "(sem assunto)"}</td><td className="px-5 py-4"><StatusBadge tone={envio.estado === "enviado" ? "emerald" : "rose"}>{envio.estado === "enviado" ? "Enviado" : "Falhou"}</StatusBadge></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDateTime(envio.created_at)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setAberto(envio)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Ver</button></td></tr>)}</tbody></table></div>}
                    <Pagination paginador={envios} />
                </AnimatedPanel>
                <Modal show={Boolean(aberto)} onClose={() => setAberto(null)} title={aberto?.assunto ?? "Email de autenticação"} maxWidth="2xl">
                    {aberto && <div className="space-y-3"><p className="text-xs text-slate-500 dark:text-slate-400">Para {aberto.email} · {formatDateTime(aberto.created_at)}</p><iframe title="Conteúdo do email" src={`/emails/${aberto.id}/ver`} sandbox="" className="h-[60vh] w-full rounded-md border border-slate-200 bg-white dark:border-slate-700" /></div>}
                </Modal>
            </div></div>
        </AdminLayout>
    );
}