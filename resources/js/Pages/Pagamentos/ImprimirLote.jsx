import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Printer } from "lucide-react";
import CabecalhoDocumento from "@/Components/print/CabecalhoDocumento";
import RodapeDocumento from "@/Components/print/RodapeDocumento";
import { useRef } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdfLote from "@/Components/print/BotaoDescarregarPdfLote";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import ReciboTermico58mm from "@/Components/print/ReciboTermico58mm";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";
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
    let grupo = [];
    for (const pagamento of array) {
        if ((pagamento.imputacoes?.length ?? 0) > 1) {
            if (grupo.length) result.push(grupo);
            grupo = [];
            result.push([pagamento]);
        } else {
            grupo.push(pagamento);
            if (grupo.length === size) { result.push(grupo); grupo = []; }
        }
    }
    if (grupo.length) result.push(grupo);
    return result;
}

// Recibo compacto — três por página A4, para poupar papel.
function ReciboCompacto({ pagamento, primeiraLeitura, qrUrl, empresa }) {
    const factura = pagamento.factura;
    const leitura = factura?.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;
    const estadoFactura = factura ? estadoFacturaConfig[factura.estado] : null;

    return (
        <div className="flex min-h-[90mm] flex-col justify-between p-4 text-slate-900" style={{ breakInside: "avoid" }}>
            <div>
                <CabecalhoDocumento empresa={empresa} compacto titulo="Recibo de pagamento" numero={pagamento.numero_recibo} />
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="font-semibold">{pagamento.cliente?.nome ?? "Cliente removido"}</p>
                        <p className="text-slate-500">{pagamento.cliente?.numero_cliente}</p>
                        <p className="text-slate-500">Tel: {pagamento.cliente?.telefone || "—"}</p>
                    </div>
                    <div className="text-right">
                        <p>{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</p>
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
                        {estadoFactura && (
                            <p className="mt-1 text-[10px] text-slate-500">
                                Estado da factura: <span className="font-semibold text-slate-700">{estadoFactura.label}</span>
                            </p>
                        )}
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
                <div className="mt-2 flex items-center justify-between border-t border-slate-300 pt-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Valor pago</span>
                    <span className="text-base font-bold text-slate-900">{formatCurrency(pagamento.valor_pago)}</span>
                </div>
                {(pagamento.imputacoes ?? []).map(parcela => <p key={parcela.id} className="mt-1 text-[10px] text-slate-600">
                    {parcela.factura?.numero_factura} · Principal: {formatCurrency(parcela.valor_principal)} · Multa: {formatCurrency(parcela.valor_multa)}
                </p>)}
            </div>

            <div>
                <RodapeDocumento compacto qrUrl={qrUrl} />
            </div>
        </div>
    );
}

export default function ImprimirLote({ pagamentos, primeirasLeituras, qrUrls = {} }) {
    const { empresa } = usePage().props;
    const [formato, setFormato] = useFormatoImpressao();
    const paginas = chunk(pagamentos, 3);
    // Um elemento por "página" descarregável — um recibo em 58mm, um grupo
    // de 3 em A4 — preenchido pelo ref de callback em cada map() abaixo.
    const paginasRef = useRef([]);
    paginasRef.current = [];
    const registarPagina = (index) => (el) => {
        paginasRef.current[index] = el;
    };

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
                    <BotaoDescarregarPdfLote
                        elementosRef={paginasRef}
                        nomeFicheiro={`recibos-lote-${Date.now()}.pdf`}
                        formato={formato}
                    />
                    <AnimatedButton variant="primary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir tudo
                    </AnimatedButton>
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
                            ref={registarPagina(index)}
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
                            ref={registarPagina(pageIndex)}
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
                                        empresa={empresa}
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
