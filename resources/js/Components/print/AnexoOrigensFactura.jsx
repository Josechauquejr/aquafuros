import { QRCodeSVG } from "qrcode.react";
import CabecalhoDocumento from "@/Components/print/CabecalhoDocumento";
import { moedaDocumento, periodoOrigem, resumoDocumento } from "@/lib/facturaDocumento";

export default function AnexoOrigensFactura({ factura, empresa, origens, numero, totalPaginas, qrUrl }) {
    const resumo = resumoDocumento(factura);
    return <article className="text-[10pt] leading-snug text-slate-900" style={{printColorAdjust: "exact", WebkitPrintColorAdjust: "exact"}}>
        <CabecalhoDocumento textoMaior empresa={empresa} titulo="Anexo de dívida" numero={factura.numero_factura} />
        <h1 className="mt-5 text-[14pt] font-semibold">Discriminação das facturas anteriores em aberto</h1>
        <p className="mt-2 break-words font-semibold">{factura.cliente?.nome ?? "Cliente removido"} · {factura.cliente?.numero_cliente}</p>
        <p className="mt-1 text-slate-600">Anexo de {factura.numero_factura} · Página {numero} de {totalPaginas}.</p>
        <p className="mt-3 text-slate-600">Saldos pendentes consultados nos registos das facturas e dos pagamentos. Estes valores já integram o saldo anterior do documento; não são somados novamente.</p>
        <table className="mt-4 w-full border-collapse text-[9.5pt]">
            <thead><tr className="border-b-2 border-slate-300 text-left"><th className="py-2 pr-2">Factura / período</th><th className="py-2 text-right">Principal</th><th className="py-2 text-right">Penalização</th><th className="py-2 text-right">Saldo pendente</th></tr></thead>
            <tbody>{origens.map(origem => <tr key={origem.id} className="border-b border-slate-200" style={{breakInside: "avoid"}}><td className="py-3 pr-3"><p className="break-words font-semibold">{origem.numero_factura}</p><p className="text-slate-600">{periodoOrigem(origem)}</p></td><td className="whitespace-nowrap py-3 text-right tabular-nums">{moedaDocumento(origem.principal)}</td><td className="whitespace-nowrap py-3 text-right tabular-nums">{moedaDocumento(origem.multa)}</td><td className="whitespace-nowrap py-3 text-right font-semibold tabular-nums">{moedaDocumento(origem.saldo)}</td></tr>)}</tbody>
        </table>
        <div className="mt-4 flex justify-between gap-4 border-t border-slate-300 pt-3 font-semibold"><p>Total anterior em aberto (todas as origens)</p><p className="whitespace-nowrap">{moedaDocumento(resumo.origens.reduce((soma, origem) => soma + Number(origem.saldo), 0))}</p></div>
        <footer className="mt-6 flex items-end justify-between gap-4 border-t border-slate-200 pt-4 text-[9pt] text-slate-600"><div><p>Este anexo acompanha a factura {factura.numero_factura}.</p><p>Software desenvolvido por RJM CONSULTORIA LDA.</p></div>{qrUrl && <a href={qrUrl} className="shrink-0 text-center"><QRCodeSVG value={qrUrl} size={88} level="M" marginSize={4} /><span className="block">Verificar factura</span></a>}</footer>
    </article>;
}
