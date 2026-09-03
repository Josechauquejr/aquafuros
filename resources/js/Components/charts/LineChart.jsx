import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const LARGURA = 600;
const ALTURA = 160;
const MARGEM = 8;

function formatarM3(valor) {
    return `${Number(valor).toLocaleString("pt-MZ", { maximumFractionDigits: 1 })} m³`;
}

/**
 * Gráfico de linha de série única (SVG, sem biblioteca de gráficos) — usado
 * para tendências de quantidade (não monetárias, ex.: consumo de água em
 * m³). Mesmo padrão de interacção do AreaChart: linha-guia + tooltip a
 * seguir o cursor, marcadores sempre visíveis nos pontos de dados.
 */
export default function LineChart({ dados, chave = "valor", cor = "#2a78d6", valorFormatter = formatarM3 }) {
    const svgRef = useRef(null);
    const [indiceActivo, setIndiceActivo] = useState(null);

    const semDados = dados.every((d) => !d[chave]);

    if (semDados) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Ainda sem dados suficientes para mostrar a tendência.
            </p>
        );
    }

    const maximo = Math.max(1, ...dados.map((d) => Number(d[chave]) || 0));
    const passo = dados.length > 1 ? (LARGURA - MARGEM * 2) / (dados.length - 1) : 0;

    const pontos = dados.map((d, i) => {
        const x = MARGEM + i * passo;
        const valor = Number(d[chave]) || 0;
        const y = ALTURA - MARGEM - (valor / maximo) * (ALTURA - MARGEM * 2);
        return { x, y, valor };
    });

    const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    const localizarIndice = (clientX) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const fraccaoX = (clientX - rect.left) / rect.width;
        const xViewBox = fraccaoX * LARGURA;
        const indice = passo > 0 ? Math.round((xViewBox - MARGEM) / passo) : 0;
        return Math.min(dados.length - 1, Math.max(0, indice));
    };

    const activo = indiceActivo !== null ? dados[indiceActivo] : null;
    const pontoActivo = indiceActivo !== null ? pontos[indiceActivo] : null;
    const xActivoPct = pontoActivo ? (pontoActivo.x / LARGURA) * 100 : null;

    return (
        <div>
            <div className="relative">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${LARGURA} ${ALTURA}`}
                    className="w-full cursor-crosshair touch-none"
                    preserveAspectRatio="none"
                    style={{ height: ALTURA }}
                    onMouseMove={(event) => setIndiceActivo(localizarIndice(event.clientX))}
                    onMouseLeave={() => setIndiceActivo(null)}
                    onTouchMove={(event) => {
                        const toque = event.touches[0];
                        if (toque) setIndiceActivo(localizarIndice(toque.clientX));
                    }}
                    onTouchEnd={() => setIndiceActivo(null)}
                >
                    <motion.path
                        d={caminho}
                        fill="none"
                        stroke={cor}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {pontos.map((p, index) => (
                        <motion.circle
                            key={`${dados[index].mes}/${dados[index].ano}`}
                            cx={p.x}
                            cy={p.y}
                            fill={cor}
                            stroke="white"
                            strokeWidth={1.5}
                            initial={{ r: 0 }}
                            animate={{ r: indiceActivo === index ? 5 : 3 }}
                            transition={{ duration: 0.2, delay: indiceActivo === null ? 0.5 + index * 0.05 : 0 }}
                        />
                    ))}

                    {indiceActivo !== null && (
                        <line
                            x1={pontoActivo.x}
                            x2={pontoActivo.x}
                            y1={MARGEM}
                            y2={ALTURA - MARGEM}
                            stroke="currentColor"
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            className="pointer-events-none text-slate-300 dark:text-slate-700"
                        />
                    )}
                </svg>

                <AnimatePresence>
                    {activo && xActivoPct !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
                            style={{ left: `${Math.min(94, Math.max(6, xActivoPct))}%` }}
                        >
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {meses[activo.mes - 1]}/{activo.ano}
                            </p>
                            <p className="mt-1 font-medium" style={{ color: cor }}>
                                {valorFormatter(activo[chave])}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                {dados.map((d, index) => (
                    <span
                        key={`${d.mes}/${d.ano}-label`}
                        className={`flex-1 text-center transition-colors ${
                            indiceActivo === index ? "font-semibold text-slate-900 dark:text-white" : ""
                        }`}
                    >
                        {meses[d.mes - 1]}
                    </span>
                ))}
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Pico do período: {valorFormatter(maximo)}
            </p>
        </div>
    );
}
