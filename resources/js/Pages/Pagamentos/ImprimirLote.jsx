import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LinhaCorte } from "@/Components/print/FacturaCompacta";
import { useRef } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdfLote from "@/Components/print/BotaoDescarregarPdfLote";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import ReciboTermico58mm from "@/Components/print/ReciboTermico58mm";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { consumoLeitura } from "@/lib/consumoLeitura";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Banco",
    mpesa: "M-Pesa",
    "e-mola": "E-Mola",
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

// Recibo em tira — três por página A4. Três colunas: quem emite · o que pagou
// e para onde foi o dinheiro · valor recebido (borda verde grossa: "pago").
function ReciboCompacto({ pagamento, qrUrl, empresa }) {
    const factura = pagamento.factura;
    const parcelas = pagamento.imputacoes ?? [];
    const linhas = parcelas.length
        ? parcelas.flatMap((p) => [
              [`Consumo · ${p.factura?.numero_factura ?? "factura"}`, Number(p.valor_principal)],
              ...(Number(p.valor_multa) > 0 ? [[`Multa · ${p.factura?.numero_factura ?? ""}`, Number(p.valor_multa)]] : []),
          ])
        : [[factura ? `Factura ${factura.numero_factura} · ${meses[factura.mes - 1]}/${factura.ano}` : "Pagamento", Number(pagamento.valor_pago)]];

    return (
        <article
            className="grid h-[85mm] grid-cols-[48mm_1fr_47mm] overflow-hidden rounded-[2.5mm] border border-[#C9D2E3] text-[7.5pt] leading-tight text-black"
            style={{ breakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
            <section className="flex flex-col gap-[2mm] border-r border-[#C9D2E3] bg-[#F2F8F4] px-[3.5mm] py-[3mm]">
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-[9pt] font-bold">{empresa?.nome ?? "Aquafuros"}</p>
                    {empresa?.localizacao && <p className="truncate text-[7pt] text-slate-600">{empresa.localizacao}</p>}
                </div>
                <div>
                    <p className="text-[7pt] font-extrabold tracking-[1.5px] text-emerald-700">RECIBO</p>
                    <p className="text-[10pt] font-bold">{pagamento.numero_recibo}</p>
                </div>
                <dl className="flex flex-col gap-[0.8mm]">
                    <div className="flex justify-between gap-2"><dt className="text-slate-600">Data</dt><dd className="font-bold">{formatDateTime(pagamento.pago_em ?? pagamento.created_at).split(" às ")[0]}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-600">Caixa</dt><dd className="truncate font-bold">{pagamento.recebido_por?.name ?? "—"}</dd></div>
                </dl>
                <div className="mt-auto flex flex-col gap-[0.3mm] text-[6.5pt] leading-snug text-slate-600">
                    <p className="font-bold text-black">{empresa?.nome ?? "Aquafuros"}</p>
                    {empresa?.nuit && <p>NUIT {empresa.nuit}</p>}
                </div>
            </section>

            <section className="flex min-w-0 flex-col gap-[2mm] px-[4mm] py-[3mm]">
                <div>
                    <p className="text-[7pt] text-slate-600">Recebido de</p>
                    <p className="truncate text-[11pt] font-bold">{pagamento.cliente?.nome ?? "Cliente removido"}</p>
                    <p className="text-[7pt] text-slate-600">{pagamento.cliente?.numero_cliente}</p>
                </div>
                <table className="w-full border-collapse tabular-nums">
                    <thead>
                        <tr className="border-b border-[#E8ECF4] text-[7pt] font-bold text-slate-600">
                            <th className="py-[0.8mm] text-left">PAGOU</th>
                            <th className="py-[0.8mm] text-right">MT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {linhas.slice(0, 4).map(([texto, valor]) => (
                            <tr key={texto} className="border-b border-[#E8ECF4]">
                                <td className="py-[0.8mm] pr-2">{texto}</td>
                                <td className="whitespace-nowrap py-[0.8mm] text-right">{formatCurrency(valor).replace(" MT", "")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="flex gap-[3mm] text-[7pt] text-slate-600">
                    <span>Método: <strong className="text-black">{metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}</strong></span>
                    {pagamento.referencia_pagamento && <span>Ref.: <strong className="text-black">{pagamento.referencia_pagamento}</strong></span>}
                </p>
                <p className="mt-auto border-t border-[#DDE2EE] pt-[1.5mm] text-[6.8pt] leading-snug text-slate-600">
                    <strong className="text-black">Obrigado.</strong> Guarde este recibo. A próxima factura vence no dia 10; depois aplica-se multa e o fornecimento pode ser cortado.
                </p>
            </section>

            <section className="flex flex-col gap-[2mm] border-l border-[#C9D2E3] px-[3.5mm] py-[3mm]">
                <div className="rounded-[2.5mm] border-[0.6mm] border-emerald-700 px-[3mm] py-[2mm]">
                    <p className="text-[7pt] font-bold text-emerald-700">VALOR RECEBIDO</p>
                    <p className="text-[15pt] font-extrabold leading-tight tabular-nums">{formatCurrency(pagamento.valor_pago)}</p>
                    {factura && <p className="text-[7pt] text-slate-600">Factura {factura.estado === "paga" ? "paga" : "com saldo em aberto"}</p>}
                </div>
                {qrUrl && (
                    <div className="mt-auto flex items-center gap-[2mm]">
                        <QRCodeSVG value={qrUrl} size={46} level="M" marginSize={1} />
                        <p className="text-[6.5pt] leading-tight text-slate-600">Verificar autenticidade</p>
                    </div>
                )}
            </section>
        </article>
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
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink"
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
                            className="bg-white p-[12mm] shadow-sm ring-1 ring-slate-200 print:p-0 print:shadow-none print:ring-0"
                            style={pageIndex < paginas.length - 1 ? { breakAfter: "page" } : undefined}
                        >
                            {grupo.map((pagamento, i) => (
                                <div key={pagamento.id}>
                                    {i > 0 && <LinhaCorte />}
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
