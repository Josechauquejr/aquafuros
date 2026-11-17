import { Droplets } from "lucide-react";

/** Cabeçalho partilhado pelos documentos A4, em formato completo e compacto. */
export default function CabecalhoDocumento({
    empresa,
    titulo,
    numero,
    estado,
    estadoClasses = "border-slate-400 text-slate-600",
    compacto = false,
    subtitulo,
    textoMaior = false,
}) {
    return (
        <div className={`flex items-start justify-between gap-3 ${compacto ? "border-b border-slate-300 pb-2" : "border-b-2 border-brand pb-4"}`}>
            <div className={`flex min-w-0 items-center ${compacto ? "gap-2" : "gap-3"}`}>
                <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md text-brand ${compacto ? "h-10 w-10" : "h-14 w-14"}`}>
                    {empresa?.logotipoUrl ? (
                        <img
                            src={empresa.logotipoUrl}
                            alt={empresa.nome}
                            crossOrigin="anonymous"
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <Droplets className={compacto ? "h-5 w-5" : "h-7 w-7"} aria-hidden="true" />
                    )}
                </div>
                <div className="min-w-0 leading-tight">
                    <p className={`${compacto ? "text-[12px]" : textoMaior ? "text-lg" : "text-base"} break-words font-semibold text-ink`}>
                        {empresa?.nome ?? "Aquafuros"}
                    </p>
                    <p className={`${compacto ? "text-[8px]" : textoMaior ? "text-[12px]" : "text-[10px]"} mt-1 text-slate-600`}>
                        {[empresa?.nuit && `NUIT: ${empresa.nuit}`, empresa?.localizacao].filter(Boolean).join(" · ") || subtitulo || "Gestão de Furos de Água"}
                    </p>
                </div>
            </div>
            <div className="shrink-0 pl-3 text-right leading-tight">
                <p className={`${compacto ? "text-[9px]" : "text-[13px]"} font-extrabold uppercase tracking-[2px] text-brand`}>{titulo}</p>
                <p className={`${compacto ? "text-[12px]" : "text-xl"} mt-0.5 font-bold text-ink`}>{numero}</p>
                {estado && (
                    <span className={`mt-1 inline-block rounded border ${compacto ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-xs"} font-bold ${estadoClasses}`}>
                        {estado}
                    </span>
                )}
            </div>
        </div>
    );
}
