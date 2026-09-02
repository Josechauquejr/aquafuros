import { motion } from "motion/react";
import { formatCurrency } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Paleta categórica validada (skill de dataviz) — não a paleta de badges da
// app, que falhou no validador de acessibilidade para uso em gráficos.
const CORES = {
    facturado: "bg-[#2a78d6] dark:bg-[#3987e5]",
    recebido: "bg-[#1baf7a] dark:bg-[#199e70]",
};

const ALTURA_MAX = 140;

function formatCompacto(valor) {
    const n = Number(valor) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
}

export default function EvolucaoMensalChart({ dados }) {
    const maximo = Math.max(1, ...dados.flatMap((d) => [d.facturado, d.recebido]));
    const semDados = dados.every((d) => d.facturado === 0 && d.recebido === 0);

    return (
        <div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${CORES.facturado}`} aria-hidden="true" />
                    Facturado
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${CORES.recebido}`} aria-hidden="true" />
                    Recebido
                </span>
            </div>

            {semDados ? (
                <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Ainda sem dados suficientes para mostrar a evolução mensal.
                </p>
            ) : (
                <div
                    className="mt-4 flex items-end justify-between gap-2 border-b border-slate-200 pb-2 dark:border-slate-800"
                    style={{ height: ALTURA_MAX + 8 }}
                >
                    {dados.map((d, index) => {
                        const alturaFacturado = Math.max(2, (d.facturado / maximo) * ALTURA_MAX);
                        const alturaRecebido = Math.max(2, (d.recebido / maximo) * ALTURA_MAX);

                        return (
                            <div key={`${d.mes}/${d.ano}`} className="flex flex-1 flex-col items-center gap-1">
                                <div className="flex h-full items-end gap-1">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: alturaFacturado }}
                                        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        title={`Facturado ${meses[d.mes - 1]}/${d.ano}: ${formatCurrency(d.facturado)}`}
                                        className={`w-3 rounded-t sm:w-4 ${CORES.facturado}`}
                                    />
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: alturaRecebido }}
                                        transition={{ duration: 0.5, delay: index * 0.05 + 0.05, ease: [0.22, 1, 0.36, 1] }}
                                        title={`Recebido ${meses[d.mes - 1]}/${d.ano}: ${formatCurrency(d.recebido)}`}
                                        className={`w-3 rounded-t sm:w-4 ${CORES.recebido}`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!semDados && (
                <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    {dados.map((d) => (
                        <span key={`${d.mes}/${d.ano}-label`} className="flex-1 text-center">
                            {meses[d.mes - 1]}
                        </span>
                    ))}
                </div>
            )}

            {!semDados && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Pico do período: {formatCompacto(maximo)} MZN
                </p>
            )}
        </div>
    );
}
