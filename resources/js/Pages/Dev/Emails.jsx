import { Head, router } from "@inertiajs/react";
import { ExternalLink, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import IconButton from "@/Components/IconButton";
import Pagination from "@/Components/Pagination";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn, formatDateTime } from "@/lib/utils";

const seleccao = "rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function Emails({ envios, tipos, totais, filtros }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const cartao = useCartaoDeLinha(envios.data);
    const e = cartao.linha;

    const aplicar = (extra) => {
        const params = Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([, v]) => v && v !== "todos"));
        router.get("/dev/emails", params, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const t = setTimeout(() => aplicar({ search }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const verEmail = (envio) => window.open(`/dev/emails/${envio.id}/ver`, "_blank", "noopener");
    const reenviar = (envio) => router.post(`/dev/emails/${envio.id}/reenviar`, {}, { preserveScroll: true });

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Emails (técnico)</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {totais.enviados} enviados · {totais.falhados} falhados ({totais.falhados_24h} nas últimas 24 h). Clique numa linha para ver tudo; facturas e recibos podem ser reenviados.
                    </p>
                </div>
            }
        >
            <Head title="Emails" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <TextInput value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder="Pesquisar email ou assunto" className="block w-full pl-9" />
                        </div>
                        <select value={filtros.estado} onChange={(ev) => aplicar({ estado: ev.target.value })} className={seleccao}>
                            <option value="todos">Todos os estados</option>
                            <option value="enviado">Enviados</option>
                            <option value="falhou">Falhados</option>
                        </select>
                        <select value={filtros.tipo} onChange={(ev) => aplicar({ tipo: ev.target.value })} className={seleccao}>
                            <option value="todos">Todos os tipos</option>
                            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <AnimatedPanel className="overflow-x-auto">
                        {envios.data.length === 0 ? (
                            <p className="p-10 text-center text-sm text-slate-500">Sem emails para estes filtros.</p>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                    <tr><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Para</th><th className="px-4 py-3">Assunto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acções</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {envios.data.map((envio) => (
                                        <tr key={envio.id} {...cartao.propsLinha(envio)} className={cn("align-top", linhaClicavel)}>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(envio.created_at)}</td>
                                            <td className="px-4 py-3"><p className="text-slate-900 dark:text-white">{envio.cliente?.nome ?? "—"}</p><p className="text-xs text-slate-500">{envio.email}</p></td>
                                            <td className="max-w-xs truncate px-4 py-3 text-slate-700 dark:text-slate-300">{envio.assunto}</td>
                                            <td className="px-4 py-3"><StatusBadge tone={envio.estado === "enviado" ? "emerald" : "rose"}>{envio.estado === "enviado" ? "Enviado" : "Falhou"}</StatusBadge></td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {envio.tem_corpo ? <IconButton title="Ver o email" onClick={() => verEmail(envio)}><ExternalLink className="h-4 w-4" aria-hidden="true" /></IconButton> : null}
                                                    {envio.reenviavel && <IconButton title="Reenviar" onClick={() => reenviar(envio)}><Send className="h-4 w-4" aria-hidden="true" /></IconButton>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <Pagination paginador={envios} />
                    </AnimatedPanel>
                </div>
            </div>

            {e && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={e.assunto || "(sem assunto)"}
                    description={`Email ${e.tipo}`}
                    footer={
                        <div className="flex flex-wrap justify-end gap-2">
                            {e.tem_corpo ? <SecondaryButton type="button" onClick={() => verEmail(e)}><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Ver o email</SecondaryButton> : null}
                            {e.reenviavel && <SecondaryButton type="button" onClick={() => { cartao.fechar(); reenviar(e); }}><Send className="mr-2 h-4 w-4" aria-hidden="true" /> Reenviar</SecondaryButton>}
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Estado" tom={e.estado === "enviado" ? "sucesso" : "perigo"}>{e.estado === "enviado" ? "Enviado" : "Falhou"}</Destaque>
                        <Destaque rotulo="Tentativas">{e.tentativas ?? 1}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Para">{e.cliente?.nome ?? "—"}</Campo>
                        <Campo rotulo="Email">{e.email}</Campo>
                        <Campo rotulo="Quando">{formatDateTime(e.created_at)}</Campo>
                        <Campo rotulo="Origem">{e.origem === "automatico" ? "Automático" : `Manual${e.enviado_por ? ` — ${e.enviado_por.name}` : ""}`}</Campo>
                        {e.erro && <Campo rotulo="Erro" largo>{e.erro}</Campo>}
                    </Campos>
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
