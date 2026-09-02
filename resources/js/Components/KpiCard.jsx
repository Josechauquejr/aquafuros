import { TrendingDown, TrendingUp } from "lucide-react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { cn } from "@/lib/utils";

const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

/**
 * Cartão de KPI reutilizável — ícone com tom, rótulo, valor, detalhe
 * opcional e um badge de variação (↑/↓ %) opcional, para comparações
 * período-a-período. Usado em /dashboard e /admin/kpis.
 */
export default function KpiCard({ label, value, detail, icon: Icon, tone = "cyan", variacao, delay = 0 }) {
    const temVariacao = variacao !== undefined && variacao !== null;
    const subiu = temVariacao && variacao >= 0;

    return (
        <AnimatedPanel delay={delay}>
            <div className="flex items-start justify-between p-5">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <p className="text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
                        {temVariacao && (
                            <span
                                className={cn(
                                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                                    subiu
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                                )}
                            >
                                {subiu ? (
                                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                                )}
                                {Math.abs(variacao).toFixed(1)}%
                            </span>
                        )}
                    </div>
                    {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
                </div>
                {Icon && (
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                )}
            </div>
        </AnimatedPanel>
    );
}
