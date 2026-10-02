import { Head, Link, router } from "@inertiajs/react";
import { Bot, CheckCircle2, Eye, FileText, Mail, Paperclip, Search, User, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn, formatDateTime } from "@/lib/utils";

const selectClasses =
    "h-10 rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const tomTipo = { factura: "cyan", lembrete_vencimento: "slate", atraso: "amber", atraso_grave: "rose", cobranca: "amber", recibo: "emerald", teste: "slate" };

export default function Index({ envios, tipos, totais, filtros }) {
    const [search, setSearch] = useState(filtros.search);
    const [aVer, setAVer] = useState(null);
    const cartao = useCartaoDeLinha(envios.data);
    const ev = cartao.linha;

    const navegar = (extra = {}) =>
        router.get(
            "/emails",
            Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([, v]) => v && v !== "todos" && v !== "todas")),
            { preserveState: true, preserveScroll: true, replace: true },
        );

    useEffect(() => {
        if (search === filtros.search) return;
        const t = setTimeout(() => navegar({ search }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Cobrança</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Emails enviados</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Tudo o que o sistema enviou aos clientes — facturas, lembretes, avisos de atraso e cobranças —, automático ou à mão, com o conteúdo tal como foi enviado.
                        </p>
                    </div>
                    <Link href="/notificacoes" className="text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                        Ver a fila de cobrança →
                    </Link>
                </div>
            }
        >
            <Head title="Emails enviados" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        <KpiCard label="Enviados hoje" value={totais.hoje} detail="emails que saíram hoje" icon={Mail} tone="cyan" />
                        <KpiCard label="Enviados" value={totais.enviados} detail="no total" icon={CheckCircle2} tone="emerald" />
                        <KpiCard label="Automáticos" value={totais.automaticos} detail="sem ninguém carregar num botão" icon={Bot} tone="amber" />
                        <KpiCard label="Falharam" value={totais.falharam} detail="não chegaram a sair" icon={XCircle} tone={totais.falharam > 0 ? "rose" : "emerald"} />
                    </section>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[14rem] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <TextInput
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar cliente, email ou assunto"
                                className="h-10 w-full"
                                style={{ paddingLeft: "2.5rem" }}
                            />
                        </div>
                        <select value={filtros.tipo} onChange={(e) => navegar({ tipo: e.target.value })} className={selectClasses} aria-label="Tipo">
                            <option value="todos">Todos os tipos</option>
                            {Object.entries(tipos).map(([valor, rotulo]) => (
                                <option key={valor} value={valor}>{rotulo}</option>
                            ))}
                        </select>
                        <select value={filtros.origem} onChange={(e) => navegar({ origem: e.target.value })} className={selectClasses} aria-label="Origem">
                            <option value="todas">Automáticos e manuais</option>
                            <option value="automatico">Só automáticos</option>
                            <option value="manual">Só manuais</option>
                        </select>
                        <select value={filtros.estado} onChange={(e) => navegar({ estado: e.target.value })} className={selectClasses} aria-label="Estado">
                            <option value="todos">Enviados e falhados</option>
                            <option value="enviado">Só enviados</option>
                            <option value="falhou">Só falhados</option>
                        </select>
                    </div>

                    <AnimatedPanel className="overflow-hidden">
                        {envios.data.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum email encontrado.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {envios.data.map((e) => (
                                    <li key={e.id} {...cartao.propsLinha(e)} className={cn("flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between", linhaClicavel)}>
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2">
                                                <StatusBadge tone={tomTipo[e.tipo] ?? "slate"}>{tipos[e.tipo] ?? e.tipo}</StatusBadge>
                                                {e.estado === "enviado" ? (
                                                    <StatusBadge tone="emerald">Enviado</StatusBadge>
                                                ) : (
                                                    <StatusBadge tone="rose">Falhou</StatusBadge>
                                                )}
                                                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {e.origem === "automatico" ? <Bot className="h-3.5 w-3.5" aria-hidden="true" /> : <User className="h-3.5 w-3.5" aria-hidden="true" />}
                                                    {e.origem === "automatico" ? "Automático" : `Manual${e.enviado_por ? ` — ${e.enviado_por.name}` : ""}`}
                                                </span>
                                            </p>
                                            <p className="mt-1 font-medium text-slate-900 dark:text-white">{e.assunto ?? "(sem assunto)"}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                Para <strong>{e.cliente?.nome ?? "cliente removido"}</strong> · {e.email}
                                            </p>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                <span>{formatDateTime(e.created_at)}</span>
                                                {e.factura && (
                                                    <Link href={`/facturas?search=${encodeURIComponent(e.factura.numero_factura)}`} className="inline-flex items-center gap-1 hover:text-cyan-700 hover:underline">
                                                        <FileText className="h-3 w-3" aria-hidden="true" /> {e.factura.numero_factura}
                                                    </Link>
                                                )}
                                                {e.anexos?.length > 0 && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Paperclip className="h-3 w-3" aria-hidden="true" /> {e.anexos.join(", ")}
                                                    </span>
                                                )}
                                            </p>
                                            {e.erro && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Erro após {e.tentativas ?? 1} tentativa(s): {e.erro}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAVer(e)}
                                            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Ver email
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AnimatedPanel>

                    <Pagination paginador={envios} />
                </div>
            </div>

            {ev && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={ev.assunto ?? "(sem assunto)"}
                    description={tipos[ev.tipo] ?? ev.tipo}
                    footer={
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    const alvo = ev;
                                    cartao.fechar();
                                    setAVer(alvo);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Ver o email
                            </button>
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Estado" tom={ev.estado === "enviado" ? "sucesso" : "perigo"}>{ev.estado === "enviado" ? "Enviado" : "Falhou"}</Destaque>
                        <Destaque rotulo="Origem">{ev.origem === "automatico" ? "Automático" : "Manual"}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Para">{ev.cliente?.nome ?? "cliente removido"}</Campo>
                        <Campo rotulo="Email">{ev.email}</Campo>
                        <Campo rotulo="Quando">{formatDateTime(ev.created_at)}</Campo>
                        <Campo rotulo="Enviado por">{ev.origem === "automatico" ? "Sistema" : ev.enviado_por?.name}</Campo>
                        <Campo rotulo="Factura">
                            {ev.factura && (
                                <Link href={`/facturas?search=${encodeURIComponent(ev.factura.numero_factura)}`} className="text-cyan-700 hover:underline dark:text-cyan-300">
                                    {ev.factura.numero_factura}
                                </Link>
                            )}
                        </Campo>
                        <Campo rotulo="Anexos">{ev.anexos?.length > 0 ? ev.anexos.join(", ") : null}</Campo>
                        {ev.erro && (
                            <Campo rotulo={`Erro após ${ev.tentativas ?? 1} tentativa(s)`} largo>
                                {ev.erro}
                            </Campo>
                        )}
                    </Campos>
                </ExpandableCard>
            )}

            <Modal show={Boolean(aVer)} onClose={() => setAVer(null)} title={aVer?.assunto ?? "Email"} maxWidth="2xl">
                {aVer && (
                    <div className="space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Para {aVer.email} · {formatDateTime(aVer.created_at)}
                            {aVer.anexos?.length > 0 ? ` · anexos: ${aVer.anexos.join(", ")}` : ""}
                        </p>
                        <iframe
                            title="Conteúdo do email"
                            src={`/emails/${aVer.id}/ver`}
                            sandbox=""
                            className="h-[60vh] w-full rounded-md border border-slate-200 bg-white dark:border-slate-700"
                        />
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
