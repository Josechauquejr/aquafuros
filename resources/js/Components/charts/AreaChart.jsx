import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Mesma paleta categórica validada (skill de dataviz) usada no resto dos
// gráficos do painel — série por omissão (facturado/recebido, uso actual
// em /admin/kpis). Outros consumidores passam a sua própria `series`.
const SERIES_OMISSAO = [
    { chave: "facturado", label: "Facturado", cor: "#2a78d6", fill: "rgba(42,120,214,0.15)" },
    { chave: "recebido", label: "Recebido", cor: "#1baf7a", fill: "rgba(27,175,122,0.18)" },
];

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
 * Gráfico de área/"montanha" — tendência de até duas séries numéricas ao
 * longo do tempo, com desenho animado do traço (pathLength) e da área
 * preenchida. Segue o mês sob o cursor com uma linha-guia (crosshair) e
 * uma tooltip com os valores exactos — mover o rato é o que "activa" o
 * gráfico, não apenas o desenho inicial.
 *
 * `series`: [{ chave, label, cor, fill }] — por omissão, facturado/recebido
 * (uso original em /admin/kpis). `valorFormatter`: como formatar os valores
 * na tooltip (por omissão, moeda). `obterRotulo`/`obterRotuloEixo`: rótulo
 * completo (tooltip) e curto (eixo X) de cada ponto — por omissão assumem
 * dados mensais (`mes`/`ano`); outros consumidores (ex.: performance por
 * dia) passam as suas próprias funções.
 */
export default function AreaChart({
    dados,
    series: seriesConfig = SERIES_OMISSAO,
    valorFormatter = formatCurrency,
    obterRotulo = (d) => `${meses[d.mes - 1]}/${d.ano}`,
    obterRotuloEixo = (d) => meses[d.mes - 1],
}) {
    const svgRef = useRef(null);
    const [indiceActivo, setIndiceActivo] = useState(null);

    const maximo = Math.max(1, ...dados.flatMap((d) => seriesConfig.map((s) => Number(d[s.chave]) || 0)));
    const semDados = dados.every((d) => seriesConfig.every((s) => !d[s.chave]));

    if (semDados) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Ainda sem dados suficientes para mostrar a tendência.
            </p>
        );
    }

    const passo = dados.length > 1 ? (LARGURA - MARGEM * 2) / (dados.length - 1) : 0;
    const series = seriesConfig.map((s) => ({ ...s, pontos: construirPontos(dados, s.chave, maximo) }));

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
                {series.map((s) => (
                    <span key={s.chave} className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.cor }} aria-hidden="true" />
                        {s.label}
                    </span>
                ))}
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
                    {series.map((s, serieIndex) => (
                        <g key={s.chave}>
                            <motion.path
                                d={caminhoArea(s.pontos)}
                                fill={s.fill}
                                stroke="none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 + serieIndex * 0.15 }}
                            />
                            <motion.path
                                d={caminhoLinha(s.pontos)}
                                fill="none"
                                stroke={s.cor}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.9, delay: serieIndex * 0.15, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </g>
                    ))}

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
                            {series.map((s) => (
                                <motion.circle
                                    key={s.chave}
                                    cx={s.pontos[indiceActivo].x}
                                    cy={s.pontos[indiceActivo].y}
                                    fill={s.cor}
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
                            <p className="font-semibold text-slate-900 dark:text-white">{obterRotulo(activo)}</p>
                            {series.map((s) => (
                                <p key={s.chave} className="mt-1 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.cor }} aria-hidden="true" />
                                    {s.label}:{" "}
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {valorFormatter(activo[s.chave])}
                                    </span>
                                </p>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                {dados.map((d, index) => (
                    <span
                        key={`${obterRotuloEixo(d)}-${index}`}
                        className={`flex-1 text-center transition-colors ${
                            indiceActivo === index ? "font-semibold text-slate-900 dark:text-white" : ""
                        }`}
                    >
                        {obterRotuloEixo(d)}
                    </span>
                ))}
            </div>
        </div>
    );
}
