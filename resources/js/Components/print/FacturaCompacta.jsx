import { Droplets, Scissors } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatDate } from "@/lib/format";
import { estadoDocumento, mesesFactura, moedaDocumento, resumoDocumento, telefonePagamento, volumeDocumento } from "@/lib/facturaDocumento";

/**
 * Factura em tira (3 por folha A4). Três colunas — quem emite · o que se
 * consumiu · quanto pagar e até quando (Gestalt da região comum). O total
 * fica num quadro de borda grossa: é o que o cliente procura primeiro. Sem
 * fundos cheios, para sobreviver a uma impressora a preto e branco.
 * Altura fixa de 85mm: 3 tiras + linhas de corte cabem numa A4.
 */
export default function FacturaCompacta({ factura, empresa, qrUrl }) {
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const ligacao = factura.tipo === "ligacao";
    const meios = [
        ["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular],
        ["E-Mola", empresa?.emola_numero, empresa?.emola_titular],
    ].filter(([, numero]) => numero);
    // Quando todas as contas têm o mesmo titular, mostra-o uma só vez.
    const titulares = [...new Set(meios.map(([, , titular]) => titular).filter(Boolean))];
    const linhas = [
        [ligacao ? "Taxa de ligação" : `Consumo ${volumeDocumento(resumo.consumo)}`, resumo.consumoEmitido],
        ...(resumo.acertoLeitura !== 0 ? [["Acerto de leituras", resumo.acertoLeitura]] : []),
        ...(resumo.saldoAnterior > 0 ? [["Dívida anterior", resumo.saldoAnterior]] : []),
        ...(resumo.multaEmitida > 0 ? [["Multa por atraso", resumo.multaEmitida]] : []),
        ...(resumo.pago > 0 ? [["Pago depois da emissão", -resumo.pago]] : []),
    ];

    return (
        <article
            className="relative box-border grid h-[85mm] w-full grid-cols-[48mm_1fr_47mm] overflow-hidden rounded-[2.5mm] border border-[#C9D2E3] text-[7.5pt] leading-tight text-black"
            style={{ breakInside: "avoid", pageBreakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        >
            <section className="flex flex-col gap-[2mm] border-r border-[#C9D2E3] bg-[#F2F5FC] px-[3.5mm] py-[3mm]">
                <div className="flex items-center gap-[2mm]">
                    {empresa?.logotipoUrl ? (
                        <img src={empresa.logotipoUrl} crossOrigin="anonymous" alt={empresa.nome} className="h-[8mm] w-[8mm] shrink-0 object-contain" />
                    ) : (
                        <Droplets className="h-[7mm] w-[7mm] shrink-0 text-brand" aria-hidden="true" />
                    )}
                    <div className="min-w-0 leading-tight">
                        <p className="truncate text-[9pt] font-bold">{empresa?.nome ?? "Aquafuros"}</p>
                        {empresa?.localizacao && <p className="truncate text-[7pt] text-slate-600">{empresa.localizacao}</p>}
                    </div>
                </div>
                <div>
                    <p className="text-[7pt] font-extrabold tracking-[1.5px] text-brand">FACTURA</p>
                    <p className="text-[10pt] font-bold">{factura.numero_factura}</p>
                    <span className={`mt-[0.5mm] inline-block rounded border px-1 py-[0.3mm] text-[6.5pt] font-semibold ${estado.classes}`}>{estado.label}</span>
                </div>
                <dl className="flex flex-col gap-[0.8mm] text-[7.5pt]">
                    <div className="flex justify-between gap-2"><dt className="text-slate-600">Mês</dt><dd className="font-bold">{mesesFactura[factura.mes - 1]} {factura.ano}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-600">Emitida</dt><dd className="font-bold">{formatDate(factura.created_at)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-slate-600">Tarifa</dt><dd className="truncate font-bold">{factura.cliente?.tarifa?.nome ?? "—"}</dd></div>
                </dl>
                <div className="mt-auto flex flex-col gap-[0.3mm] text-[6.5pt] leading-snug text-slate-600">
                    <p className="font-bold text-black">{empresa?.nome ?? "Aquafuros"}</p>
                    {empresa?.nuit && <p>NUIT {empresa.nuit}</p>}
                    {empresa?.localizacao && <p>{empresa.localizacao}</p>}
                </div>
            </section>

            <section className="flex min-w-0 flex-col gap-[2mm] px-[4mm] py-[3mm]">
                <div>
                    <p className="text-[7pt] text-slate-600">Cliente</p>
                    <p className="truncate text-[11pt] font-bold">{factura.cliente?.nome ?? "Cliente removido"}</p>
                    <p className="truncate text-[7pt] text-slate-600">
                        {factura.cliente?.numero_cliente ?? "—"}
                        {factura.cliente?.bairro ? ` · ${factura.cliente.bairro}` : ""}
                    </p>
                </div>
                {!ligacao && (
                    <div className="grid grid-cols-3 overflow-hidden rounded-[1.8mm] border border-[#DDE2EE] text-center text-[7pt]">
                        <div className="border-r border-[#DDE2EE] p-[1.2mm]">
                            <p className="text-slate-600">Anterior</p>
                            <p className="text-[9pt] font-bold tabular-nums">{factura.tipo === "consumo_estimado" ? "—" : volumeDocumento(leitura?.leitura_anterior)}</p>
                        </div>
                        <div className="border-r border-[#DDE2EE] p-[1.2mm]">
                            <p className="text-slate-600">Actual</p>
                            <p className="text-[9pt] font-bold tabular-nums">{factura.tipo === "consumo_estimado" ? "estimado" : volumeDocumento(leitura?.leitura_actual)}</p>
                        </div>
                        <div className="p-[1.2mm]">
                            <p className="font-semibold text-brand">Consumo</p>
                            <p className="text-[9pt] font-extrabold tabular-nums text-brand">{volumeDocumento(resumo.consumo)}</p>
                        </div>
                    </div>
                )}
                <table className="w-full border-collapse text-[7.5pt] tabular-nums">
                    <tbody>
                        {linhas.slice(0, 5).map(([texto, valor]) => (
                            <tr key={texto} className="border-b border-[#E8ECF4] last:border-0">
                                <td className="py-[0.8mm] pr-2">{texto}</td>
                                <td className="whitespace-nowrap py-[0.8mm] text-right">{moedaDocumento(valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-auto border-t border-[#DDE2EE] pt-[1.5mm] text-[6.8pt] leading-snug text-slate-600">
                    <strong className="text-black">Aviso:</strong> pague até {formatDate(factura.data_vencimento)}. Depois desta data aplica-se multa por atraso e o fornecimento de água pode ser cortado.
                </p>
            </section>

            <section className="flex flex-col gap-[2mm] border-l border-[#C9D2E3] px-[3.5mm] py-[3mm]">
                <div className="rounded-[2.5mm] border-[0.6mm] border-brand px-[3mm] py-[2mm]">
                    <p className="text-[7pt] font-bold text-brand">TOTAL A PAGAR</p>
                    <p className="text-[15pt] font-extrabold leading-tight tabular-nums">{moedaDocumento(resumo.aPagar)}</p>
                    <p className="text-[7pt] text-slate-600">
                        até <strong className="text-black">{formatDate(factura.data_vencimento)}</strong>
                    </p>
                </div>
                <div className="flex flex-col gap-[0.4mm] text-[7pt] leading-snug text-slate-600">
                    <p className="font-bold text-black">Como pagar</p>
                    {meios.length ? meios.map(([nome, numero, titular]) => (
                        <p key={nome} className="font-bold text-black">
                            {nome} {telefonePagamento(numero)}
                            {titulares.length > 1 && titular && <span className="block font-normal text-slate-600">{titular}</span>}
                        </p>
                    )) : <p>Contacte a empresa.</p>}
                    {titulares.length === 1 && <p>Em nome de <strong className="text-black">{titulares[0]}</strong></p>}
                    <p>Dinheiro no escritório</p>
                    <p>Ref.: {factura.cliente?.numero_cliente ?? factura.numero_factura}</p>
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

/** Linha de corte entre tiras (tesoura + tracejado). */
export function LinhaCorte() {
    return (
        <div className="flex h-[6mm] items-center gap-[2mm] text-slate-400" aria-hidden="true">
            <Scissors className="h-[3.5mm] w-[3.5mm]" />
            <span className="flex-1 border-t border-dashed border-slate-400" />
        </div>
    );
}
