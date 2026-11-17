import { Head, router, usePage } from "@inertiajs/react";
import { Banknote, CheckCircle2, ClipboardCheck, Droplets, Landmark, Lock, Printer, Smartphone } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import CaixaCabecalho from "@/Components/CaixaCabecalho";
import Ilustracao from "@/Components/Ilustracao";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const METODOS = [
    { chave: "dinheiro", label: "Dinheiro", icon: Banknote },
    { chave: "mpesa", label: "M-Pesa", icon: Smartphone },
    { chave: "e-mola", label: "E-Mola", icon: Smartphone },
    { chave: "banco", label: "Banco", icon: Landmark },
];
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const diaCurto = (data) => {
    const [, m, d] = String(data).slice(0, 10).split("-");
    return `${Number(d)} ${ABREV[Number(m) - 1]}`;
};

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Banco",
    mpesa: "M-Pesa",
    "e-mola": "E-Mola",
};

export default function FechoCaixa({
    pagamentos,
    utilizador,
    data,
    totalGeral,
    totalPorMetodo,
    esperadoDinheiro = 0,
    adiantamentos = [],
    caixas,
    fecho,
    ultimoFecho,
    podeConfirmar,
    caixaHoje,
}) {
    const { empresa, flash } = usePage().props;
    const [dataFiltro, setDataFiltro] = useState(data);
    const [caixaFiltro, setCaixaFiltro] = useState(utilizador.id);
    const [confirmarAberto, setConfirmarAberto] = useState(false);
    const [aConfirmar, setAConfirmar] = useState(false);
    const [valorContado, setValorContado] = useState("");
    const [erroContado, setErroContado] = useState(null);
    const diferencaPrevista = valorContado === "" ? null : Math.round((Number(valorContado) - esperadoDinheiro) * 100) / 100;
    const [conferidos, setConferidos] = useState({});
    const podeFechar = podeConfirmar && !fecho && valorContado !== "";
    // O que o caixa conferiu em cada método electrónico (vem preenchido com o que o sistema diz).
    const conferidoAEnviar = Object.fromEntries(
        METODOS.filter((m) => m.chave !== "dinheiro")
            .map((m) => [m.chave, conferidos[m.chave] ?? (Number(totalPorMetodo[m.chave] ?? 0) > 0 ? String(totalPorMetodo[m.chave]) : "")])
            .filter(([, v]) => v !== ""),
    );

    const aplicarFiltro = () => {
        router.get("/pagamentos/fecho-caixa", { data: dataFiltro, utilizador_id: caixaFiltro });
    };

    const confirmarFecho = () => {
        setAConfirmar(true);
        router.post(
            "/pagamentos/fecho-caixa/confirmar",
            { valor_contado: valorContado, conferido: conferidoAEnviar },
            {
                onError: (erros) => setErroContado(erros.valor_contado ?? null),
                onFinish: () => { setAConfirmar(false); },
                onSuccess: () => setConfirmarAberto(false),
            },
        );
    };

    return (
        <AdminLayout>
            <Head title={`Fecho do dia — ${formatDate(data)}`} />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 print:hidden sm:px-6 lg:px-8">
                <CaixaCabecalho caixaHoje={caixaHoje} activa="fecho" />

                {flash?.status && (
                    <p role="status" className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300">
                        {flash.status}
                    </p>
                )}

                <AnimatedPanel className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-5 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                        <Ilustracao nome="recibo" largura={96} className="hidden sm:block" />
                        <div className="flex min-w-[240px] flex-1 flex-col gap-1">
                            <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink dark:text-[#F2F5FB]">
                                Fecho do dia · {diaCurto(data)}
                                {fecho ? (
                                    <StatusBadge tone="slate">Fechada às {formatDateTime(fecho.created_at).split(" às ")[1]}</StatusBadge>
                                ) : (
                                    <StatusBadge tone="emerald">Aberta</StatusBadge>
                                )}
                            </h2>
                            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {fecho
                                    ? `Caixa de ${utilizador.name} fechada. Este dia está bloqueado para novos recibos.`
                                    : "Conte o dinheiro e confira os pagamentos electrónicos. Depois do fecho, este dia fica bloqueado."}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={dataFiltro}
                                aria-label="Dia"
                                onChange={(event) => setDataFiltro(event.target.value)}
                                className="min-h-[44px] rounded-md border-[#DDE2EE] text-sm dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                            />
                            {caixas.length > 0 && (
                                <select
                                    value={caixaFiltro}
                                    aria-label="Caixa"
                                    onChange={(event) => setCaixaFiltro(event.target.value)}
                                    className="min-h-[44px] rounded-md border-[#DDE2EE] text-sm dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                >
                                    {caixas.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <SecondaryButton type="button" onClick={aplicarFiltro}>
                                Ver
                            </SecondaryButton>
                            <SecondaryButton type="button" onClick={() => window.print()} aria-label="Imprimir o fecho">
                                <Printer className="h-4 w-4" aria-hidden="true" />
                            </SecondaryButton>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="border-b border-[#E8ECF4] bg-[#F7F9FD] text-xs font-bold tracking-[0.6px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-3">MÉTODO</th>
                                    <th className="px-6 py-3 text-right">O SISTEMA DIZ</th>
                                    <th className="px-6 py-3">CONTEI / CONFERI</th>
                                    <th className="px-6 py-3 text-right">DIFERENÇA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                {METODOS.map(({ chave, label, icon: Icone }) => {
                                    const sistema = Number(totalPorMetodo[chave] ?? 0);
                                    const dinheiro = chave === "dinheiro";
                                    const contado = dinheiro ? (fecho ? Number(fecho.valor_contado ?? 0) : valorContado === "" ? null : Number(valorContado)) : null;
                                    const diferenca = dinheiro ? (fecho ? Number(fecho.diferenca ?? 0) : diferencaPrevista) : null;
                                    return (
                                        <tr key={chave}>
                                            <td className="px-6 py-4">
                                                <strong className="inline-flex items-center gap-2 text-ink dark:text-[#F2F5FB]">
                                                    <Icone className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                                    {label}
                                                </strong>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(sistema)}</td>
                                            <td className="px-6 py-4">
                                                {dinheiro ? (
                                                    fecho ? (
                                                        <span className="tabular-nums text-ink dark:text-[#F2F5FB]">{formatCurrency(contado)}</span>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            inputMode="decimal"
                                                            value={valorContado}
                                                            disabled={!podeConfirmar}
                                                            placeholder="Quanto contou?"
                                                            aria-label="Dinheiro contado na gaveta"
                                                            onChange={(evento) => {
                                                                setValorContado(evento.target.value);
                                                                setErroContado(null);
                                                            }}
                                                            className="min-h-[44px] w-40 rounded-md border-[#DDE2EE] text-right tabular-nums dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                                        />
                                                    )
                                                ) : fecho ? (
                                                    fecho.conferido_por_metodo?.[chave] !== undefined ? (
                                                        <span className="tabular-nums text-ink dark:text-[#F2F5FB]">{formatCurrency(fecho.conferido_por_metodo[chave])}</span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500">—</span>
                                                    )
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={conferidos[chave] ?? (sistema > 0 ? String(sistema) : "")}
                                                        disabled={!podeConfirmar}
                                                        placeholder="0,00"
                                                        aria-label={`Conferido em ${label}`}
                                                        onChange={(evento) => setConferidos((c) => ({ ...c, [chave]: evento.target.value }))}
                                                        className="min-h-[44px] w-40 rounded-md border-[#DDE2EE] text-right tabular-nums dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(() => {
                                                    const dif = dinheiro
                                                        ? diferenca
                                                        : fecho
                                                          ? fecho.conferido_por_metodo?.[chave] !== undefined
                                                              ? Math.round((Number(fecho.conferido_por_metodo[chave]) - sistema) * 100) / 100
                                                              : null
                                                          : Math.round((Number(conferidos[chave] ?? sistema) - sistema) * 100) / 100;
                                                    if (dif === null || (!dinheiro && sistema === 0 && dif === 0)) return <span className="text-slate-400 dark:text-slate-500">—</span>;
                                                    return (
                                                        <span className={cn("font-semibold tabular-nums", dif === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                                                            {dif > 0 ? "+" : ""}
                                                            {formatCurrency(dif)} · {dif === 0 ? "certo" : dif > 0 ? "a mais" : "em falta"}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <InputError message={erroContado} className="px-6 pt-2" />

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8ECF4] px-6 py-4 dark:border-slate-800">
                        <span className="text-[15px] text-slate-600 dark:text-slate-300">
                            Total do dia: <strong className="tabular-nums text-ink dark:text-[#F2F5FB]">{formatCurrency(totalGeral)}</strong> · {pagamentos.length}{" "}
                            {pagamentos.length === 1 ? "recibo" : "recibos"}
                            {adiantamentos.length > 0 && ` · ${adiantamentos.length} adiantamento(s)`}
                        </span>
                        {fecho ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Caixa fechada
                            </span>
                        ) : podeConfirmar ? (
                            <PrimaryButton type="button" disabled={!podeFechar} onClick={() => setConfirmarAberto(true)} className="min-h-[48px] px-6">
                                <Lock className="h-[18px] w-[18px]" aria-hidden="true" />
                                Fechar a caixa
                            </PrimaryButton>
                        ) : (
                            <span className="text-sm text-slate-500 dark:text-slate-400">Só o dia de hoje pode ser fechado.</span>
                        )}
                    </div>
                </AnimatedPanel>

                {pagamentos.length > 0 && (
                    <AnimatedPanel className="overflow-hidden">
                        <h3 className="border-b border-[#E8ECF4] px-6 py-4 text-base font-bold text-ink dark:border-slate-800 dark:text-[#F2F5FB]">
                            Recibos deste dia · {pagamentos.length}
                        </h3>
                        <ul className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                            {pagamentos.map((p) => (
                                <li key={p.id} className="flex flex-wrap items-center gap-4 px-6 py-3 text-sm">
                                    <span className="flex min-w-[200px] flex-1 flex-col">
                                        <strong className="text-ink dark:text-[#F2F5FB]">{p.cliente?.nome ?? "Cliente removido"}</strong>
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                            {p.numero_recibo} · {formatDateTime(p.created_at).split(" às ")[1]}
                                        </span>
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">{metodoLabels[p.metodo_pagamento] ?? p.metodo_pagamento}</span>
                                    <strong className="w-32 text-right tabular-nums text-ink dark:text-[#F2F5FB]">{formatCurrency(p.valor_pago)}</strong>
                                </li>
                            ))}
                        </ul>
                    </AnimatedPanel>
                )}

                {ultimoFecho && !fecho && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        Último fecho: {formatDate(ultimoFecho.data)} · {formatCurrency(ultimoFecho.total_geral)}
                    </p>
                )}
            </div>

            <div className="hidden bg-white p-8 text-ink print:block">
                <div className="flex items-start justify-between border-b border-slate-300 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand text-white">
                            {empresa?.logotipoUrl ? (
                                <img
                                    src={empresa.logotipoUrl}
                                    alt={empresa.nome}
                                    crossOrigin="anonymous"
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Droplets className="h-6 w-6" aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <p className="text-lg font-bold">{empresa?.nome ?? "Aquafuros"}</p>
                            {empresa?.nuit && <p className="text-xs text-slate-500">NUIT: {empresa.nuit}</p>}
                            {empresa?.localizacao && <p className="text-xs text-slate-500">{empresa.localizacao}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold uppercase tracking-wide">Fecho de Caixa</p>
                        <p className="text-sm text-slate-600">{formatDate(data)}</p>
                        <div className="mt-2 print:hidden">
                            {fecho ? (
                                <StatusBadge tone="slate">
                                    Fechada às {formatDateTime(fecho.created_at).split(" às ")[1]}
                                </StatusBadge>
                            ) : (
                                <StatusBadge tone="emerald">Aberta</StatusBadge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operador</p>
                        <p className="mt-1 font-semibold">{utilizador.name}</p>
                    </div>
                    {ultimoFecho && (
                        <div className="text-right print:hidden">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Último fecho
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-600">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                                {formatDate(ultimoFecho.data)} &middot; {formatCurrency(ultimoFecho.total_geral)}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resumo por método
                    </p>
                    <table className="mt-2 w-full border-collapse text-sm">
                        <tbody>
                            {Object.entries(totalPorMetodo).map(([metodo, total]) => (
                                <tr key={metodo} className="border-b border-slate-200">
                                    <td className="py-2 text-slate-600">
                                        {metodoLabels[metodo] ?? metodo}
                                    </td>
                                    <td className="py-2 text-right">{formatCurrency(total)}</td>
                                </tr>
                            ))}
                            {Object.keys(totalPorMetodo).length === 0 && (
                                <tr>
                                    <td colSpan={2} className="py-4 text-center text-slate-500">
                                        Sem pagamentos registados nesta data.
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td className="py-3 text-base font-bold">Total recebido</td>
                                <td className="py-3 text-right text-base font-bold">{formatCurrency(totalGeral)}</td>
                            </tr>
                            {fecho?.valor_contado !== null && fecho?.valor_contado !== undefined && (
                                <>
                                    <tr className="border-t border-slate-200">
                                        <td className="py-2 text-slate-600">Dinheiro registado</td>
                                        <td className="py-2 text-right">{formatCurrency(esperadoDinheiro)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-slate-600">Dinheiro contado na gaveta</td>
                                        <td className="py-2 text-right">{formatCurrency(fecho.valor_contado)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 font-semibold">Diferença</td>
                                        <td className={`py-2 text-right font-semibold ${Number(fecho.diferenca) === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                            {Number(fecho.diferenca) > 0 ? "+" : ""}{formatCurrency(fecho.diferenca)}
                                            {Number(fecho.diferenca) === 0 ? " (certo)" : Number(fecho.diferenca) > 0 ? " (a mais)" : " (em falta)"}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {pagamentos.length > 0 && (
                    <div className="mt-8">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Recibos emitidos ({pagamentos.length})
                        </p>
                        <table className="mt-2 w-full border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                                    <th className="py-2">Recibo</th>
                                    <th className="py-2">Hora</th>
                                    <th className="py-2">Cliente</th>
                                    <th className="py-2">Método</th>
                                    <th className="py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagamentos.map((p) => (
                                    <tr key={p.id} className="border-b border-slate-100">
                                        <td className="py-2">{p.numero_recibo}</td>
                                        <td className="py-2">{formatDateTime(p.created_at).split(" às ")[1]}</td>
                                        <td className="py-2">{p.cliente?.nome ?? "Cliente removido"}</td>
                                        <td className="py-2">{metodoLabels[p.metodo_pagamento] ?? p.metodo_pagamento}</td>
                                        <td className="py-2 text-right">{formatCurrency(p.valor_pago)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {adiantamentos.length > 0 && (
                    <div className="mt-8">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Adiantamentos e excessos recebidos ({adiantamentos.length})
                        </p>
                        <table className="mt-2 w-full border-collapse text-sm">
                            <tbody>
                                {adiantamentos.map((a) => (
                                    <tr key={a.id} className="border-b border-slate-100">
                                        <td className="py-2">{a.numero_recibo ?? "excesso de pagamento"}</td>
                                        <td className="py-2">{a.cliente?.nome ?? "Cliente removido"}</td>
                                        <td className="py-2">{metodoLabels[a.metodo_pagamento] ?? a.metodo_pagamento}</td>
                                        <td className="py-2 text-right">{formatCurrency(a.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-1 text-xs text-slate-500">Dinheiro que ficou como crédito dos clientes — conta na gaveta, mas só é receita quando for usado.</p>
                    </div>
                )}

                <div className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                </div>
            </div>

            <Modal show={confirmarAberto} onClose={() => setConfirmarAberto(false)} title="Fechar a caixa?" maxWidth="md">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {pagamentos.length} recibo(s), total {formatCurrency(totalGeral)}. Contou {formatCurrency(Number(valorContado || 0))} em dinheiro
                        {diferencaPrevista === 0 ? " — bate certo." : ` — diferença de ${diferencaPrevista > 0 ? "+" : ""}${formatCurrency(diferencaPrevista ?? 0)}.`} Depois de fechada, não poderá registar mais pagamentos hoje.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setConfirmarAberto(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="button" disabled={valorContado === "" || aConfirmar} onClick={confirmarFecho}>
                            {aConfirmar ? "A fechar…" : "Fechar a caixa"}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
