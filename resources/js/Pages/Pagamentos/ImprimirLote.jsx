import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import ReciboTermico58mm from "@/Components/print/ReciboTermico58mm";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
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
    parcial: { label: "PARCIAL", classes: "border-cyan-600 text-cyan-700" },
    anulada: { label: "ANULADA", classes: "border-slate-400 text-slate-500" },
};

function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
    return result;
}

// Recibo compacto — três por página A4, para poupar papel.
function ReciboCompacto({ pagamento, primeiraLeitura, qrUrl }) {
    const factura = pagamento.factura;
    const leitura = factura?.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;
    const estadoFactura = factura ? estadoFacturaConfig[factura.estado] : null;

    return (
        <div className="flex h-[90mm] flex-col justify-between p-4 text-slate-900" style={{ breakInside: "avoid" }}>
            <div>
                <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-cyan-700 text-white">
                            <Droplets className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-sm font-bold leading-none">Aquafuros</p>
                            <p className="text-[10px] text-slate-500">Recibo de Pagamento</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold uppercase leading-none">{pagamento.numero_recibo}</p>
                        {estadoFactura && (
                            <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${estadoFactura.classes}`}>
                                {estadoFactura.label}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="font-semibold">{pagamento.cliente?.nome ?? "Cliente removido"}</p>
                        <p className="text-slate-500">{pagamento.cliente?.numero_cliente}</p>
                        <p className="text-slate-500">Tel: {pagamento.cliente?.telefone || "—"}</p>
                    </div>
                    <div className="text-right">
                        <p>{formatDateTime(pagamento.created_at)}</p>
                        <p className="text-slate-500">Recebido por {pagamento.recebido_por?.name ?? "—"}</p>
                        <p className="text-slate-500">
                            {pagamento.cliente?.bairro || pagamento.cliente?.endereco || "—"}
                        </p>
                    </div>
                </div>

                {factura && (
                    <div className="mt-2 rounded bg-slate-50 px-3 py-1.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span>
                                Factura {factura.numero_factura} — {meses[factura.mes - 1]}/{factura.ano}
                            </span>
                            {leitura && (
                                <span className="font-semibold">
                                    {consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}
                                </span>
                            )}
                        </div>
                        {leitura && (
                            <p className="mt-0.5 text-slate-500">
                                Leitura: {Number(leitura.leitura_anterior).toFixed(1)} →{" "}
                                {Number(leitura.leitura_actual).toFixed(1)}
                                {primeiraLeitura && <span> (inicial)</span>}
                            </p>
                        )}
                    </div>
                )}

                <p className="mt-2 text-xs text-slate-600">
                    Método:{" "}
                    <span className="font-medium text-slate-800">
                        {metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}
                    </span>
                    {pagamento.referencia_pagamento ? ` — ${pagamento.referencia_pagamento}` : ""}
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-300 pt-2">
                <span className="text-[10px] text-slate-400">RJM Consultórios e Serviços</span>
                <div className="flex items-center gap-2">
                    {qrUrl && <QRCodeSVG value={qrUrl} size={32} level="M" />}
                    <span className="text-base font-bold">{formatCurrency(pagamento.valor_pago)}</span>
                </div>
            </div>
        </div>
    );
}

export default function ImprimirLote({ pagamentos, primeirasLeituras, qrUrls = {} }) {
    const [formato, setFormato] = useState("a4");
    const paginas = chunk(pagamentos, 3);

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Impressão em lote — ${pagamentos.length} recibo(s)`} />
            <EstiloPagina formato={formato} />

            <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/pagamentos"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {pagamentos.length} recibo(s)
                        {formato === "a4" && ` · ${paginas.length} página(s) (3 por folha A4)`}
                    </span>
                    <FormatoImpressaoToggle formato={formato} onChange={setFormato} />
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800"
                    >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir tudo
                    </button>
                </div>
            </div>

            {pagamentos.length === 0 && (
                <p className="mx-auto max-w-[210mm] px-4 text-center text-sm text-slate-500">
                    Nenhum recibo corresponde aos critérios seleccionados.
                </p>
            )}

            {formato === "58mm" ? (
                <div className="mx-auto w-[58mm] space-y-3 print:space-y-0">
                    {pagamentos.map((pagamento, index) => (
                        <div
                            key={pagamento.id}
                            className="border border-dashed border-slate-300 bg-white p-[2mm] print:border-0"
                            style={index < pagamentos.length - 1 ? { breakAfter: "page" } : undefined}
                        >
                            <ReciboTermico58mm
                                pagamento={pagamento}
                                primeiraLeitura={primeirasLeituras[pagamento.id]}
                                qrUrl={qrUrls[pagamento.id]}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mx-auto max-w-[210mm] space-y-6 px-4 print:space-y-0 print:px-0">
                    {paginas.map((grupo, pageIndex) => (
                        <div
                            key={pageIndex}
                            className="border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"
                            style={pageIndex < paginas.length - 1 ? { breakAfter: "page" } : undefined}
                        >
                            {grupo.map((pagamento, i) => (
                                <div
                                    key={pagamento.id}
                                    className={i < grupo.length - 1 ? "border-b border-dashed border-slate-300" : ""}
                                >
                                    <ReciboCompacto
                                        pagamento={pagamento}
                                        primeiraLeitura={primeirasLeituras[pagamento.id]}
                                        qrUrl={qrUrls[pagamento.id]}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
