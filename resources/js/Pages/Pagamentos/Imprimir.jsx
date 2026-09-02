import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import BotaoDescarregarPdf from "@/Components/print/BotaoDescarregarPdf";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import ReciboTermico58mm from "@/Components/print/ReciboTermico58mm";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const estadoFacturaConfig = {
    paga: { label: "PAGA", classes: "border-emerald-600 text-emerald-700" },
    pendente: { label: "PENDENTE", classes: "border-amber-600 text-amber-700" },
    parcial: { label: "PARCIALMENTE PAGA", classes: "border-cyan-600 text-cyan-700" },
    anulada: { label: "ANULADA", classes: "border-slate-400 text-slate-500" },
};

export default function Imprimir({ pagamento, primeiraLeitura, qrUrl }) {
    const [formato, setFormato] = useState("a4");
    const conteudoRef = useRef(null);
    const factura = pagamento.factura;
    const leitura = factura?.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;
    const estadoFactura = factura ? estadoFacturaConfig[factura.estado] : null;

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Recibo ${pagamento.numero_recibo}`} />
            <EstiloPagina formato={formato} />

            <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/pagamentos"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <FormatoImpressaoToggle formato={formato} onChange={setFormato} />
                    <BotaoDescarregarPdf
                        alvoRef={conteudoRef}
                        nomeFicheiro={`recibo-${pagamento.numero_recibo}.pdf`}
                        formato={formato}
                    />
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

            {formato === "58mm" ? (
                <div
                    ref={conteudoRef}
                    className="mx-auto w-[58mm] border border-dashed border-slate-300 bg-white p-[2mm] shadow-sm print:border-0 print:shadow-none"
                >
                    <ReciboTermico58mm pagamento={pagamento} primeiraLeitura={primeiraLeitura} qrUrl={qrUrl} />
                </div>
            ) : (
            <div
                ref={conteudoRef}
                className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none"
            >
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
                        <p className="text-xl font-bold uppercase tracking-wide">Recibo de Pagamento</p>
                        <p className="text-sm text-slate-600">{pagamento.numero_recibo}</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                        <p className="mt-1 font-semibold">{pagamento.cliente?.nome ?? "Cliente removido"}</p>
                        <p className="text-slate-600">Nº {pagamento.cliente?.numero_cliente}</p>
                        <p className="text-slate-600">Tel: {pagamento.cliente?.telefone || "—"}</p>
                        <p className="text-slate-600">{pagamento.cliente?.endereco || "—"}</p>
                        <p className="text-slate-600">{pagamento.cliente?.bairro || "—"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</p>
                        <p className="mt-1 font-semibold">{formatDateTime(pagamento.created_at)}</p>
                        <p className="text-slate-600">Recebido por {pagamento.recebido_por?.name ?? "—"}</p>
                        <p className="text-slate-600">
                            {metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}
                            {pagamento.referencia_pagamento ? ` — ${pagamento.referencia_pagamento}` : ""}
                        </p>
                    </div>
                </div>

                {factura && (
                    <div className="mt-8 rounded-md border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Referente à factura
                                </p>
                                <p className="font-semibold">
                                    {factura.numero_factura} — {meses[factura.mes - 1]} de {factura.ano}
                                </p>
                            </div>
                            {estadoFactura && (
                                <span
                                    className={`rounded border px-3 py-1 text-xs font-bold ${estadoFactura.classes}`}
                                >
                                    {estadoFactura.label}
                                </span>
                            )}
                        </div>

                        {leitura && (
                            <table className="mt-4 w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                                        <th className="py-2">Leitura anterior</th>
                                        <th className="py-2">Leitura actual</th>
                                        <th className="py-2 text-right">Consumo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="py-2">
                                            {Number(leitura.leitura_anterior).toFixed(2)}
                                            {primeiraLeitura && (
                                                <span className="ml-2 text-xs text-slate-500">(leitura inicial)</span>
                                            )}
                                        </td>
                                        <td className="py-2">{Number(leitura.leitura_actual).toFixed(2)}</td>
                                        <td className="py-2 text-right font-semibold">
                                            {consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )}

                        <div className="mt-3 flex justify-between text-sm text-slate-600">
                            <span>Total da factura</span>
                            <span>{formatCurrency(factura.total_pagar)}</span>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex items-center justify-between rounded-md bg-cyan-50 px-4 py-4">
                    <span className="text-sm font-semibold text-cyan-900">Valor pago</span>
                    <span className="text-xl font-bold text-cyan-900">{formatCurrency(pagamento.valor_pago)}</span>
                </div>

                <div className="mt-10 flex items-center justify-between gap-4 border-t border-slate-300 pt-4">
                    <p className="text-xs text-slate-400">
                        Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                        <br />
                        Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                    </p>
                    {qrUrl && (
                        <div className="flex shrink-0 flex-col items-center gap-1">
                            <QRCodeSVG value={qrUrl} size={72} level="M" />
                            <p className="text-[9px] text-slate-400">Verificar autenticidade</p>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
}
