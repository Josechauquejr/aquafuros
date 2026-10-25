import { Droplets } from "lucide-react";
import { formatDate } from "@/lib/format";
import { estadoDocumento, mesesFactura, moedaDocumento, resumoDocumento, telefonePagamento, volumeDocumento } from "@/lib/facturaDocumento";

export default function FacturaCompacta({ factura, empresa }) {
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const meios = [
        ["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular],
        ["E-Mola", empresa?.emola_numero, empresa?.emola_titular],
    ].filter(([, numero]) => numero);
    const detalhesFinanceiros = [
        resumo.multaEmitida > 0 && `Multa: ${moedaDocumento(resumo.multaEmitida)}`,
        resumo.acertoLeitura !== 0 && `Acerto: ${moedaDocumento(resumo.acertoLeitura)}`,
        resumo.outrosAjustamentosPosteriores !== 0 && `Ajustamentos: ${moedaDocumento(resumo.outrosAjustamentosPosteriores)}`,
    ].filter(Boolean).join(" · ");

    return <article className="box-border flex h-[89mm] w-full flex-col gap-[3mm] overflow-hidden border-b border-dashed border-slate-500 px-[1.5mm] pb-[1.4mm] pt-[2mm] text-[8pt] leading-tight text-black" style={{ breakInside: "avoid", pageBreakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <header className="flex shrink-0 items-center justify-between gap-[3mm] border-b border-slate-300 pb-[1mm]">
            <div className="flex min-w-0 items-center gap-[2mm]">
                {empresa?.logotipoUrl ? <img src={empresa.logotipoUrl} crossOrigin="anonymous" alt={empresa.nome} className="h-[8mm] w-[8mm] shrink-0 object-contain" /> : <Droplets className="h-[7mm] w-[7mm] shrink-0 text-cyan-800" aria-hidden="true" />}
                <div className="min-w-0"><p className="truncate text-[9pt] font-bold">{empresa?.nome ?? "Aquafuros"}</p><p className="truncate text-[7.5pt]">NUIT: {empresa?.nuit || "Não indicado"}{empresa?.localizacao ? ` · ${empresa.localizacao}` : ""}</p></div>
            </div>
            <div className="shrink-0 text-right"><p className="text-[7pt] font-semibold uppercase">Factura · {mesesFactura[factura.mes - 1]} {factura.ano}</p><p className="text-[9pt] font-bold text-cyan-900">{factura.numero_factura}</p><span className={`inline-block rounded border px-1 py-0.5 text-[7pt] font-semibold ${estado.classes}`}>{estado.label}</span></div>
        </header>

        <table className="w-full shrink-0 border-collapse text-[8pt]"><tbody>
            <tr className="border-b border-slate-200"><th colSpan="4" className="bg-slate-100 px-[2mm] py-[0.7mm] text-left font-bold uppercase tracking-wide">Dados do cliente</th></tr>
            <tr className="border-b border-slate-200"><th className="w-[15%] px-[2mm] py-[0.7mm] text-left font-semibold">Nome</th><td className="w-[35%] px-[2mm] py-[0.7mm] font-black">{factura.cliente?.nome ?? "Cliente removido"}</td><th className="w-[15%] px-[2mm] py-[0.7mm] text-left font-semibold">Código</th><td className="px-[2mm] py-[0.7mm] font-semibold">{factura.cliente?.numero_cliente ?? "—"}</td></tr>
            <tr className="border-b border-slate-200"><th className="px-[2mm] py-[0.7mm] text-left font-semibold">Morada</th><td className="px-[2mm] py-[0.7mm] font-semibold">{[factura.cliente?.endereco, factura.cliente?.bairro].filter(Boolean).join(" · ") || "Não indicada"}</td><th className="px-[2mm] py-[0.7mm] text-left font-semibold">Contador</th><td className="px-[2mm] py-[0.7mm] font-semibold">{factura.cliente?.numero_contador || "—"}</td></tr>
        </tbody></table>

        <table className="w-full shrink-0 table-fixed border-collapse text-[7.5pt]"><thead><tr className="bg-slate-100 text-left font-semibold"><th className="px-[2mm] py-[0.8mm]">Leitura anterior</th><th className="px-[2mm] py-[0.8mm]">Leitura actual</th><th className="px-[2mm] py-[0.8mm]">Período</th><th className="px-[2mm] py-[0.8mm]">Emissão / vencimento</th></tr></thead><tbody><tr className="border-b border-slate-200"><td className="px-[2mm] py-[0.8mm] text-[9pt] font-bold tabular-nums">{volumeDocumento(leitura?.leitura_anterior)}</td><td className="px-[2mm] py-[0.8mm] text-[9pt] font-black tabular-nums">{volumeDocumento(leitura?.leitura_actual)}</td><td className="px-[2mm] py-[0.8mm] font-semibold">{mesesFactura[factura.mes - 1]} {factura.ano}</td><td className="px-[2mm] py-[0.8mm] font-black">{formatDate(factura.created_at)} · {formatDate(factura.data_vencimento)}</td></tr></tbody></table>

        <table className="w-full shrink-0 table-fixed border-collapse text-[7.5pt]"><thead><tr className="border-b border-slate-300 text-left font-semibold uppercase tracking-wide"><th className="px-[2mm] py-[0.6mm]">Consumo do mês</th><th className="px-[2mm] py-[0.6mm]">Valor em dívida</th><th className="px-[2mm] py-[0.6mm]">Total a pagar</th></tr></thead><tbody><tr><td className="bg-cyan-50 px-[2mm] py-[1mm] text-[12pt] font-black tabular-nums text-cyan-950">{volumeDocumento(resumo.consumo)}</td><td className="px-[2mm] py-[1mm] text-[10pt] font-semibold tabular-nums">{moedaDocumento(resumo.saldoAnterior)}</td><td className="bg-cyan-800 px-[2mm] py-[1mm] text-[12pt] font-bold tabular-nums text-white">{moedaDocumento(resumo.aPagar)}</td></tr></tbody></table>
        {detalhesFinanceiros && <p className="shrink-0 text-[7pt] font-semibold">{detalhesFinanceiros}</p>}

        <div className="min-h-[2mm] flex-1 basis-0" aria-hidden="true" />
        <div className="grid shrink-0 grid-cols-[1fr_1.2fr] items-stretch gap-[2mm]">
            <section className="rounded border border-slate-200 bg-slate-50 px-[2mm] py-[1mm]"><p className="mb-[0.5mm] text-[7.5pt] font-black uppercase tracking-wide">Formas de pagamento</p>{meios.length ? <div className="grid grid-cols-2 gap-[2mm]">{meios.map(([nome, numero, titular]) => <div key={nome} className="min-w-0"><p className="text-[7pt] font-semibold">{nome}</p><p className="text-[8pt] font-bold tabular-nums">{telefonePagamento(numero)}</p>{titular && <p className="truncate text-[7pt]">{titular}</p>}</div>)}</div> : <p className="text-[7pt]">Contacte a empresa para obter os meios de pagamento.</p>}</section>
            <section className="rounded border border-amber-300 bg-amber-50 px-[2mm] py-[1mm] text-[7.5pt] font-semibold uppercase leading-snug"><p className="mb-[0.5mm] font-black uppercase tracking-wide">Aviso de multas e corte</p><p className="text-[6.5pt]">PAGUE A FACTURA NO PRAZO DE 15 DIAS. APÓS ESSE PRAZO, SERÁ APLICADA MULTA DE 30%. CASO NÃO PAGUE, O FORNECIMENTO DE ÁGUA PODERÁ SER CORTADO.</p></section>
        </div>
        <div className="min-h-[3mm] flex-1 basis-0" aria-hidden="true" />
    </article>;
}
