import { motion } from "motion/react";
import { useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";

const RAIO = 60;
const ESPESSURA = 22;
const ESPESSURA_ACTIVA = 27;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Donut chart genérico (SVG, sem biblioteca de gráficos) — cada fatia é um
 * <circle> parcial animado via motion no desenho inicial (strokeDashoffset),
 * seguindo o mesmo padrão hand-rolled dos outros gráficos da app. Passar o
 * rato sobre uma fatia (ou a sua linha na legenda) destaca-a e mostra o
 * valor/percentagem no centro do donut — a legenda por si só já cobria a
 * acessibilidade, isto acrescenta a camada interactiva.
 */
export default function DonutChart({ dados, valorFormatter = formatCurrency, rotuloCentro }) {
    const [chaveActiva, setChaveActiva] = useState(null);

    const total = dados.reduce((soma, d) => soma + d.valor, 0);

    if (dados.length === 0 || total <= 0) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Sem dados suficientes para este período.
            </p>
        );
    }

    let acumulado = 0;
    const activo = dados.find((d) => d.chave === chaveActiva) ?? null;

    return (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90 overflow-visible">
                    <circle
                        cx="80"
                        cy="80"
                        r={RAIO}
                        fill="none"
                        strokeWidth={ESPESSURA}
                        className="stroke-slate-100 dark:stroke-slate-800"
                    />
                    {dados.map((d, index) => {
                        const fraccao = d.valor / total;
                        const comprimento = fraccao * CIRCUNFERENCIA;
                        const offset = acumulado;
                        acumulado += comprimento;
                        const activa = d.chave === chaveActiva;

                        return (
                            <motion.circle
                                key={d.chave}
                                cx="80"
                                cy="80"
                                r={RAIO}
                                fill="none"
                                stroke={d.cor}
                                strokeDasharray={`${comprimento} ${CIRCUNFERENCIA - comprimento}`}
                                className="cursor-pointer"
                                style={{ opacity: chaveActiva && !activa ? 0.45 : 1 }}
                                onMouseEnter={() => setChaveActiva(d.chave)}
                                onMouseLeave={() => setChaveActiva(null)}
                                initial={{ strokeDashoffset: -CIRCUNFERENCIA, strokeWidth: ESPESSURA }}
                                animate={{
                                    strokeDashoffset: -offset,
                                    strokeWidth: activa ? ESPESSURA_ACTIVA : ESPESSURA,
                                }}
                                transition={{
                                    strokeDashoffset: { duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] },
                                    strokeWidth: { duration: 0.15 },
                                    opacity: { duration: 0.15 },
                                }}
                            >
                                <title>{`${d.label}: ${valorFormatter(d.valor)} (${(fraccao * 100).toFixed(0)}%)`}</title>
                            </motion.circle>
                        );
                    })}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    {activo ? (
                        <>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{activo.label}</p>
                            <p className="text-sm font-bold text-slate-950 dark:text-white">
                                {valorFormatter(activo.valor)}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {((activo.valor / total) * 100).toFixed(0)}%
                            </p>
                        </>
                    ) : (
                        rotuloCentro && (
                            <>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{rotuloCentro.label}</p>
                                <p className="text-sm font-bold text-slate-950 dark:text-white">{rotuloCentro.valor}</p>
                            </>
                        )
                    )}
                </div>
            </div>
            <div className="w-full space-y-2 text-sm">
                {dados.map((d) => (
                    <div
                        key={d.chave}
                        onMouseEnter={() => setChaveActiva(d.chave)}
                        onMouseLeave={() => setChaveActiva(null)}
                        className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1 transition-colors",
                            chaveActiva === d.chave && "bg-slate-50 dark:bg-slate-800/60",
                        )}
                    >
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: d.cor }}
                                aria-hidden="true"
                            />
                            {d.label}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                            {valorFormatter(d.valor)}{" "}
                            <span className="text-slate-400 dark:text-slate-500">
                                ({((d.valor / total) * 100).toFixed(0)}%)
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
