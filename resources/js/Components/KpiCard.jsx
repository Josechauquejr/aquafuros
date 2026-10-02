import { Link } from "@inertiajs/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { AnimatedCard, CardBody, CardDescription, CardTitle, CardVisual } from "@/Components/ui/animated-card";
import GraficoKpi from "@/Components/charts/GraficoKpi";
import { cn } from "@/lib/utils";

const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

// Cor do mini-gráfico por tom.
const coresGrafico = {
    cyan: "#06b6d4",
    emerald: "#10b981",
    amber: "#f59e0b",
    rose: "#f43f5e",
    slate: "#71717a",
};

/**
 * Cartão de KPI reutilizável — ícone com tom, rótulo, valor, detalhe
 * opcional e um badge de variação (↑/↓ %) opcional, para comparações
 * período-a-período. Usado em /dashboard e /admin/kpis.
 */
export default function KpiCard({ label, value, detail, icon: Icon, tone = "cyan", variacao, delay = 0, href, grafico }) {
    const temVariacao = variacao !== undefined && variacao !== null;
    const subiu = temVariacao && variacao >= 0;

    // Versão com mini-gráfico (cartão animado do badtzUI): o gráfico mostra
    // sempre dados reais do indicador — ver GraficoKpi.
    if (grafico) {

        const cartao = (
            <AnimatedCard className="h-full w-full">
                <CardVisual className="relative flex h-[120px] w-full items-center justify-center bg-gradient-to-b from-transparent to-black/[0.03] dark:to-white/[0.03]">
                    <div className="w-full px-3">
                        <GraficoKpi grafico={grafico} cor={coresGrafico[tone] ?? coresGrafico.cyan} altura={120} rotulo={label} formatar={grafico.formatar} />
                    </div>
                    {Icon && (
                        <div
                            className={cn(
                                "absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-md",
                                toneClasses[tone],
                            )}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                    )}
                </CardVisual>
                <CardBody>
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">{value}</CardTitle>
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
                    <CardDescription className="font-medium">{label}</CardDescription>
                    {detail && <CardDescription className="text-xs">{detail}</CardDescription>}
                </CardBody>
            </AnimatedCard>
        );

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(delay, 0.08), ease: [0.22, 1, 0.36, 1] }}
            >
                {href ? (
                    <Link href={href} className="block h-full">
                        {cartao}
                    </Link>
                ) : (
                    cartao
                )}
            </motion.div>
        );
    }

    const conteudo = (
        <div className="flex items-start justify-between gap-2 p-4 sm:p-5">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:mt-3">
                    <p className="text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">{value}</p>
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
                <div className={cn("hidden h-11 w-11 shrink-0 items-center justify-center rounded-md sm:flex", toneClasses[tone])}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
            )}
        </div>
    );

    return (
        <AnimatedPanel
            delay={delay}
            className={href ? "transition hover:border-cyan-300 dark:hover:border-cyan-700" : ""}
        >
            {href ? (
                <Link href={href} className="block">
                    {conteudo}
                </Link>
            ) : (
                conteudo
            )}
        </AnimatedPanel>
    );
}
