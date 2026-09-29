import { AnimatePresence, motion } from "motion/react";
import { MoreVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Menu "⋯" para as acções secundárias de uma linha de tabela/cartão — o
 * padrão usado em Facturas/Pagamentos/Clientes para não empilhar 4-5 ícones
 * sem legenda lado a lado (ilegível e sem alvo de toque decente em mobile).
 * Mantém visível só a acção mais usada; o resto fica aqui, com texto.
 */
export default function ActionsMenu({ children, label = "Mais acções", align = "right" }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const fecharFora = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const fecharEsc = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", fecharFora);
        document.addEventListener("keydown", fecharEsc);
        return () => {
            document.removeEventListener("mousedown", fecharFora);
            document.removeEventListener("keydown", fecharEsc);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen((valor) => !valor)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={label}
                aria-haspopup="true"
                aria-expanded={open}
            >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -2 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => setOpen(false)}
                        className={cn(
                            "absolute z-20 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-left shadow-lg shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900",
                            align === "right" ? "right-0" : "left-0",
                        )}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function ActionsMenuItem({ as: Component = "button", tone = "default", disabled = false, className = "", children, ...props }) {
    const toneClasses = {
        default: "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
        danger: "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40",
    };

    return (
        <Component
            type={Component === "button" ? "button" : undefined}
            disabled={disabled}
            className={cn(
                "flex w-full items-center gap-2.5 px-3 py-3 text-left text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40",
                toneClasses[tone],
                className,
            )}
            {...props}
        >
            {children}
        </Component>
    );
}

export function ActionsMenuSeparator() {
    return <div className="my-1 border-t border-slate-100 dark:border-slate-800" />;
}
