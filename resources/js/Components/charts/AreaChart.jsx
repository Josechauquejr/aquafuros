import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Mesma paleta categórica validada (skill de dataviz) usada no resto dos
// gráficos do painel.
const CORES = {
    facturado: { linha: "#2a78d6", fill: "rgba(42,120,214,0.15)" },
    recebido: { linha: "#1baf7a", fill: "rgba(27,175,122,0.18)" },
};

const LARGURA = 600;
const ALTURA = 180;
const MARGEM = 8;

function construirPontos(dados, chave, maximo) {
    const passo = dados.length > 1 ? (LARGURA - MARGEM * 2) / (dados.length - 1) : 0;

    return dados.map((d, i) => {
        const x = MARGEM + i * passo;
        const valor = Number(d[chave]) || 0;
        const y = ALTURA - MARGEM - (valor / maximo) * (ALTURA - MARGEM * 2);
        return { x, y };
    });
}

function caminhoLinha(pontos) {
    return pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function caminhoArea(pontos) {
    const linha = caminhoLinha(pontos);
    const ultimo = pontos[pontos.length - 1];
    const primeiro = pontos[0];
    return `${linha} L ${ultimo.x.toFixed(1)} ${ALTURA - MARGEM} L ${primeiro.x.toFixed(1)} ${ALTURA - MARGEM} Z`;
}

/**
 * Gráfico de área/"montanha" — tendência de facturado vs. recebido ao
 * longo do tempo, com desenho animado do traço (pathLength) e da área
 * preenchida. Segue o mês sob o cursor com uma linha-guia (crosshair) e
 * uma tooltip com os valores exactos — mover o rato é o que "activa" o
 * gráfico, não apenas o desenho inicial.
 */
export default function AreaChart({ dados }) {
    const svgRef = useRef(null);
    const [indiceActivo, setIndiceActivo] = useState(null);

    const maximo = Math.max(1, ...dados.flatMap((d) => [Number(d.facturado) || 0, Number(d.recebido) || 0]));
    const semDados = dados.every((d) => !d.facturado && !d.recebido);

    if (semDados) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Ainda sem dados suficientes para mostrar a tendência.
            </p>
        );
    }

    const passo = dados.length > 1 ? (LARGURA - MARGEM * 2) / (dados.length - 1) : 0;
    const series = [
        { chave: "facturado", pontos: construirPontos(dados, "facturado", maximo) },
        { chave: "recebido", pontos: construirPontos(dados, "recebido", maximo) },
    ];

    const localizarIndice = (clientX) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const fraccaoX = (clientX - rect.left) / rect.width;
        const xViewBox = fraccaoX * LARGURA;
        const indice = passo > 0 ? Math.round((xViewBox - MARGEM) / passo) : 0;
        return Math.min(dados.length - 1, Math.max(0, indice));
    };

    const activo = indiceActivo !== null ? dados[indiceActivo] : null;
    const xActivoPct = indiceActivo !== null && passo > 0 ? ((MARGEM + indiceActivo * passo) / LARGURA) * 100 : null;

    return (
        <div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CORES.facturado.linha }} aria-hidden="true" />
                    Facturado
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CORES.recebido.linha }} aria-hidden="true" />
                    Recebido
                </span>
            </div>

            <div className="relative mt-4">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${LARGURA} ${ALTURA}`}
                    className="w-full cursor-crosshair touch-none"
                    preserveAspectRatio="none"
                    style={{ height: 180 }}
                    onMouseMove={(event) => setIndiceActivo(localizarIndice(event.clientX))}
                    onMouseLeave={() => setIndiceActivo(null)}
                    onTouchMove={(event) => {
                        const toque = event.touches[0];
                        if (toque) setIndiceActivo(localizarIndice(toque.clientX));
                    }}
                    onTouchEnd={() => setIndiceActivo(null)}
                >
                    {series.map(({ chave, pontos }, serieIndex) => {
                        const cor = CORES[chave];

                        return (
                            <g key={chave}>
                                <motion.path
                                    d={caminhoArea(pontos)}
                                    fill={cor.fill}
                                    stroke="none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.6, delay: 0.2 + serieIndex * 0.15 }}
                                />
                                <motion.path
                                    d={caminhoLinha(pontos)}
                                    fill="none"
                                    stroke={cor.linha}
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.9, delay: serieIndex * 0.15, ease: [0.22, 1, 0.36, 1] }}
                                />
                            </g>
                        );
                    })}

                    {/* Linha-guia + pontos do mês sob o cursor */}
                    {indiceActivo !== null && (
                        <g>
                            <line
                                x1={series[0].pontos[indiceActivo].x}
                                x2={series[0].pontos[indiceActivo].x}
                                y1={MARGEM}
                                y2={ALTURA - MARGEM}
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeDasharray="3 3"
                                className="text-slate-300 dark:text-slate-700"
                            />
                            {series.map(({ chave, pontos }) => (
                                <motion.circle
                                    key={chave}
                                    cx={pontos[indiceActivo].x}
                                    cy={pontos[indiceActivo].y}
                                    fill={CORES[chave].linha}
                                    stroke="white"
                                    strokeWidth={1.5}
                                    initial={{ r: 0 }}
                                    animate={{ r: 4.5 }}
                                    transition={{ duration: 0.15 }}
                                />
                            ))}
                        </g>
                    )}
                </svg>

                {/* Tooltip flutuante — posicionada por percentagem, por isso
                    acompanha correctamente mesmo com o viewBox distorcido
                    (preserveAspectRatio="none"). */}
                <AnimatePresence>
                    {activo && xActivoPct !== null && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-900"
                            style={{
                                left: `${Math.min(94, Math.max(6, xActivoPct))}%`,
                            }}
                        >
                            <p className="font-semibold text-slate-900 dark:text-white">
                                {meses[activo.mes - 1]}/{activo.ano}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CORES.facturado.linha }} aria-hidden="true" />
                                Facturado: <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(activo.facturado)}</span>
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: CORES.recebido.linha }} aria-hidden="true" />
                                Recebido: <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(activo.recebido)}</span>
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                {dados.map((d, index) => (
                    <span
                        key={`${d.mes}/${d.ano}`}
                        className={`flex-1 text-center transition-colors ${
                            indiceActivo === index ? "font-semibold text-slate-900 dark:text-white" : ""
                        }`}
                    >
                        {meses[d.mes - 1]}
                    </span>
                ))}
            </div>
        </div>
    );
}
