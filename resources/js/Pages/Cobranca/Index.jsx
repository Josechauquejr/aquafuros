import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { Ban, PhoneCall, Search } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDate, formatMoney } from "@/lib/utils";
import CabecalhoLista from "@/Components/CabecalhoLista";
import EstadoVazio from "@/Components/EstadoVazio";
import { cn } from "@/lib/utils";

const canais = { email: "Email", telefone: "Telefone", presencial: "Presencial", whatsapp: "WhatsApp", sms: "SMS", outro: "Outro" };
const resultados = {
    sem_resposta: "Sem resposta",
    prometeu_pagar: "Prometeu pagar",
    recusou: "Recusou pagar",
    pagou: "Já pagou",
    outro: "Outro",
};
const tomPromessa = { pendente: "cyan", cumprida: "emerald", falhada: "rose", cancelada: "slate" };

const selectClasses =
    "mt-1 block min-h-[44px] w-full rounded-md border-[#DDE2EE] bg-white text-base text-ink sm:text-sm dark:border-slate-800 dark:bg-[#1E232D] dark:text-slate-100";

export default function Index({ linhas, totais, zonas, filtros }) {
    const [search, setSearch] = useState(filtros.search);
    const [alvo, setAlvo] = useState(null);
    const form = useForm({ cliente_id: "", canal: "telefone", resultado: "sem_resposta", nota: "", valor: "", data_prometida: "" });

    const navegar = (extra = {}) =>
        router.get(
            "/cobranca",
            { ...Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([, v]) => v && v !== "todos" && v !== "todas")) },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    useEffect(() => {
        if (search === filtros.search) return;
        const t = setTimeout(() => navegar({ search }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const abrir = (linha) => {
        form.setData({ cliente_id: linha.cliente.id, canal: "telefone", resultado: "sem_resposta", nota: "", valor: linha.valor, data_prometida: "" });
        form.clearErrors();
        setAlvo(linha);
    };

    const guardar = (evento) => {
        evento.preventDefault();
        form.post("/cobranca/contactos", { preserveScroll: true, onSuccess: () => setAlvo(null) });
    };

    const { ciclo } = usePage().props;
    const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const mesSeguinte = ciclo ? ABREV[(MESES.indexOf(ciclo.mes) + 1) % 12] : "";
    const chips = [
        { chave: "todos", rotulo: "Todos em atraso", contagem: totais.clientes },
        { chave: "sem_contacto", rotulo: "Sem contacto há 15+ dias", contagem: totais.semContacto },
        { chave: "com_promessa", rotulo: "Promessa pendente", contagem: totais.promessasPendentes },
        { chave: "promessa_falhada", rotulo: "Promessa falhada", contagem: totais.promessasFalhadas },
        { chave: "risco", rotulo: "Risco de corte", contagem: totais.emRisco },
    ];
    const comPesquisa = Boolean(filtros.search);
    const estado = (rotulo, valor, detalhe, tom) => (
        <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">{rotulo}</span>
            <span className="text-2xl font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{valor}</span>
            {detalhe && (
                <span
                    className={cn(
                        "text-[13px] font-semibold",
                        tom === "rose" ? "text-rose-700 dark:text-rose-300" : tom === "amber" ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400",
                    )}
                >
                    {detalhe}
                </span>
            )}
        </div>
    );
    const campo = "min-h-[44px] rounded-[10px] border-[#DDE2EE] bg-white text-sm text-ink dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]";

    return (
        <AdminLayout>
            <Head title="Cobrança" />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CabecalhoLista
                    contexto={ciclo ? `Ciclo de ${ciclo.mes} · a cobrança deste ciclo começa a 11 ${mesSeguinte}` : undefined}
                    titulo="Cobrança"
                    resumo="Quem deve, o que já se fez com cada um e o que prometeram."
                />

                {totais.clientes > 0 && (
                    <AnimatedPanel className="grid grid-cols-2 divide-[#E8ECF4] lg:grid-cols-4 lg:divide-x dark:divide-slate-800">
                        {estado("Em atraso", formatMoney(totais.valor), `${totais.clientes} ${totais.clientes === 1 ? "cliente" : "clientes"}`)}
                        {estado("Sem contacto há 15+ dias", totais.semContacto, totais.semContacto > 0 ? "Ligar hoje" : "Todos contactados", totais.semContacto > 0 ? "amber" : undefined)}
                        {estado(
                            "Promessas",
                            <>
                                {totais.promessasPendentes} <span className="text-sm font-medium text-slate-500">pendentes · {totais.promessasFalhadas} falhadas</span>
                            </>,
                            null,
                        )}
                        {estado("Risco de corte", totais.emRisco, totais.emRisco > 0 ? "Dívida acima do limite da tarifa" : null, totais.emRisco > 0 ? "rose" : undefined)}
                    </AnimatedPanel>
                )}

                <AnimatedPanel className="overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-[#E8ECF4] px-[18px] py-3.5 dark:border-slate-800">
                        <div className="flex flex-wrap gap-2.5">
                            <label className="flex min-h-[44px] flex-[1_1_260px] items-center gap-2.5 rounded-[10px] border border-[#DDE2EE] px-3 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:border-slate-800 dark:bg-[#1E232D]">
                                <Search className="h-[18px] w-[18px] text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Nome, nº de cliente ou telefone"
                                    aria-label="Procurar cliente em atraso"
                                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]"
                                />
                            </label>
                            <select value={filtros.zona} onChange={(e) => navegar({ zona: e.target.value })} className={campo} aria-label="Zona">
                                <option value="todas">Todas as zonas</option>
                                {zonas.map((z) => (
                                    <option key={z.id} value={z.id}>
                                        {z.nome}
                                    </option>
                                ))}
                            </select>
                            <select value={filtros.ordem} onChange={(e) => navegar({ ordem: e.target.value === "valor" ? "" : e.target.value })} className={campo} aria-label="Ordenar">
                                <option value="valor">Maior dívida primeiro</option>
                                <option value="dias">Mais dias em atraso</option>
                                <option value="contacto">Contacto mais antigo</option>
                            </select>
                        </div>
                        <div role="group" aria-label="Situação" className="flex flex-wrap gap-2">
                            {chips.map((chip) => {
                                const on = chip.chave === (filtros.filtro || "todos");
                                return (
                                    <button
                                        key={chip.chave}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => navegar({ filtro: chip.chave })}
                                        className={cn(
                                            "min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition-colors",
                                            on
                                                ? "border-[#B9CCFF] bg-cyan-100 text-brand dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300"
                                                : "border-[#DDE2EE] bg-white text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]",
                                        )}
                                    >
                                        {chip.rotulo} <span className="tabular-nums opacity-80">{chip.contagem}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {linhas.length === 0 ? (
                        <EstadoVazio
                            ilustracao={comPesquisa ? "pesquisa" : "furo"}
                            titulo={
                                comPesquisa
                                    ? `Nenhum cliente com “${filtros.search}”`
                                    : totais.clientes === 0
                                      ? "Ninguém em atraso"
                                      : filtros.filtro === "promessa_falhada"
                                        ? "Nenhuma promessa falhada"
                                        : "Ninguém nesta situação"
                            }
                            accoes={
                                (comPesquisa || (filtros.filtro && filtros.filtro !== "todos")) && totais.clientes > 0 ? (
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => {
                                            setSearch("");
                                            router.get("/cobranca", {}, { preserveScroll: true, replace: true });
                                        }}
                                    >
                                        Ver todos em atraso
                                    </SecondaryButton>
                                ) : null
                            }
                        >
                            {comPesquisa
                                ? "Confirme o nome ou procure pelo nº de cliente ou telefone."
                                : totais.clientes === 0
                                  ? "Todas as facturas vencidas estão pagas. Quando alguém passar do prazo, aparece aqui."
                                  : "Bom sinal. Quando um cliente não cumprir o que prometeu, aparece aqui para voltar a contactar."}
                        </EstadoVazio>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[920px] text-left text-sm">
                                <thead className="border-b border-[#E8ECF4] bg-[#F7F9FD] text-xs font-bold tracking-[0.6px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">CLIENTE</th>
                                        <th className="px-3 py-3 text-right">EM ATRASO</th>
                                        <th className="px-3 py-3">HÁ</th>
                                        <th className="px-3 py-3">ÚLTIMO CONTACTO</th>
                                        <th className="px-3 py-3">PROMESSA</th>
                                        <th className="px-5 py-3">
                                            <span className="sr-only">Acções</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                    {linhas.map((l) => (
                                        <tr key={l.cliente.id} className="align-top">
                                            <td className="px-5 py-4">
                                                <Link href={`/clientes/${l.cliente.numero_cliente}`} className="flex flex-col text-ink dark:text-[#F2F5FB]">
                                                    <strong className="text-[15px]">{l.cliente.nome}</strong>
                                                    <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                                        {l.cliente.numero_cliente} · {l.cliente.telefone ?? "sem telefone"}
                                                    </span>
                                                </Link>
                                                {l.credito > 0 && <p className="text-xs text-emerald-700 dark:text-emerald-300">Crédito a favor: {formatMoney(l.credito)}</p>}
                                            </td>
                                            <td className="px-3 py-4 text-right">
                                                <p className={cn("text-[15px] font-bold tabular-nums", l.emRisco ? "text-rose-700 dark:text-rose-300" : "text-ink dark:text-[#F2F5FB]")}>{formatMoney(l.valor)}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {l.facturas} {l.facturas === 1 ? "factura" : "facturas"}
                                                    {l.emRisco ? " · risco de corte" : ""}
                                                </p>
                                            </td>
                                            <td className="px-3 py-4">
                                                <StatusBadge tone={l.diasAtraso > 30 || l.emRisco ? "rose" : "amber"}>
                                                    {l.diasAtraso} {l.diasAtraso === 1 ? "dia" : "dias"}
                                                </StatusBadge>
                                            </td>
                                            <td className="px-3 py-4">
                                                {l.ultimoContacto ? (
                                                    <>
                                                        <p className="text-ink dark:text-[#F2F5FB]">
                                                            {canais[l.ultimoContacto.canal]} · {formatDate(l.ultimoContacto.data)}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {resultados[l.ultimoContacto.resultado]} · há {l.ultimoContacto.dias} {l.ultimoContacto.dias === 1 ? "dia" : "dias"}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <StatusBadge tone="amber">Nunca contactado</StatusBadge>
                                                )}
                                                {l.historico.length > 1 && (
                                                    <details className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                        <summary className="cursor-pointer font-semibold text-cyan-700 dark:text-cyan-400">Histórico ({l.historico.length})</summary>
                                                        <ul className="mt-1 space-y-1">
                                                            {l.historico.map((h) => (
                                                                <li key={h.data}>
                                                                    {formatDate(h.data)} · {canais[h.canal]} · {resultados[h.resultado]} · {h.utilizador}
                                                                    {h.nota ? ` — ${h.nota}` : ""}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                )}
                                            </td>
                                            <td className="px-3 py-4">
                                                {l.promessa ? (
                                                    <>
                                                        <p className="text-ink dark:text-[#F2F5FB]">
                                                            Pagar {formatMoney(l.promessa.valor)} até {formatDate(l.promessa.data)}
                                                        </p>
                                                        <span className="mt-1 flex items-center gap-2">
                                                            <StatusBadge tone={tomPromessa[l.promessa.estado]}>
                                                                {l.promessa.estado === "pendente" ? "Pendente" : l.promessa.estado === "cumprida" ? "Cumprida" : l.promessa.estado === "falhada" ? "Falhada" : "Cancelada"}
                                                            </StatusBadge>
                                                            {l.promessa.estado === "pendente" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.put(`/cobranca/promessas/${l.promessa.id}/cancelar`, {}, { preserveScroll: true })}
                                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink dark:text-slate-400"
                                                                >
                                                                    <Ban className="h-3 w-3" aria-hidden="true" /> cancelar
                                                                </button>
                                                            )}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => abrir(l)}
                                                    className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-[10px] border border-[#DDE2EE] px-3.5 text-sm font-semibold text-cyan-700 hover:bg-slate-50 dark:border-slate-800 dark:text-cyan-400 dark:hover:bg-[#1E232D]"
                                                >
                                                    <PhoneCall className="h-4 w-4" aria-hidden="true" />
                                                    Registar contacto
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AnimatedPanel>
            </div>

            <Modal show={Boolean(alvo)} onClose={() => setAlvo(null)} title={alvo ? `Contacto — ${alvo.cliente.nome}` : ""} maxWidth="lg">
                <form onSubmit={guardar} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="canal" value="Como falou" />
                            <select id="canal" value={form.data.canal} onChange={(e) => form.setData("canal", e.target.value)} className={selectClasses}>
                                {Object.entries(canais).map(([v, r]) => (
                                    <option key={v} value={v}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="resultado" value="Resultado" />
                            <select id="resultado" value={form.data.resultado} onChange={(e) => form.setData("resultado", e.target.value)} className={selectClasses}>
                                {Object.entries(resultados).map(([v, r]) => (
                                    <option key={v} value={v}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {form.data.resultado === "prometeu_pagar" && (
                        <div className="grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2 dark:border-amber-900 dark:bg-amber-950/30">
                            <div>
                                <InputLabel htmlFor="valor_promessa" value="Valor prometido (MT)" />
                                <TextInput id="valor_promessa" type="number" min="0.01" step="0.01" value={form.data.valor} onChange={(e) => form.setData("valor", e.target.value)} className="mt-1 block w-full" />
                                <InputError message={form.errors.valor} className="mt-1" />
                            </div>
                            <div>
                                <InputLabel htmlFor="data_promessa" value="Até que dia" />
                                <TextInput id="data_promessa" type="date" value={form.data.data_prometida} onChange={(e) => form.setData("data_prometida", e.target.value)} className="mt-1 block w-full" />
                                <InputError message={form.errors.data_prometida} className="mt-1" />
                            </div>
                            <p className="text-xs text-amber-900 dark:text-amber-200 sm:col-span-2">
                                O sistema verifica sozinho se o cliente paga esse valor até ao dia combinado.
                            </p>
                        </div>
                    )}

                    <div>
                        <InputLabel htmlFor="nota" value="Nota (opcional)" />
                        <TextInput id="nota" value={form.data.nota} onChange={(e) => form.setData("nota", e.target.value)} className="mt-1 block w-full" placeholder="O que ficou combinado" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setAlvo(null)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={form.processing}>Guardar contacto</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
