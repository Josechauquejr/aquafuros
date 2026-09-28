import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import BotaoDescarregarPdfLote from "@/Components/print/BotaoDescarregarPdfLote";
import FacturaTermica58mm from "@/Components/print/FacturaTermica58mm";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";
import { formatCurrency, formatDate } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const estadoConfig = {
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

// Recibo/factura compacto — três por página A4, para poupar papel.
function FacturaCompacta({ factura, primeiraLeitura, consumoAnterior, facturaAnterior, qrUrl, empresa }) {
    const estado = estadoConfig[factura.estado];
    const leitura = factura.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;
    const empresaLinha2 =
        [empresa?.nuit && `NUIT: ${empresa.nuit}`, empresa?.localizacao].filter(Boolean).join(" · ") ||
        "Gestão de Furos de Água";

    return (
        <div className="flex h-[90mm] flex-col justify-between p-4 text-slate-900" style={{ breakInside: "avoid" }}>
            <div className="space-y-2">
                <div className="flex items-start justify-between border-b border-slate-300 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border-2 border-cyan-700 text-cyan-700">
                            {empresa?.logotipoUrl ? (
                                <img
                                    src={empresa.logotipoUrl}
                                    alt={empresa.nome}
                                    crossOrigin="anonymous"
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <Droplets className="h-5 w-5" aria-hidden="true" />
                            )}
                        </div>
                        <div className="leading-tight">
                            <p className="text-base font-bold leading-tight">{empresa?.nome ?? "Aquafuros"}</p>
                            <p className="text-[11px] text-slate-500">{empresaLinha2}</p>
                        </div>
                    </div>
                    <div className="text-right leading-tight">
                        <p className="text-base font-bold uppercase leading-tight">{factura.numero_factura}</p>
                        <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-[11px] font-bold ${estado.classes}`}>
                            {estado.label}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs leading-tight">
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold leading-tight">{factura.cliente?.nome ?? "Cliente removido"}</p>
                        <p className="text-slate-500">
                            Nº {factura.cliente?.numero_cliente} &middot; {factura.cliente?.tarifa?.nome ?? "—"}
                        </p>
                        <p className="text-slate-500">Tel: {factura.cliente?.telefone || "—"}</p>
                        <p className="text-slate-500">
                            {factura.cliente?.endereco || "—"}
                            {factura.cliente?.bairro ? ` — ${factura.cliente.bairro}` : ""}
                        </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                        <p className="font-semibold">{meses[factura.mes - 1]}/{factura.ano}</p>
                        <p className="text-slate-500">Emitida {formatDate(factura.created_at)}</p>
                        {factura.cliente?.data_adesao && (
                            <p className="text-slate-500">Cliente desde {formatDate(factura.cliente.data_adesao)}</p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-300 px-2 py-1 text-center leading-tight">
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Consumo anterior</p>
                        <p className="text-sm font-semibold text-slate-600">
                            {consumoAnterior !== null && consumoAnterior !== undefined
                                ? `${Number(consumoAnterior).toFixed(2)} m³`
                                : "—"}
                        </p>
                    </div>
                    <div className="rounded border-2 border-cyan-700 px-2 py-1 text-center leading-tight">
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-cyan-800">Consumo actual</p>
                        <p className="text-xl font-bold text-cyan-900">
                            {consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-slate-300 px-2 py-1 text-center leading-tight">
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">Valor mês anterior</p>
                        <p className="text-sm font-semibold text-slate-600">
                            {facturaAnterior ? formatCurrency(facturaAnterior.total_pagar) : "—"}
                        </p>
                    </div>
                    <div className="rounded border-2 border-slate-900 px-2 py-1 text-center leading-tight">
                        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-700">Total a pagar</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(factura.total_pagar)}</p>
                    </div>
                </div>

                <p className="flex justify-between text-[10px] leading-tight text-slate-500">
                    <span>
                        Leitura {leitura ? Number(leitura.leitura_anterior).toFixed(1) : "—"} →{" "}
                        {leitura ? Number(leitura.leitura_actual).toFixed(1) : "—"}
                        {primeiraLeitura ? " (inicial)" : ""}
                    </span>
                    <span>
                        Consumo {formatCurrency(factura.valor_consumo)} · Dívida {formatCurrency(factura.divida_anterior)} · Multa {formatCurrency(factura.multa)}
                    </span>
                </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-300 pt-2">
                <span className="text-[10px] font-bold leading-tight text-slate-800">
                    Pag: E-Mola 876781920 (J. Chauque) · M-Pesa 853754024 (J. Chaúque)
                </span>
                {qrUrl && <QRCodeSVG value={qrUrl} size={32} level="M" />}
            </div>
        </div>
    );
}

export default function ImprimirLote({ facturas, primeirasLeituras, consumosAnteriores, facturasAnteriores = {}, qrUrls = {} }) {
    const { empresa } = usePage().props;
    const [formato, setFormato] = useFormatoImpressao();
    const paginas = chunk(facturas, 3);
    // Um elemento por "página" descarregável — uma factura em 58mm, um grupo
    // de 3 em A4 — preenchido pelo ref de callback em cada map() abaixo.
    const paginasRef = useRef([]);
    paginasRef.current = [];
    const registarPagina = (index) => (el) => {
        paginasRef.current[index] = el;
    };

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Impressão em lote — ${facturas.length} factura(s)`} />
            <EstiloPagina formato={formato} />

            <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/facturas"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {facturas.length} factura(s)
                        {formato === "a4" && ` · ${paginas.length} página(s) (3 por folha A4)`}
                    </span>
                    <FormatoImpressaoToggle formato={formato} onChange={setFormato} />
                    <BotaoDescarregarPdfLote
                        elementosRef={paginasRef}
                        nomeFicheiro={`facturas-lote-${Date.now()}.pdf`}
                        formato={formato}
                    />
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

            {facturas.length === 0 && (
                <p className="mx-auto max-w-[210mm] px-4 text-center text-sm text-slate-500">
                    Nenhuma factura corresponde aos critérios seleccionados.
                </p>
            )}

            {formato === "58mm" ? (
                <div className="mx-auto w-[58mm] space-y-3 print:space-y-0">
                    {facturas.map((factura, index) => (
                        <div
                            key={factura.id}
                            ref={registarPagina(index)}
                            className="border border-dashed border-slate-300 bg-white p-[2mm] print:border-0"
                            style={index < facturas.length - 1 ? { breakAfter: "page" } : undefined}
                        >
                            <FacturaTermica58mm
                                factura={factura}
                                primeiraLeitura={primeirasLeituras[factura.id]}
                                consumoAnterior={consumosAnteriores[factura.id]}
                                qrUrl={qrUrls[factura.id]}
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
                            {grupo.map((factura, i) => (
                                <div
                                    key={factura.id}
                                    className={i < grupo.length - 1 ? "border-b border-dashed border-slate-300" : ""}
                                >
                                    <FacturaCompacta
                                        factura={factura}
                                        primeiraLeitura={primeirasLeituras[factura.id]}
                                        consumoAnterior={consumosAnteriores[factura.id]}
                                        facturaAnterior={facturasAnteriores[factura.id]}
                                        qrUrl={qrUrls[factura.id]}
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
