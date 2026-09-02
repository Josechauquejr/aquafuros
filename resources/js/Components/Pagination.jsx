import { router } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Paginador reutilizável para listas paginadas no servidor (Laravel
 * paginate()). Recebe o objecto paginado tal como o Inertia o serializa:
 * { data, current_page, last_page, links, total, from, to }.
 */
export default function Pagination({ paginador, preserveScroll = true }) {
    if (!paginador || paginador.last_page <= 1) return null;

    const irPara = (url) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll, replace: true });
    };

    return (
        <nav
            className="flex flex-col items-center justify-between gap-3 px-2 py-3 sm:flex-row"
            aria-label="Paginação"
        >
            <p className="text-xs text-slate-500 dark:text-slate-400">
                A mostrar <span className="font-medium text-slate-700 dark:text-slate-300">{paginador.from ?? 0}</span>–
                <span className="font-medium text-slate-700 dark:text-slate-300">{paginador.to ?? 0}</span> de{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">{paginador.total}</span>
            </p>
            <div className="flex items-center gap-1">
                {paginador.links.map((link, index) => {
                    const isPrev = index === 0;
                    const isNext = index === paginador.links.length - 1;

                    return (
                        <motion.button
                            key={`${link.label}-${index}`}
                            type="button"
                            disabled={!link.url}
                            onClick={() => irPara(link.url)}
                            whileHover={link.url ? { scale: 1.08 } : {}}
                            whileTap={link.url ? { scale: 0.94 } : {}}
                            className={cn(
                                "flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs font-medium transition",
                                link.active
                                    ? "bg-cyan-700 text-white"
                                    : link.url
                                        ? "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                        : "cursor-not-allowed text-slate-300 dark:text-slate-700",
                            )}
                            aria-label={isPrev ? "Página anterior" : isNext ? "Próxima página" : `Página ${link.label}`}
                            aria-current={link.active ? "page" : undefined}
                        >
                            {isPrev ? (
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            ) : isNext ? (
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                link.label
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}
