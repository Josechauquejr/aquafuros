import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { cn } from "@/lib/utils";
import ApexChart from "./ApexChart";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const rotuloMensal = (d) => `${meses[d.mes - 1]}/${d.ano}`;
export const rotuloMensalCurto = (d) => meses[d.mes - 1];

export function formatarCompacto(valor) {
    const n = Number(valor) || 0;
    const arredondar = (v) => v.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
    if (Math.abs(n) >= 1_000_000) return `${arredondar(n / 1_000_000)}M`;
    if (Math.abs(n) >= 1_000) return `${arredondar(n / 1_000)}K`;
    return n.toLocaleString("pt-PT", { maximumFractionDigits: 1 });
}

export const FILTROS_MESES = [
    { valor: 3, rotulo: "Últimos 3 meses" },
    { valor: 6, rotulo: "Últimos 6 meses" },
    { valor: 12, rotulo: "Últimos 12 meses" },
];

/**
 * Cartão de gráfico de séries temporais (padrão "Data series" do Flowbite +
 * ApexCharts): título e valor em destaque, gráfico, e um rodapé com o
 * filtro de datas e o botão "Ver mais dados" (abre a tabela com todos os
 * valores do intervalo seleccionado).
 *
 * - dados: todos os pontos disponíveis (o filtro mostra só os N últimos)
 * - series: [{ chave, label, cor }]
 * - tipo: "area" | "line" | "bar"
 * - filtros: [{ valor: N, rotulo }] — nº de pontos a mostrar; omitir = sem filtro
 * - formatar(valor): formatação nos eixos, tooltip e tabela
 */
export default function GraficoSerie({
    titulo,
    descricao,
    icone: Icone,
    destaque,
    variacao,
    dados,
    series,
    tipo = "area",
    filtros,
    filtroInicial,
    obterRotulo = rotuloMensal,
    obterRotuloEixo = rotuloMensalCurto,
    formatar = (v) => Number(v).toLocaleString("pt-PT"),
    formatarEixo,
    altura = 280,
    className,
}) {
    const [intervalo, setIntervalo] = useState(filtroInicial ?? filtros?.[Math.min(1, filtros.length - 1)]?.valor);
    const [verTudo, setVerTudo] = useState(false);
    const [filtroAberto, setFiltroAberto] = useState(false);

    const visiveis = intervalo ? dados.slice(-intervalo) : dados;
    const semDados = visiveis.length === 0 || visiveis.every((d) => series.every((s) => !Number(d[s.chave])));
    const filtroActual = filtros?.find((f) => f.valor === intervalo);
    const temVariacao = variacao !== undefined && variacao !== null;

    const opcoes = {
        chart: { type: tipo },
        series: series.map((s) => ({ name: s.label, data: visiveis.map((d) => Number(d[s.chave]) || 0) })),
        colors: series.map((s) => s.cor),
        stroke: { curve: "smooth", width: tipo === "bar" ? 0 : 3 },
        fill:
            tipo === "area"
                ? { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 95, 100] } }
                : { opacity: 1 },
        markers: { size: tipo === "line" ? 4 : 0, hover: { sizeOffset: 3 } },
        plotOptions: { bar: { columnWidth: "55%", borderRadius: 4 } },
        xaxis: {
            categories: visiveis.map(obterRotuloEixo),
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false },
        },
        yaxis: { labels: { formatter: (v) => (formatarEixo ?? formatar)(v) }, min: 0 },
        tooltip: {
            x: { formatter: (_, { dataPointIndex }) => obterRotulo(visiveis[dataPointIndex]) },
            y: { formatter: (v) => formatar(v) },
        },
        legend: { show: series.length > 1 },
    };

    return (
        <AnimatedPanel className={cn("flex flex-col", className)}>
            <div className="flex items-start justify-between gap-4 p-6 pb-0">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                        {Icone && <Icone className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
                        {titulo}
                    </h3>
                    {descricao && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
                    {destaque !== undefined && (
                        <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{destaque}</p>
                    )}
                </div>
                {temVariacao && (
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1 text-sm font-semibold",
                            variacao >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                        )}
                    >
                        {Math.abs(variacao).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%
                        {variacao >= 0 ? (
                            <TrendingUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <TrendingDown className="h-4 w-4" aria-hidden="true" />
                        )}
                    </span>
                )}
            </div>

            <div className="px-3 pt-2">
                {semDados ? (
                    <p className="px-3 py-10 text-sm text-slate-500 dark:text-slate-400">
                        Ainda sem dados suficientes para mostrar a tendência.
                    </p>
                ) : (
                    <ApexChart opcoes={opcoes} altura={altura} rotulo={titulo} />
                )}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 dark:border-slate-800">
                {filtros ? (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setFiltroAberto((aberto) => !aberto)}
                            aria-haspopup="listbox"
                            aria-expanded={filtroAberto}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-slate-400 dark:hover:text-white"
                        >
                            {filtroActual?.rotulo}
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                        {filtroAberto && (
                            <ul
                                role="listbox"
                                className="absolute bottom-full left-0 z-20 mb-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                            >
                                {filtros.map((filtro) => (
                                    <li key={filtro.valor} role="option" aria-selected={filtro.valor === intervalo}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIntervalo(filtro.valor);
                                                setFiltroAberto(false);
                                            }}
                                            className={cn(
                                                "block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800",
                                                filtro.valor === intervalo
                                                    ? "font-semibold text-cyan-700 dark:text-cyan-300"
                                                    : "text-slate-700 dark:text-slate-200",
                                            )}
                                        >
                                            {filtro.rotulo}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ) : (
                    <span />
                )}

                <button
                    type="button"
                    onClick={() => setVerTudo((aberto) => !aberto)}
                    aria-expanded={verTudo}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                >
                    {verTudo ? "Ocultar dados" : "Ver mais dados"}
                    <ArrowRight className={cn("h-4 w-4 transition-transform", verTudo && "rotate-90")} aria-hidden="true" />
                </button>
            </div>

            {verTudo && (
                <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-2.5">Período</th>
                                {series.map((s) => (
                                    <th key={s.chave} className="px-6 py-2.5 text-right">
                                        {s.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[...visiveis].reverse().map((d) => (
                                <tr key={obterRotulo(d)}>
                                    <td className="px-6 py-2.5 font-medium text-slate-900 dark:text-white">{obterRotulo(d)}</td>
                                    {series.map((s) => (
                                        <td key={s.chave} className="px-6 py-2.5 text-right text-slate-700 dark:text-slate-300">
                                            {formatar(Number(d[s.chave]) || 0)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AnimatedPanel>
    );
}
