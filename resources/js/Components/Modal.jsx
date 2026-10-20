import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

// Um degrau acima do tailwind habitual: os formulários eram pequenos.
const widths = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
};

export default function Modal({ show, onClose, title, description, icon: Icon, footer, contentClassName, maxWidth = "md", children }) {
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
        if (enquadrado) {
            document.body.style.overflow = "hidden";
            panelRef.current?.focus();
        }
        const handleKeyDown = (event) => {
            if (event.key === "Escape") fecharRef.current?.();
            if (!enquadrado || event.key !== "Tab") return;
            const campos = [...(panelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])]
                .filter(elemento => elemento.getClientRects().length > 0);
            const primeiro = campos[0];
            const ultimo = campos.at(-1);
            if (!primeiro) {
                event.preventDefault();
            } else if (event.shiftKey && (document.activeElement === primeiro || document.activeElement === panelRef.current)) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && (document.activeElement === ultimo || document.activeElement === panelRef.current)) {
                event.preventDefault();
                primeiro.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (enquadrado) {
                document.body.style.overflow = overflowAnterior;
                anterior?.focus();
            }
        };
    }, [show, enquadrado]);

    return (
        <AnimatePresence>
            {show && (
                <div className={cn("fixed inset-0 z-50 flex justify-center px-4 py-4 sm:py-8", enquadrado ? "items-center" : "items-start sm:items-center")}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 bg-slate-950/50"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={description ? descriptionId : undefined}
                        tabIndex={enquadrado ? -1 : undefined}
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900",
                            enquadrado && "flex max-h-[90dvh] flex-col rounded-xl outline-none",
                            widths[maxWidth],
                        )}
                    >
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <div className="flex min-w-0 items-center gap-3">
                                {Icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0C7189] text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>}
                                <div>
                                    <h3 id={titleId} className={cn("font-semibold text-slate-950 dark:text-white", enquadrado && "text-lg")}>{title}</h3>
                                    {description && <p id={descriptionId} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-[13px]">{description}</p>}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Fechar"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className={cn(enquadrado ? "min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6" : "form-grande max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain px-5 py-6 sm:max-h-[80vh] sm:px-8", contentClassName)}>{children}</div>
                        {enquadrado && <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">{footer}</div>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
