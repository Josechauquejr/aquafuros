import { Calendar } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const opcoes = [
    { valor: "hoje", label: "Hoje" },
    { valor: "semana", label: "Esta semana" },
    { valor: "mes", label: "Este mês" },
    { valor: "todos", label: "Todos" },
];

/**
 * Filtro de período partilhado (Pagamentos, Dashboard, KPIs) — pills
 * animadas com um indicador deslizante, mais um intervalo personalizado
 * opcional.
 */
export default function PeriodoFiltro({
    periodo,
    onChange,
    dataInicio,
    dataFim,
    onChangeIntervalo,
    permitirPersonalizado = true,
    layoutId = "periodo-filtro-pill",
}) {
    const todasOpcoes = permitirPersonalizado
        ? [...opcoes, { valor: "personalizado", label: "Personalizado", icone: Calendar }]
        : opcoes;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {todasOpcoes.map((opcao) => {
                    const Icone = opcao.icone;
                    const activo = periodo === opcao.valor;

                    return (
                        <button
                            key={opcao.valor}
                            type="button"
                            onClick={() => onChange(opcao.valor)}
                            className={cn(
                                "relative rounded px-3 py-1.5 text-xs font-semibold transition",
                                activo
                                    ? "text-white"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                            )}
                        >
                            {activo && (
                                <motion.span
                                    layoutId={layoutId}
                                    className="absolute inset-0 rounded bg-cyan-700"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            )}
                            <span className="relative inline-flex items-center gap-1">
                                {Icone && <Icone className="h-3.5 w-3.5" aria-hidden="true" />}
                                {opcao.label}
                            </span>
                        </button>
                    );
                })}
            </div>
            {permitirPersonalizado && periodo === "personalizado" && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={dataInicio ?? ""}
                        onChange={(event) => onChangeIntervalo(event.target.value, dataFim)}
                        className="rounded-md border-slate-300 bg-white text-xs text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <span className="text-xs text-slate-400">até</span>
                    <input
                        type="date"
                        value={dataFim ?? ""}
                        onChange={(event) => onChangeIntervalo(dataInicio, event.target.value)}
                        className="rounded-md border-slate-300 bg-white text-xs text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                </div>
            )}
        </div>
    );
}
