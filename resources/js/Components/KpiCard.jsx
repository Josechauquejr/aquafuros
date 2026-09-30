import { Link } from "@inertiajs/react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { AnimatedCard, CardBody, CardDescription, CardTitle, CardVisual } from "@/Components/ui/animated-card";
import { Visual1 } from "@/Components/ui/visual-1";
import { Visual2 } from "@/Components/ui/visual-2";
import { cn } from "@/lib/utils";

const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

// Cores do visual animado por tom (principal, secundária).
const coresVisual = {
    cyan: ["#06b6d4", "#fbbf24"],
    emerald: ["#10b981", "#38bdf8"],
    amber: ["#f59e0b", "#06b6d4"],
    rose: ["#f43f5e", "#fbbf24"],
    slate: ["#64748b", "#06b6d4"],
};

/**
 * Cartão de KPI reutilizável — ícone com tom, rótulo, valor, detalhe
 * opcional e um badge de variação (↑/↓ %) opcional, para comparações
 * período-a-período. Usado em /dashboard e /admin/kpis.
 */
export default function KpiCard({ label, value, detail, icon: Icon, tone = "cyan", variacao, delay = 0, href, visual }) {
    const temVariacao = variacao !== undefined && variacao !== null;
    const subiu = temVariacao && variacao >= 0;

    // Versão com o visual animado (Animated Card 1/2 do badtzUI): usada nos
    // painéis de indicadores; `visual` = 1 ou 2 escolhe a animação.
    if (visual) {
        const [principal, secundaria] = coresVisual[tone] ?? coresVisual.cyan;
        const Visual = visual === 2 ? Visual2 : Visual1;

        const cartao = (
            <AnimatedCard className="h-full w-full">
                <CardVisual className="relative h-[120px] w-full">
                    <div className="absolute left-1/2 top-0 h-[180px] w-[356px] -translate-x-1/2">
                        <Visual mainColor={principal} secondaryColor={secundaria} titulo={label} descricao={detail} />
                    </div>
                    {Icon && (
                        <div
                            className={cn(
                                "absolute left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-md",
                                toneClasses[tone],
                            )}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
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
