import { Droplets } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { MontanteFactura } from "@/Components/print/FacturaElementos";
import { formatDate } from "@/lib/format";
import { avisoPenalizacao, estadoDocumento, mesesFactura, moedaDocumento, periodoOrigem, resumoDocumento, telefonePagamento, volumeDocumento } from "@/lib/facturaDocumento";

function Linha({ descricao, valor, forte = false }) {
    return <tr className={`border-b border-slate-200 last:border-0 ${forte ? "font-semibold text-slate-950" : "text-slate-700"}`}>
        <td className="py-[1mm] pr-3 align-top">{descricao}</td>
        <td className="whitespace-nowrap py-[1mm] text-right align-top tabular-nums">{moedaDocumento(valor)}</td>
    </tr>;
}

export default function FacturaCompacta({ factura, qrUrl, empresa }) {
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const ligacao = factura.tipo === "ligacao";
    const origens = resumo.origens.length > 3 ? resumo.origens.slice(0, 2) : resumo.origens;
    const restantes = resumo.origens.slice(origens.length);
    const meios = [["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular], ["E-Mola", empresa?.emola_numero, empresa?.emola_titular]].filter(([, numero]) => numero);

    return <article className="flex min-h-[89mm] flex-col gap-[1.5mm] py-[2mm] text-[8.5pt] leading-[1.25] text-slate-900" style={{breakInside: "avoid", pageBreakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact"}}>
        <header className="flex items-start justify-between gap-[4mm] border-b border-slate-300 pb-[1.5mm]">
            <div className="flex min-w-0 flex-1 items-center gap-[2mm]">
                {empresa?.logotipoUrl ? <img src={empresa.logotipoUrl} crossOrigin="anonymous" alt={empresa.nome} className="h-[10mm] w-[10mm] shrink-0 object-contain" /> : <Droplets className="h-[8mm] w-[8mm] shrink-0 text-[#0C7189]" aria-hidden="true" />}
                <div className="min-w-0 break-words">
                    <p className="text-[10pt] font-bold leading-tight text-cyan-950">{empresa?.nome ?? "Aquafuros"}</p>
                    <p className="mt-[0.5mm] font-semibold">NUIT: {empresa?.nuit || "—"}</p>
                    {empresa?.localizacao && <p className="text-[8pt] text-slate-600">{empresa.localizacao}</p>}
                </div>
            </div>
            <div className="min-w-0 max-w-[43%] break-words text-right">
                <p className="text-[8pt] uppercase text-slate-600">{ligacao ? "Factura de ligação" : "Factura"}</p>
                <p className="text-[10pt] font-bold text-cyan-900">{factura.numero_factura}</p>
                <span className={`mt-[0.5mm] inline-block rounded border px-1.5 py-0.5 text-[8pt] font-semibold ${estado.classes}`}>{estado.label}</span>
            </div>
        </header>
        <section className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[4mm]">
            <div className="min-w-0 break-words">
                <p className="text-[10pt] font-semibold">{factura.cliente?.nome ?? "Cliente removido"}</p>
                <p className="text-slate-600">Cliente: {factura.cliente?.numero_cliente ?? "—"} · {factura.cliente?.tarifa?.nome ?? "—"}</p>
                <p className="text-slate-600">{[factura.cliente?.endereco, factura.cliente?.bairro].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            <div className="min-w-0 break-words text-right">
                <p className="font-semibold">{mesesFactura[factura.mes - 1]} de {factura.ano}</p>
                <p>Emissão: {formatDate(factura.created_at)}</p>
                <p className="font-semibold">Vencimento: {formatDate(factura.data_vencimento)}</p>
            </div>
        </section>
        {!ligacao && <section className="grid grid-cols-3 gap-2 rounded border border-slate-200 bg-slate-50 px-[2mm] py-[1.5mm]">
            {[["Leitura anterior", leitura?.leitura_anterior], ["Leitura actual", leitura?.leitura_actual], ["Consumo apurado", resumo.consumo]].map(([titulo, valor]) => <div key={titulo}><p className="text-[8pt] text-slate-600">{titulo}</p><p className="mt-0.5 text-[10pt] font-semibold tabular-nums">{volumeDocumento(valor)}</p></div>)}
        </section>}
        <section>
            <table className="w-full border-collapse text-[9.5pt] leading-tight" aria-label="Discriminação financeira">
                <tbody>
                    <Linha descricao={ligacao ? "Taxa de ligação" : "Valor do consumo do período"} valor={resumo.consumoEmitido} />
                    {resumo.anterior > 0 && <Linha descricao="Saldo de facturas anteriores na emissão" valor={resumo.anterior} />}
                    {resumo.penalizacoesAnteriores > 0 && <Linha descricao="Penalizações anteriores na emissão" valor={resumo.penalizacoesAnteriores} />}
                    {resumo.multaEmitida > 0 && <Linha descricao="Penalização do período na emissão" valor={resumo.multaEmitida} />}
                    <Linha descricao="Total na emissão" valor={resumo.totalEmitido} forte />
                    {resumo.multasAnterioresPosteriores !== 0 && <Linha descricao="Penalizações anteriores apuradas após emissão" valor={resumo.multasAnterioresPosteriores} />}
                    {resumo.multaPeriodoPosterior !== 0 && <Linha descricao="Penalização do período apurada após emissão" valor={resumo.multaPeriodoPosterior} />}
                    {resumo.outrosAjustamentosPosteriores !== 0 && <Linha descricao="Outros encargos ou ajustamentos posteriores" valor={resumo.outrosAjustamentosPosteriores} />}
                    {resumo.pago > 0 && <Linha descricao="Pagamentos após a emissão" valor={-resumo.pago} />}
                    {(resumo.pago > 0 || resumo.ajustesPosteriores !== 0) && <Linha descricao="Total a pagar" valor={resumo.aPagar} forte />}
                </tbody>
            </table>
            {resumo.tarifaMinima && !ligacao && <p className="mt-[1mm] text-[8pt] text-slate-600">Tarifa mínima de {moedaDocumento(factura.cliente.tarifa.taxa_minima)} até {volumeDocumento(factura.cliente.tarifa.consumo_minimo_m3)}.</p>}
        </section>
        {origens.length > 0 && <section className="rounded border border-slate-200 px-[2mm] py-[1mm] text-[8pt]">
            <h3 className="font-semibold">Origem do saldo anterior ainda em aberto</h3>
            {origens.map(origem => <p key={origem.id} className="mt-[0.5mm] flex items-start justify-between gap-2"><span className="min-w-0 break-words">{origem.numero_factura} · {periodoOrigem(origem)}</span><span className="whitespace-nowrap font-medium tabular-nums">{moedaDocumento(origem.saldo)}</span></p>)}
            {restantes.length > 0 && <><p className="mt-[0.5mm]">Mais {restantes.length} factura(s): {moedaDocumento(restantes.reduce((soma, origem) => soma + Number(origem.saldo), 0))}.</p><p className="mt-[0.5mm] font-medium">Discriminação completa no anexo de {factura.numero_factura}.</p></>}
        </section>}
        {!factura.cobranca && !factura.divida_anterior_incluida && Number(factura.divida_anterior) > 0 && <p>Saldo anterior informativo: {moedaDocumento(factura.divida_anterior)}. Cobrado nas facturas de origem; não incluído neste total.</p>}
        {factura.estado === "transferida" && <p className="font-semibold">Saldo transferido para uma factura posterior. Não pagar separadamente.</p>}
        <section className="flex flex-wrap items-center justify-between gap-2 rounded bg-[#0C7189] px-[3mm] py-[2mm] text-white">
            <h2 className="text-[9pt] font-semibold uppercase">Total a pagar · saldo actual</h2>
            <MontanteFactura valor={resumo.aPagar} className="text-[18pt] font-bold" />
        </section>
        {resumo.multasPrevistas > 0 && <p className="text-[8pt] text-amber-900">Penalizações por atraso previstas: {moedaDocumento(resumo.multasPrevistas)}. Ainda não incluídas no saldo acima; serão apuradas no pagamento.</p>}
        <footer className="flex items-start justify-between gap-[3mm] border-t border-slate-200 pt-[1mm]">
            <div className="min-w-0 flex-1 space-y-[1mm]">
                {meios.length ? <div className="grid grid-cols-2 gap-[3mm]">{meios.map(([nome, numero, titular]) => <div key={nome} className="min-w-0 break-words"><p className="text-[8pt] text-slate-600">{nome}</p><p className="text-[10pt] font-semibold">{telefonePagamento(numero)}</p>{titular && <p className="text-[8pt] text-slate-600">{titular}</p>}</div>)}</div> : <p>Contacte a empresa para obter os meios de pagamento.</p>}
                <p className="text-[8pt] text-slate-600">{avisoPenalizacao}</p>
                <p className="text-[8pt] text-slate-600">Emissão electrónica · Dispensa assinatura · Software: RJM CONSULTORIA LDA.</p>
            </div>
            {qrUrl && <a href={qrUrl} className="shrink-0 text-center text-slate-600"><QRCodeSVG value={qrUrl} size={80} level="M" marginSize={4} /><span className="block text-[8pt]">Verificar factura</span></a>}
        </footer>
        <div role="separator" aria-label="Linha de corte entre facturas" className="mt-auto flex items-center gap-2 pt-[1mm] text-[8pt] text-slate-600"><span className="flex-1 border-t border-dashed border-slate-500" /><span>Corte aqui</span><span className="flex-1 border-t border-dashed border-slate-500" /></div>
    </article>;
}
