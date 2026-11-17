import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { modalTabTarget } from "@/lib/modalFocus";

// Um degrau acima do tailwind habitual: os formulários eram pequenos.
const widths = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
};
const FOCUSABLE_SELECTOR = 'a[href], area[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

function elementosFocaveis(contentor) {
    return [...(contentor?.querySelectorAll(FOCUSABLE_SELECTOR) ?? [])].filter(
        (elemento) => elemento.tabIndex >= 0
            && elemento.getClientRects().length > 0
            && window.getComputedStyle(elemento).visibility !== "hidden"
            && !elemento.closest('[aria-hidden="true"]'),
    );
}

/**
 * Janela da app. `variante`:
 * - "centro" (omissão): diálogo centrado, cantos de 24px.
 * - "painel": formulário de edição que abre à direita (600px) — a página
 *   continua à vista atrás (contexto mantido).
 * `semCabecalho`: diálogo de confirmação sem barra (ilustração + pergunta).
 * `etiqueta`: marca ao lado do título (ex.: "SÓ ADMINISTRADOR").
 */
export default function Modal({ show, onClose, title, description, icon: Icon, footer, contentClassName, maxWidth = "md", variante = "centro", semCabecalho = false, etiqueta, children }) {
    const painel = variante === "painel";
    const titleId = useId();
    const descriptionId = useId();
    const panelRef = useRef(null);
    const fecharRef = useRef(onClose);
    fecharRef.current = onClose;
    const enquadrado = footer !== undefined;
    useEffect(() => {
        if (!show) return;

        const anterior = document.activeElement;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const focavelInicial = elementosFocaveis(panelRef.current)[0];
        (focavelInicial ?? panelRef.current)?.focus();
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                fecharRef.current?.();
                return;
            }
            if (event.key !== "Tab") return;
            const campos = elementosFocaveis(panelRef.current);
            const primeiro = campos[0];
            const ultimo = campos.at(-1);
            const destino = panelRef.current && modalTabTarget({
                dialog: panelRef.current,
                active: document.activeElement,
                first: primeiro,
                last: ultimo,
                backwards: event.shiftKey,
            });
            if (destino) {
                event.preventDefault();
                destino.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = overflowAnterior;
            anterior?.focus();
        };
    }, [show, enquadrado]);

    return (
        <AnimatePresence>
            {show && (
                <div className={cn("fixed inset-0 z-50 flex", painel ? "justify-end" : cn("justify-center px-4 py-4 sm:py-8", enquadrado || semCabecalho ? "items-center" : "items-start sm:items-center"))}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-ink/50 dark:bg-black/60"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={description ? descriptionId : undefined}
                        tabIndex={-1}
                        initial={painel ? { x: "100%" } : { opacity: 0, scale: 0.96, y: 10 }}
                        animate={painel ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={painel ? { x: "100%" } : { opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ duration: painel ? 0.28 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "relative w-full overflow-hidden bg-white outline-none dark:bg-[#262C38]",
                            painel
                                ? "flex h-full max-w-[600px] flex-col shadow-[-20px_0_60px_rgba(3,9,35,0.3)]"
                                : cn("rounded-[24px] shadow-[0_24px_60px_rgba(3,9,35,0.22)]", enquadrado && "flex max-h-[90dvh] flex-col", semCabecalho ? "max-w-[440px]" : widths[maxWidth]),
                        )}
                    >
                        {semCabecalho ? (
                            <h3 id={titleId} className="sr-only">{title}</h3>
                        ) : (
                            <div className={cn("flex shrink-0 items-start justify-between gap-3 border-b border-[#E8ECF4] dark:border-slate-700", painel ? "px-7 py-6" : "px-6 py-5")}>
                                <div className="flex min-w-0 items-center gap-3">
                                    {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-100 text-brand dark:bg-[#1E232D] dark:text-cyan-300"><Icon className="h-5 w-5" aria-hidden="true" /></span>}
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h3 id={titleId} className={cn("font-bold text-ink dark:text-[#F2F5FB]", painel ? "text-2xl" : "text-xl")}>{title}</h3>
                                            {etiqueta && <span className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-extrabold tracking-wide text-brand dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300">{etiqueta}</span>}
                                        </div>
                                        {description && <p id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#DDE2EE] text-slate-600 transition hover:bg-slate-50 hover:text-ink dark:border-slate-700 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                                    aria-label="Fechar"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        )}
                        <div
                            className={cn(
                                painel
                                    ? "form-grande min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-6"
                                    : enquadrado
                                      ? "min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6"
                                      : semCabecalho
                                        ? "max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 pb-[22px] pt-[26px]"
                                        : "form-grande max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain px-6 py-6 sm:max-h-[80vh] sm:px-8",
                                contentClassName,
                            )}
                        >
                            {children}
                        </div>
                        {enquadrado && <div className={cn("shrink-0 border-t border-[#E8ECF4] bg-white dark:border-slate-700 dark:bg-[#262C38]", painel ? "px-7 py-4" : "px-5 py-4 sm:px-6")}>{footer}</div>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
