import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
};

export default function Modal({ show, onClose, title, maxWidth = "md", children }) {
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [show, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
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
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                            "relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900",
                            widths[maxWidth],
                        )}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                            <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Fechar"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
