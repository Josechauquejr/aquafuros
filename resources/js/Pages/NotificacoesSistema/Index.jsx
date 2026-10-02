import { Head, Link, router } from "@inertiajs/react";
import { AlertTriangle, Bell, CheckCircle2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";

const selectClasses = "h-10 rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function Index({ alertas, totais, filtros }) {
    const [search, setSearch] = useState(filtros.search);
    const navegar = (extra = {}) => router.get("/notificacoes-sistema", { ...filtros, ...extra }, { preserveState: true, preserveScroll: true, replace: true });

    useEffect(() => {
        if (search === filtros.search) return;
        const timer = setTimeout(() => navegar({ search }), 300);
        return () => clearTimeout(timer);
    }, [search]);

    return <AdminLayout header={<div><p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Centro de trabalho</p><h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Notificações do sistema</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Assuntos que precisam de atenção dentro da operação. Não são emails enviados aos clientes.</p></div>}>
        <Head title="Notificações do sistema" />
        <div className="py-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-3"><KpiCard label="Assuntos activos" value={totais.todos} detail="a acompanhar" icon={Bell} tone="cyan" /><KpiCard label="Prioridade alta" value={totais.altos} detail="requerem atenção" icon={AlertTriangle} tone={totais.altos ? "rose" : "emerald"} /><KpiCard label="Estado" value={totais.todos ? "Acção necessária" : "Tudo tratado"} detail="situação actual" icon={CheckCircle2} tone={totais.todos ? "amber" : "emerald"} /></section>
            <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-[16rem] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><TextInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar notificações" className="h-10 w-full pl-9" /></div><select value={filtros.nivel} onChange={(event) => navegar({ nivel: event.target.value })} className={selectClasses} aria-label="Prioridade"><option value="todos">Todas as prioridades</option><option value="alto">Prioridade alta</option><option value="medio">Prioridade média</option></select></div>
            <AnimatedPanel className="overflow-hidden">{alertas.length === 0 ? <div className="px-6 py-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 text-sm text-slate-500">Nenhuma notificação encontrada.</p></div> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{alertas.map((alerta) => <li key={alerta.chave} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><AlertTriangle className={alerta.nivel === "alto" ? "mt-0.5 h-5 w-5 shrink-0 text-rose-500" : "mt-0.5 h-5 w-5 shrink-0 text-amber-500"} aria-hidden="true" /><div><p className="font-semibold text-slate-900 dark:text-white">{alerta.titulo}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{alerta.detalhe}</p></div></div><div className="flex shrink-0 items-center gap-3 sm:pl-6"><StatusBadge tone={alerta.nivel === "alto" ? "rose" : "amber"}>{alerta.quantidade}</StatusBadge>{alerta.href && <Link href={alerta.href} className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">Abrir</Link>}</div></li>)}</ul>}</AnimatedPanel>
        </div></div>
    </AdminLayout>;
}
