import { QRCodeSVG } from "qrcode.react";

/** Rodapé comum com autenticação e origem electrónica do documento. */
export default function RodapeDocumento({ qrUrl, compacto = false, extra }) {
    return (
        <div className={`flex items-center justify-between gap-3 border-t border-slate-300 ${compacto ? "pt-1.5" : "pt-4"}`}>
            <div className={`${compacto ? "text-[8px] leading-tight" : "text-xs leading-relaxed"} min-w-0 text-slate-500`}>
                {extra && <p className="font-semibold text-slate-700">{extra}</p>}
                <p>Software desenvolvido por RJM CONSULTORIA LDA</p>
                <p>Documento electrónico sem assinatura · Aquafuros</p>
            </div>
            {qrUrl && (
                <div className={`flex shrink-0 items-center ${compacto ? "gap-1.5" : "flex-col gap-1"}`}>
                    <QRCodeSVG value={qrUrl} size={compacto ? 28 : 64} level="M" />
                    <p className="text-[8px] text-slate-500">Verificar autenticidade</p>
                </div>
            )}
        </div>
    );
}
