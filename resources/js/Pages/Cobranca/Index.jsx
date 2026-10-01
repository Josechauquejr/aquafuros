import { Head, Link, router, useForm } from "@inertiajs/react";
import { Ban, CalendarCheck, Mail, PhoneCall, Search } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ExpandableCard from "@/Components/ExpandableCard";
import ConfirmDialog from "@/Components/ConfirmDialog";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDate, formatMoney } from "@/lib/utils";
import { AlertTriangle, Users, Wallet } from "lucide-react";

const canais = { email: "Email", telefone: "Telefone", presencial: "Presencial", whatsapp: "WhatsApp", sms: "SMS", outro: "Outro" };
const resultados = {
    sem_resposta: "Sem resposta",
    prometeu_pagar: "Prometeu pagar",
    recusou: "Recusou pagar",
    pagou: "Já pagou",
    outro: "Outro",
};
const tomPromessa = { pendente: "amber", cumprida: "emerald", falhada: "rose", cancelada: "slate" };

const selectClasses =
    "mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function Index({ linhas, clientesEmail, totais, zonas, filtros }) {
    const [search, setSearch] = useState(filtros.search);
    const [alvo, setAlvo] = useState(null);
    const [paraEmail, setParaEmail] = useState(null);
    const [clienteEmailId, setClienteEmailId] = useState("");
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

    const cartoes = [
        { label: "Clientes em atraso", value: totais.clientes, detail: "com facturas vencidas", icon: Users, tone: "rose" },
        { label: "Em atraso", value: formatMoney(totais.valor), detail: "por receber, já vencido", icon: Wallet, tone: "amber" },
        { label: "Sem contacto", value: totais.semContacto, detail: "nunca contactados ou há 15+ dias", icon: PhoneCall, tone: totais.semContacto > 0 ? "rose" : "emerald" },
        { label: "Promessas", value: `${totais.promessasPendentes} / ${totais.promessasFalhadas}`, detail: "pendentes / falhadas", icon: CalendarCheck, tone: totais.promessasFalhadas > 0 ? "rose" : "cyan" },
    ];

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Cobrança</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Clientes em atraso</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        A lista de trabalho: quem deve, o que já se fez com cada um e o que prometeram. Registe cada contacto e as promessas de pagamento.
                    </p>
                </div>
            }
        >
            <Head title="Cobrança" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        {cartoes.map((c, i) => (
                            <KpiCard key={c.label} {...c} delay={i * 0.06} />
                        ))}
                    </section>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[14rem] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <TextInput
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar cliente, nº ou telefone"
                                className="h-10 w-full pl-9"
                            />
                        </div>
                        <select value={filtros.zona} onChange={(e) => navegar({ zona: e.target.value })} className={`${selectClasses} mt-0 h-10 w-auto`} aria-label="Zona">
                            <option value="todas">Todas as zonas</option>
                            {zonas.map((z) => (
                                <option key={z.id} value={z.id}>{z.nome}</option>
                            ))}
                        </select>
                        <select value={filtros.filtro} onChange={(e) => navegar({ filtro: e.target.value })} className={`${selectClasses} mt-0 h-10 w-auto`} aria-label="Mostrar">
                            <option value="todos">Todos</option>
                            <option value="sem_contacto">Sem contacto há 15+ dias</option>
                            <option value="com_promessa">Com promessa pendente</option>
                            <option value="promessa_falhada">Promessa falhada</option>
                        </select>
                    </div>

                    <ExpandableCard title="Enviar cobrança por email" description="Escolha um cliente e envie todas as facturas vencidas" icon={Mail} defaultOpen={false}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0 flex-1">
                            <InputLabel htmlFor="cliente_email" value="Enviar cobrança por email" />
                            <select
                                id="cliente_email"
                                value={clienteEmailId}
                                onChange={(e) => setClienteEmailId(e.target.value)}
                                className={selectClasses}
                            >
                                <option value="">Escolha um cliente com facturas por pagar</option>
                                {clientesEmail.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nome} — {cliente.facturas} factura(s) — {formatMoney(cliente.valor)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <PrimaryButton
                            type="button"
                            disabled={!clienteEmailId}
                            onClick={() => {
                                const cliente = clientesEmail.find((item) => String(item.id) === String(clienteEmailId));
                                if (cliente) setParaEmail({ cliente, facturas: cliente.facturas, valor: cliente.valor });
                            }}
                        >
                            <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" /> Enviar email
                        </PrimaryButton>
                    </AnimatedPanel>
                    </ExpandableCard>

                    <ExpandableCard title="Lista de clientes em atraso" description="Contactos, promessas e pagamentos" icon={Users}>
                    <AnimatedPanel className="border-0 shadow-none rounded-none overflow-hidden">
                        {linhas.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum cliente em atraso com estes filtros.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[860px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-5 py-3">Cliente</th>
                                            <th className="px-3 py-3 text-right">Em atraso</th>
                                            <th className="px-3 py-3">Último contacto</th>
                                            <th className="px-3 py-3">Promessa</th>
                                            <th className="px-5 py-3 text-right">Acções</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {linhas.map((l) => (
                                            <tr key={l.cliente.id} className="align-top">
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-slate-900 dark:text-white">{l.cliente.nome}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {l.cliente.numero_cliente} · {l.zona ?? "sem zona"} · {l.cliente.telefone ?? "sem telefone"}
                                                    </p>
                                                    {l.credito > 0 && <p className="text-xs text-emerald-700 dark:text-emerald-300">Crédito a favor: {formatMoney(l.credito)}</p>}
                                                </td>
                                                <td className="px-3 py-4 text-right">
                                                    <p className="font-semibold text-rose-600 dark:text-rose-400">{formatMoney(l.valor)}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{l.facturas} factura(s) · {l.diasAtraso} dia(s)</p>
                                                </td>
                                                <td className="px-3 py-4">
                                                    {l.ultimoContacto ? (
                                                        <>
                                                            <p className="text-slate-800 dark:text-slate-200">{resultados[l.ultimoContacto.resultado]}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {canais[l.ultimoContacto.canal]} · há {l.ultimoContacto.dias} dia(s)
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <StatusBadge tone="rose">Nunca contactado</StatusBadge>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4">
                                                    {l.promessa ? (
                                                        <>
                                                            <StatusBadge tone={tomPromessa[l.promessa.estado]}>
                                                                {l.promessa.estado === "pendente" ? "Pendente" : l.promessa.estado === "cumprida" ? "Cumprida" : l.promessa.estado === "falhada" ? "Falhada" : "Cancelada"}
                                                            </StatusBadge>
                                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                {formatMoney(l.promessa.valor)} até {formatDate(l.promessa.data)}
                                                            </p>
                                                            {l.promessa.estado === "pendente" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.put(`/cobranca/promessas/${l.promessa.id}/cancelar`, {}, { preserveScroll: true })}
                                                                    className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 underline-offset-2 hover:underline"
                                                                >
                                                                    <Ban className="h-3 w-3" aria-hidden="true" /> cancelar
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        {l.cliente.email ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setParaEmail(l)}
                                                                className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200"
                                                            >
                                                                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Enviar email
                                                            </button>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-2 text-xs text-slate-400" title="O cliente não tem email registado — adicione-o na página de Clientes.">
                                                                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> sem email
                                                            </span>
                                                        )}
                                                        <SecondaryButton type="button" onClick={() => abrir(l)}>
                                                            <PhoneCall className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Registar contacto
                                                        </SecondaryButton>
                                                        <Link href={`/pagamentos?search=${encodeURIComponent(l.cliente.nome)}`} className="inline-flex items-center rounded-md px-2 py-2 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                                                            Pagamentos
                                                        </Link>
                                                    </div>
                                                    {l.historico.length > 0 && (
                                                        <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                                            <summary className="cursor-pointer text-right">Histórico ({l.historico.length})</summary>
                                                            <ul className="mt-1 space-y-1 text-left">
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </AnimatedPanel>
                    </ExpandableCard>
                </div>
            </div>

            <ConfirmDialog
                show={Boolean(paraEmail)}
                onClose={() => setParaEmail(null)}
                onConfirm={() => router.post(`/cobranca/clientes/${paraEmail.cliente.id}/email`, {}, { preserveScroll: true, onFinish: () => { setParaEmail(null); setClienteEmailId(""); } })}
                tone="primary"
                title="Enviar email de cobrança"
                confirmLabel="Enviar"
                description={paraEmail ? `Enviar a ${paraEmail.cliente.nome} (${paraEmail.cliente.email}) um email com as ${paraEmail.facturas} factura(s) vencidas (${formatMoney(paraEmail.valor)}) e os PDFs em anexo?` : ""}
            />

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
                                <InputLabel htmlFor="valor_promessa" value="Valor prometido (MZN)" />
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
