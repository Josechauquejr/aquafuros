import { Link } from "@inertiajs/react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { cn } from "@/lib/utils";

/**
 * "A precisar de atenção": um cartão que se abre e fecha. Fechado, mostra só
 * quantas coisas há por tratar (e se alguma é urgente); aberto, lista-as com
 * a ligação para as resolver. Se não houver nada, diz que está tudo em ordem.
 */
export default function PainelAlertas({ alertas = [] }) {
    const [aberto, setAberto] = useState(false);
    const urgentes = alertas.filter((a) => a.nivel === "alto").length;
    const vazio = alertas.length === 0;

    return (
        <AnimatedPanel className="overflow-hidden">
            <button
                type="button"
                onClick={() => !vazio && setAberto((valor) => !valor)}
                aria-expanded={vazio ? undefined : aberto}
                aria-controls="lista-alertas"
                disabled={vazio}
                className={cn(
                    "flex w-full items-center justify-between gap-4 px-6 py-4 text-left",
                    !vazio && "transition hover:bg-slate-50 dark:hover:bg-slate-800/50",
                )}
            >
                <span className="flex min-w-0 items-center gap-3">
                    {vazio ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                        <AlertTriangle className={cn("h-5 w-5 shrink-0", urgentes > 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")} aria-hidden="true" />
                    )}
                    <span className="min-w-0">
                        <span className="block font-semibold text-slate-950 dark:text-white">A precisar de atenção</span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">
                            {vazio
                                ? "Nada por tratar — está tudo em ordem."
                                : `${alertas.length} ${alertas.length === 1 ? "assunto" : "assuntos"}${urgentes > 0 ? ` · ${urgentes} urgente${urgentes === 1 ? "" : "s"}` : ""}`}
                        </span>
                    </span>
                </span>

                {!vazio && (
                    <span className="flex shrink-0 items-center gap-3">
                        <span
                            className={cn(
                                "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold",
                                urgentes > 0
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                            )}
                        >
                            {alertas.length}
                        </span>
                        <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", aberto && "rotate-180")} aria-hidden="true" />
                    </span>
                )}
            </button>

            <AnimatePresence initial={false}>
                {aberto && !vazio && (
                    <motion.div
                        id="lista-alertas"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
                    >
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {alertas.map((alerta) => {
                                const conteudo = (
                                    <>
                                        <span
                                            className={cn(
                                                "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-sm font-bold",
                                                alerta.nivel === "alto"
                                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                                            )}
                                        >
                                            {alerta.quantidade}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-medium text-slate-900 dark:text-white">{alerta.titulo}</span>
                                            <span className="block text-sm text-slate-500 dark:text-slate-400">{alerta.detalhe}</span>
                                        </span>
                                        {alerta.href && <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
                                    </>
                                );
                                const classes = "flex items-center gap-4 px-6 py-3.5";

                                return (
                                    <li key={alerta.chave}>
                                        {alerta.href ? (
                                            <Link href={alerta.href} className={cn(classes, "transition hover:bg-slate-50 dark:hover:bg-slate-800/50")}>
                                                {conteudo}
                                            </Link>
                                        ) : (
                                            <div className={classes}>{conteudo}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </AnimatedPanel>
    );
}
