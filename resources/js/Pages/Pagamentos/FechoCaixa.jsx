import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

export default function FechoCaixa({ pagamentos, utilizador, data, totalGeral, totalPorMetodo, caixas }) {
    const [dataFiltro, setDataFiltro] = useState(data);
    const [caixaFiltro, setCaixaFiltro] = useState(utilizador.id);

    const aplicarFiltro = () => {
        router.get("/pagamentos/fecho-caixa", { data: dataFiltro, utilizador_id: caixaFiltro });
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
                    <button
                        type="button"
                        onClick={aplicarFiltro}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        Ver
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800"
                    >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir
                    </button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
                <div className="flex items-start justify-between border-b border-slate-300 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-cyan-700 text-white">
                            <Droplets className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-lg font-bold">Aquafuros</p>
                            <p className="text-xs text-slate-500">Gestão de Furos de Água</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold uppercase tracking-wide">Fecho de Caixa</p>
                        <p className="text-sm text-slate-600">{formatDate(data)}</p>
                    </div>
                </div>

                <div className="mt-6 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operador</p>
                    <p className="mt-1 font-semibold">{utilizador.name}</p>
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

                <div className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                </div>
            </div>
        </div>
    );
}
