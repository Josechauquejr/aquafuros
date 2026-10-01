import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, CheckCircle2, Droplets, Lock, Printer } from "lucide-react";
import { useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
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
}) {
    const { empresa, flash } = usePage().props;
    const [dataFiltro, setDataFiltro] = useState(data);
    const [caixaFiltro, setCaixaFiltro] = useState(utilizador.id);
    const [confirmarAberto, setConfirmarAberto] = useState(false);
    const [aConfirmar, setAConfirmar] = useState(false);
    const [valorContado, setValorContado] = useState("");
    const [erroContado, setErroContado] = useState(null);
    const diferencaPrevista = valorContado === "" ? null : Math.round((Number(valorContado) - esperadoDinheiro) * 100) / 100;

    const aplicarFiltro = () => {
        router.get("/pagamentos/fecho-caixa", { data: dataFiltro, utilizador_id: caixaFiltro });
    };

    const confirmarFecho = () => {
        setAConfirmar(true);
        router.post(
            "/pagamentos/fecho-caixa/confirmar",
            { valor_contado: valorContado },
            {
                onError: (erros) => setErroContado(erros.valor_contado ?? null),
                onFinish: () => { setAConfirmar(false); },
                onSuccess: () => setConfirmarAberto(false),
            },
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Fecho de caixa — ${formatDate(data)}`} />

            <div className="mx-auto mb-4 flex max-w-3xl flex-col gap-3 px-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/pagamentos"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        value={dataFiltro}
                        onChange={(event) => setDataFiltro(event.target.value)}
                        className="rounded-md border-slate-300 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
                    />
                    {caixas.length > 0 && (
                        <select
                            value={caixaFiltro}
                            onChange={(event) => setCaixaFiltro(event.target.value)}
                            className="rounded-md border-slate-300 text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
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
                    <AnimatedButton variant="primary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir
                    </AnimatedButton>
                    {podeConfirmar && !fecho && (
                        <AnimatedButton variant="secondary" onClick={() => setConfirmarAberto(true)}>
                            <Lock className="h-4 w-4" aria-hidden="true" />
                            Confirmar fecho
                        </AnimatedButton>
                    )}
                </div>
            </div>

            <div className="mx-auto mb-4 max-w-3xl px-4 print:hidden">
            </div>

            <div className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
                <div className="flex items-start justify-between border-b border-slate-300 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cyan-700 text-white">
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

            <Modal show={confirmarAberto} onClose={() => setConfirmarAberto(false)} title="Confirmar fecho de caixa" maxWidth="md">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {pagamentos.length} recibo(s), total {formatCurrency(totalGeral)}. Conte o dinheiro em numerário que tem na
                        gaveta e indique o valor: o sistema regista a diferença para o que está registado
                        ({formatCurrency(esperadoDinheiro)} em dinheiro). Depois de fechada, não poderá registar mais pagamentos hoje.
                    </p>
                    <div>
                        <InputLabel htmlFor="valor_contado" value="Dinheiro contado (MZN)" />
                        <TextInput
                            id="valor_contado"
                            type="number"
                            min="0"
                            step="0.01"
                            value={valorContado}
                            onChange={(evento) => { setValorContado(evento.target.value); setErroContado(null); }}
                            className="mt-1 block w-full"
                            autoFocus
                        />
                        <InputError message={erroContado} className="mt-1" />
                        {diferencaPrevista !== null && (
                            <p className={`mt-2 text-sm font-medium ${diferencaPrevista === 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                {diferencaPrevista === 0
                                    ? "Bate certo."
                                    : `Diferença de ${diferencaPrevista > 0 ? "+" : ""}${formatCurrency(diferencaPrevista)} (${diferencaPrevista > 0 ? "a mais" : "em falta"}).`}
                            </p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setConfirmarAberto(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="button" disabled={valorContado === "" || aConfirmar} onClick={confirmarFecho}>
                            {aConfirmar ? "A fechar..." : "Confirmar fecho"}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
