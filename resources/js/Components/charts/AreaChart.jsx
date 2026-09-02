import { motion } from "motion/react";

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
 * preenchida. Complementa o gráfico de barras (EvolucaoMensalChart) com
 * uma leitura de tendência mais imediata.
 */
export default function AreaChart({ dados }) {
    const maximo = Math.max(1, ...dados.flatMap((d) => [Number(d.facturado) || 0, Number(d.recebido) || 0]));
    const semDados = dados.every((d) => !d.facturado && !d.recebido);

    if (semDados) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Ainda sem dados suficientes para mostrar a tendência.
            </p>
        );
    }

    const series = [
        { chave: "facturado", pontos: construirPontos(dados, "facturado", maximo) },
        { chave: "recebido", pontos: construirPontos(dados, "recebido", maximo) },
    ];

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

            <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="mt-4 w-full" preserveAspectRatio="none" style={{ height: 180 }}>
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
            </svg>

            <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                {dados.map((d) => (
                    <span key={`${d.mes}/${d.ano}`} className="flex-1 text-center">
                        {meses[d.mes - 1]}
                    </span>
                ))}
            </div>
        </div>
    );
}
