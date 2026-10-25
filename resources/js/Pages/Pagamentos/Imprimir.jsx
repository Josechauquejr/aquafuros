import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Printer } from "lucide-react";
import { useRef } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdf from "@/Components/print/BotaoDescarregarPdf";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import ReciboTermico58mm from "@/Components/print/ReciboTermico58mm";
import CabecalhoDocumento from "@/Components/print/CabecalhoDocumento";
import RodapeDocumento from "@/Components/print/RodapeDocumento";
import DiscriminacaoRecibo from "@/Components/print/DiscriminacaoRecibo";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { consumoLeitura } from "@/lib/consumoLeitura";

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
    const { empresa } = usePage().props;
    const [formato, setFormato] = useFormatoImpressao();
    const conteudoRef = useRef(null);
    const factura = pagamento.factura;
    const leitura = factura?.leitura;
    const consumo = leitura ? consumoLeitura(leitura) : null;
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
                    <AnimatedButton variant="primary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir
                    </AnimatedButton>
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
                <CabecalhoDocumento empresa={empresa} titulo="Recibo de pagamento" numero={pagamento.numero_recibo} />

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
                        <p className="mt-1 font-semibold">{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</p>
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
                            <p className="mt-3 text-sm font-semibold">N.º da leitura: {leitura.numero_leitura ?? "—"}</p>
                        )}

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
                            <span>Total da factura na emissão</span>
                            <span>{formatCurrency(factura.emissao_original?.total_pagar ?? factura.total_pagar)}</span>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex items-center justify-between rounded-md bg-cyan-50 px-4 py-4">
                    <span className="text-sm font-semibold text-cyan-900">Valor pago</span>
                    <span className="text-xl font-bold text-cyan-900">{formatCurrency(pagamento.valor_pago)}</span>
                </div>
                <DiscriminacaoRecibo pagamento={pagamento} />

                <div className="mt-10">
                    <RodapeDocumento qrUrl={qrUrl} />
                </div>
            </div>
            )}
        </div>
    );
}
