import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const estadoConfig = {
    ativo: { label: "ACTIVO", classes: "border-emerald-600 text-emerald-700" },
    inativo: { label: "INACTIVO", classes: "border-slate-400 text-slate-500" },
    cortado: { label: "CORTADO", classes: "border-rose-600 text-rose-700" },
};

/**
 * Ficha do cliente para impressão — dados completos, tarifa, dívida actual
 * e resumo do histórico de facturas/pagamentos. Só A4, é um documento de
 * referência, não um recibo/factura térmica.
 */
export default function Imprimir({ cliente, resumo }) {
    const estado = estadoConfig[cliente.estado];

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Ficha de ${cliente.nome}`} />

            <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/clientes"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800"
                >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Imprimir
                </button>
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
                        <p className="text-xl font-bold uppercase tracking-wide">Ficha do Cliente</p>
                        <p className="text-sm text-slate-600">{cliente.numero_cliente}</p>
                        <span className={`mt-2 inline-block rounded border px-3 py-1 text-xs font-bold ${estado.classes}`}>
                            {estado.label}
                        </span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dados pessoais</p>
                        <p className="mt-1 font-semibold">{cliente.nome}</p>
                        <p className="text-slate-600">Tel: {cliente.telefone || "—"}</p>
                        <p className="text-slate-600">{cliente.endereco || "—"}</p>
                        <p className="text-slate-600">Bairro: {cliente.bairro || "—"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ligação</p>
                        <p className="mt-1 font-semibold">Tarifa: {cliente.tarifa?.nome ?? "—"}</p>
                        <p className="text-slate-600">
                            {formatCurrency(cliente.tarifa?.preco_m3)} / m³
                        </p>
                        <p className="text-slate-600">
                            Cliente desde{" "}
                            {cliente.data_adesao ? formatDate(cliente.data_adesao) : formatDateTime(cliente.created_at)}
                        </p>
                    </div>
                </div>

                <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Situação financeira</p>
                    <table className="mt-2 w-full border-collapse text-sm">
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="py-2 text-slate-600">Dívida actual</td>
                                <td className="py-2 text-right font-semibold">
                                    {formatCurrency(cliente.divida?.valor_divida ?? 0)}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                                <td className="py-2 text-slate-600">Meses em atraso</td>
                                <td className="py-2 text-right">{cliente.divida?.meses_atraso ?? 0}</td>
                            </tr>
                            <tr>
                                <td className="py-2 text-slate-600">Em risco de corte</td>
                                <td className="py-2 text-right">{cliente.divida?.em_corte ? "Sim" : "Não"}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resumo do histórico
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-md border border-slate-200 p-3 text-center">
                            <p className="text-lg font-bold text-slate-900">{resumo.numeroFacturas}</p>
                            <p className="text-xs text-slate-500">Facturas emitidas</p>
                        </div>
                        <div className="rounded-md border border-slate-200 p-3 text-center">
                            <p className="text-lg font-bold text-slate-900">{formatCurrency(resumo.totalFacturado)}</p>
                            <p className="text-xs text-slate-500">Total facturado</p>
                        </div>
                        <div className="rounded-md border border-slate-200 p-3 text-center">
                            <p className="text-lg font-bold text-slate-900">{resumo.numeroPagamentos}</p>
                            <p className="text-xs text-slate-500">Pagamentos recebidos</p>
                        </div>
                        <div className="rounded-md border border-slate-200 p-3 text-center">
                            <p className="text-lg font-bold text-slate-900">{formatCurrency(resumo.totalPago)}</p>
                            <p className="text-xs text-slate-500">Total pago</p>
                        </div>
                    </div>
                </div>

                <div className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                </div>
            </div>
        </div>
    );
}
