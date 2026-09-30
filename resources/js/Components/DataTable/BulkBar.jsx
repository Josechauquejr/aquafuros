import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { SlidingNumber } from "@/Components/animate-ui/primitives/texts/sliding-number";

// Botão só com ícone que expande para mostrar o rótulo ao passar o rato
// (padrão do management bar do Animate UI). O rótulo também está no
// aria-label/title, para toque e leitores de ecrã.
const EXPANDIR = {
    initial: "rest",
    whileHover: "hover",
    whileTap: "tap",
    variants: {
        rest: { maxWidth: "40px" },
        hover: { maxWidth: "140px", transition: { type: "spring", stiffness: 200, damping: 35, delay: 0.1 } },
        tap: { scale: 0.95 },
    },
    transition: { type: "spring", stiffness: 250, damping: 25 },
};

const ROTULO = {
    rest: { opacity: 0, x: 4 },
    hover: { opacity: 1, x: 0, visibility: "visible" },
    tap: { opacity: 1, x: 0, visibility: "visible" },
};

/**
 * Barra fixa de acções em massa — "3 seleccionadas · [Acção] · Cancelar" —
 * com o visual do management bar do Animate UI: contador com números
 * deslizantes, acções principais com rótulo e o cancelar como ícone que
 * expande.
 */
export default function BulkBar({ total, acoes, ids, onCancelar }) {
    return (
        <AnimatePresence>
            {total > 0 && (
                <motion.div
                    key="bulk-bar"
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 40, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:pb-4"
                    role="region"
                    aria-label="Acções em massa"
                >
                    <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-background p-2 shadow-lg shadow-slate-950/15 sm:w-fit sm:flex-nowrap sm:gap-3">
                        <div className="flex h-10 items-center gap-1.5 pl-3 pr-1 text-sm tabular-nums" aria-live="polite">
                            <SlidingNumber className="font-semibold text-foreground" number={total} />
                            <span className="text-muted-foreground">
                                {total === 1 ? "seleccionada" : "seleccionadas"}
                            </span>
                        </div>

                        <div className="hidden h-6 w-px rounded-full bg-border sm:block" />

                        <div className="flex items-center gap-2">
                            {acoes.map((accao) => {
                                const Icone = accao.icone;
                                const Componente = accao.href ? motion.a : motion.button;
                                const props = accao.href
                                    ? { href: accao.href(ids), target: accao.target, rel: accao.target ? "noopener noreferrer" : undefined }
                                    : { type: "button", onClick: () => accao.onClick(ids, onCancelar) };

                                return (
                                    <Componente
                                        key={accao.rotulo}
                                        whileTap={{ scale: 0.975 }}
                                        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                                        {...props}
                                    >
                                        {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                                        {accao.rotulo}
                                    </Componente>
                                );
                            })}

                            <motion.button
                                type="button"
                                onClick={onCancelar}
                                aria-label="Cancelar selecção"
                                title="Cancelar selecção"
                                {...EXPANDIR}
                                className="flex h-10 items-center gap-2 overflow-hidden whitespace-nowrap rounded-lg bg-muted px-2.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <X size={20} className="shrink-0" aria-hidden="true" />
                                <motion.span variants={ROTULO} transition={{ type: "spring", stiffness: 200, damping: 25 }} className="invisible text-sm">
                                    Cancelar
                                </motion.span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
