import { Link } from "@inertiajs/react";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { cn } from "@/lib/utils";

/**
 * "A precisar de atenção": o que o sistema detectou que merece acção hoje.
 * Só mostra o que tem alguma coisa por tratar; se não houver nada, diz que
 * está tudo em ordem.
 */
export default function PainelAlertas({ alertas = [] }) {
    return (
        <AnimatedPanel className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    A precisar de atenção
                </h3>
            </div>
            {alertas.length === 0 ? (
                <p className="flex items-center gap-2 px-6 py-5 text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Nada por tratar — está tudo em ordem.
                </p>
            ) : (
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
            )}
        </AnimatedPanel>
    );
}
