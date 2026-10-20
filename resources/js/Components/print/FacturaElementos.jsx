import { QRCodeSVG } from "qrcode.react";
import { numeroDocumento, telefonePagamento } from "@/lib/facturaDocumento";

export function MontanteFactura({ valor, className = "" }) {
    return <span className={`whitespace-nowrap tabular-nums ${className}`}>{numeroDocumento(valor)} <span className="text-[0.5em] font-semibold">MT</span></span>;
}

export function MeiosPagamentoFactura({ empresa, compacto = false }) {
    const meios = [
        ["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular],
        ["E-Mola", empresa?.emola_numero, empresa?.emola_titular],
    ].filter(([, numero]) => numero);
    return (
        <div>
            {!compacto && <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-cyan-800">Meios de pagamento</h2>}
            {meios.length ? <div className={`grid grid-cols-2 ${compacto ? "gap-3" : "gap-3"}`}>
                {meios.map(([nome, numero, titular]) => (
                    <div key={nome} className={compacto ? "text-[10px] leading-tight" : "rounded-md border border-slate-200 bg-slate-50 px-4 py-2"}>
                        <p className={compacto ? "text-slate-600" : "text-[12px] font-medium text-slate-600"}>{nome}</p>
                        <p className={`${compacto ? "text-[13px]" : "text-lg"} whitespace-nowrap font-semibold tracking-wide text-slate-900`}>{telefonePagamento(numero)}</p>
                        {titular && <p className={`${compacto ? "text-[10px]" : "text-[11px]"} text-slate-600`}>{titular}</p>}
                    </div>
                ))}
            </div> : <p className="text-[12px] text-slate-600">Contacte a empresa para obter os meios de pagamento.</p>}
        </div>
    );
}

export function RodapeFactura({ empresa, qrUrl, compacto = false }) {
    return (
        <footer className={`flex items-center justify-between gap-4 border-t border-slate-200 ${compacto ? "pt-2" : "pt-3"}`}>
            <div className={`${compacto ? "text-[10px]" : "text-[11px]"} leading-relaxed text-slate-600`}>
                <p className="font-semibold text-slate-700">{empresa?.nome}</p>
                <p>Documento emitido electronicamente. Dispensa assinatura.</p>
                <p>Software desenvolvido por RJM CONSULTORIA LDA.</p>
            </div>
            {qrUrl && <div className="flex shrink-0 items-center gap-2">
                <QRCodeSVG value={qrUrl} size={compacto ? 56 : 72} level="M" marginSize={2} />
                <p className="max-w-[65px] text-[10px] leading-snug text-slate-600">Verificar autenticidade</p>
            </div>}
        </footer>
    );
}
