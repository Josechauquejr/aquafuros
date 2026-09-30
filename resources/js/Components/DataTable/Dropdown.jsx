import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function useEcraGrande() {
    const consulta = "(min-width: 768px)";
    const [grande, setGrande] = useState(() =>
        typeof window === "undefined" ? true : window.matchMedia(consulta).matches,
    );

    useEffect(() => {
        const mql = window.matchMedia(consulta);
        const actualizar = () => setGrande(mql.matches);
        mql.addEventListener("change", actualizar);
        return () => mql.removeEventListener("change", actualizar);
    }, []);

    return grande;
}

const botaoClasses =
    "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800";

/**
 * Botão + painel. No desktop o painel é um popover ancorado ao botão; com
 * `sheetMobile`, no móvel abre como bottom sheet (num portal, para não
 * depender de ancestrais com transform).
 */
export default function Dropdown({
    rotulo,
    icone: Icone,
    contador,
    titulo,
    sheetMobile = false,
    alinhar = "left",
    larguraPainel = "w-72",
    className = "",
    children,
}) {
    const [aberto, setAberto] = useState(false);
    const contentor = useRef(null);
    const ecraGrande = useEcraGrande();
    const comoSheet = sheetMobile && !ecraGrande;
    const fechar = () => setAberto(false);

    useEffect(() => {
        if (!aberto) return;

        const fecharFora = (evento) => {
            if (!comoSheet && contentor.current && !contentor.current.contains(evento.target)) fechar();
        };
        const fecharEsc = (evento) => {
            if (evento.key === "Escape") fechar();
        };

        document.addEventListener("mousedown", fecharFora);
        document.addEventListener("keydown", fecharEsc);
        return () => {
            document.removeEventListener("mousedown", fecharFora);
            document.removeEventListener("keydown", fecharEsc);
        };
    }, [aberto, comoSheet]);

    const conteudo = typeof children === "function" ? children(fechar) : children;

    return (
        <div ref={contentor} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                aria-haspopup="dialog"
                aria-expanded={aberto}
                className={cn(botaoClasses, "w-full md:w-auto")}
            >
                {Icone && <Icone className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />}
                <span className="truncate">{rotulo}</span>
                {contador > 0 && (
                    <span className="rounded-full bg-cyan-700 px-1.5 text-xs font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                        {contador}
                    </span>
                )}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>

            {aberto && !comoSheet && (
                <div
                    role="dialog"
                    aria-label={titulo}
                    className={cn(
                        "absolute top-full z-30 mt-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900",
                        alinhar === "right" ? "right-0" : "left-0",
                        larguraPainel,
                    )}
                >
                    {conteudo}
                </div>
            )}

            {aberto &&
                comoSheet &&
                createPortal(
                    <div className="fixed inset-0 z-50">
                        <div className="absolute inset-0 bg-slate-950/50" onClick={fechar} aria-hidden="true" />
                        <div
                            role="dialog"
                            aria-label={titulo}
                            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                        >
                            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
                            <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{titulo}</p>
                            {conteudo}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
