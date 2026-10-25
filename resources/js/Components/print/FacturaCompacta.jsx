import { Droplets } from "lucide-react";
import { formatDate } from "@/lib/format";
import { avisoPenalizacao, estadoDocumento, mesesFactura, moedaDocumento, resumoDocumento, telefonePagamento, volumeDocumento } from "@/lib/facturaDocumento";

export default function FacturaCompacta({ factura, empresa }) {
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const meios = [
        ["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular],
        ["E-Mola", empresa?.emola_numero, empresa?.emola_titular],
    ].filter(([, numero]) => numero);

    return <article className="box-border flex h-[89mm] w-full flex-col gap-[1.2mm] overflow-hidden border-b border-dashed border-slate-500 px-[1mm] py-[1.5mm] text-[8pt] leading-tight text-slate-900" style={{ breakInside: "avoid", pageBreakInside: "avoid", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <header className="flex shrink-0 items-center justify-between gap-[3mm] border-b border-slate-300 pb-[1mm]">
            <div className="flex min-w-0 items-center gap-[2mm]">
                {empresa?.logotipoUrl ? <img src={empresa.logotipoUrl} crossOrigin="anonymous" alt={empresa.nome} className="h-[9mm] w-[9mm] shrink-0 object-contain" /> : <Droplets className="h-[7mm] w-[7mm] shrink-0 text-[#0C7189]" aria-hidden="true" />}
                <div className="min-w-0">
                    <p className="truncate text-[9pt] font-bold text-cyan-950">{empresa?.nome ?? "Aquafuros"}</p>
                    <p className="truncate text-[7pt] text-slate-600">{[empresa?.nuit && `NUIT: ${empresa.nuit}`, empresa?.localizacao].filter(Boolean).join(" · ")}</p>
                </div>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-[7pt] font-semibold uppercase text-slate-500">Factura · {mesesFactura[factura.mes - 1]} {factura.ano}</p>
                <p className="text-[9pt] font-bold text-cyan-900">{factura.numero_factura}</p>
                <span className={`inline-block rounded border px-1 py-0.5 text-[7pt] font-semibold ${estado.classes}`}>{estado.label}</span>
            </div>
        </header>

        <section className="grid shrink-0 grid-cols-[1.4fr_1fr] gap-[3mm]">
            <div className="min-w-0">
                <p className="truncate text-[9pt] font-semibold">{factura.cliente?.nome ?? "Cliente removido"}</p>
                <p className="truncate text-slate-600">Cliente: {factura.cliente?.numero_cliente ?? "—"} · {factura.cliente?.endereco || factura.cliente?.bairro || ""}</p>
            </div>
            <div className="text-right text-slate-600"><p>Emitida: {formatDate(factura.created_at)} · Vence: {formatDate(factura.data_vencimento)}</p></div>
        </section>

        {leitura && <section className="grid shrink-0 grid-cols-3 items-center gap-[2mm] rounded border border-cyan-200 bg-cyan-50 px-[2.5mm] py-[1.5mm]">
            <div><p className="text-[7pt] text-slate-600">Leitura anterior</p><p className="text-[9pt] font-semibold tabular-nums">{volumeDocumento(leitura.leitura_anterior)}</p></div>
            <div><p className="text-[7pt] text-slate-600">Leitura actual</p><p className="text-[9pt] font-semibold tabular-nums">{volumeDocumento(leitura.leitura_actual)}</p></div>
            <div className="rounded bg-white px-[2mm] py-[1mm] ring-1 ring-cyan-200"><p className="text-[7pt] font-semibold uppercase tracking-wide text-cyan-800">Consumo</p><p className="text-[14pt] font-bold leading-none tabular-nums text-cyan-950">{volumeDocumento(resumo.consumo)}</p></div>
        </section>}

        <section className="grid shrink-0 grid-cols-2 gap-[3mm]">
            <div className="rounded border border-slate-200 px-[2mm] py-[1mm]"><p className="text-[7pt] text-slate-600">Valor consumido</p><p className="text-[10pt] font-semibold tabular-nums">{moedaDocumento(resumo.consumoEmitido)}</p></div>
            <div className="rounded border border-slate-200 px-[2mm] py-[1mm]"><p className="text-[7pt] text-slate-600">Valor em dívida</p><p className="text-[10pt] font-semibold tabular-nums">{moedaDocumento(resumo.saldoAnterior)}</p></div>
        </section>

        <div className="mt-auto grid shrink-0 grid-cols-[1fr_1.2fr] items-stretch gap-[2mm]">
            <section className="rounded border border-slate-200 bg-slate-50 px-[2mm] py-[1.5mm]">
                <p className="mb-[1mm] text-[7pt] font-bold uppercase tracking-wide text-slate-600">Formas de pagamento</p>
                {meios.length ? <div className="grid grid-cols-2 gap-[2mm]">{meios.map(([nome, numero, titular]) => <div key={nome} className="min-w-0"><p className="text-[7pt] text-slate-500">{nome}</p><p className="text-[9pt] font-bold tabular-nums">{telefonePagamento(numero)}</p>{titular && <p className="truncate text-[7pt] text-slate-500">{titular}</p>}</div>)}</div> : <p className="text-[7pt] text-slate-600">Contacte a empresa para obter os meios de pagamento.</p>}
            </section>
            <section className="rounded border border-amber-300 bg-amber-50 px-[2mm] py-[1.5mm] text-[7pt] leading-snug text-amber-950">
                <p className="mb-[0.5mm] font-bold uppercase tracking-wide">Aviso de multas e corte</p>
                <p>{avisoPenalizacao}</p>
            </section>
        </div>

        <section className="flex shrink-0 items-center justify-between gap-[2mm] rounded bg-[#0C7189] px-[2.5mm] py-[1.5mm] text-white">
            <div><p className="text-[7pt] font-semibold uppercase tracking-wide text-cyan-100">Valor total a pagar</p><p className="text-[6.5pt]">{estado.label} · {factura.numero_factura}</p></div>
            <p className="whitespace-nowrap text-[16pt] font-bold leading-none tabular-nums">{moedaDocumento(resumo.aPagar)}</p>
        </section>
        <p className="shrink-0 text-right text-[6.5pt] leading-none text-slate-500">Dispensa assinatura</p>
    </article>;
}
