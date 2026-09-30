import { Link } from "@inertiajs/react";
import { UserX } from "lucide-react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import StatusBadge from "@/Components/StatusBadge";
import { formatMoney } from "@/lib/utils";
import ApexChart from "./ApexChart";

const CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];

/**
 * Maiores devedores: donut animado com a parte de cada cliente na dívida
 * dos maiores devedores, e a lista ao lado (com ligação à ficha do cliente).
 *
 * devedores: [{ id, valor_divida, em_corte, cliente: { nome } }]
 */
export default function DevedoresChart({ devedores, titulo = "Maiores devedores", descricao, delay = 0.58 }) {
    const linhas = devedores.map((divida, indice) => ({
        id: divida.id,
        nome: divida.cliente?.nome ?? "Cliente removido",
        valor: Number(divida.valor_divida) || 0,
        emCorte: Boolean(divida.em_corte),
        cor: CORES[indice % CORES.length],
    }));
    const total = linhas.reduce((soma, linha) => soma + linha.valor, 0);

    return (
        <AnimatedPanel delay={delay} className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                    <UserX className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    {titulo}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {descricao ?? `Top ${linhas.length} clientes por dívida acumulada — quanto pesa cada um`}
                </p>
            </div>

            {linhas.length === 0 || total <= 0 ? (
                <p className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">Nenhum cliente em dívida no momento.</p>
            ) : (
                <div className="grid items-center gap-2 p-4 md:grid-cols-[minmax(0,18rem)_1fr] md:p-6">
                    <ApexChart
                        rotulo="Dívida por cliente"
                        altura={260}
                        opcoes={{
                            chart: { type: "donut" },
                            series: linhas.map((linha) => linha.valor),
                            labels: linhas.map((linha) => linha.nome),
                            colors: linhas.map((linha) => linha.cor),
                            stroke: { width: 2 },
                            legend: { show: false },
                            tooltip: { y: { formatter: (v) => formatMoney(v) } },
                            plotOptions: {
                                pie: {
                                    donut: {
                                        size: "68%",
                                        labels: {
                                            show: true,
                                            name: { show: true, fontSize: "13px" },
                                            value: { show: true, fontSize: "18px", fontWeight: 700, formatter: (v) => formatMoney(v) },
                                            total: { show: true, label: "Total", formatter: () => formatMoney(total) },
                                        },
                                    },
                                },
                            },
                        }}
                    />

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {linhas.map((linha) => (
                            <li key={linha.id}>
                                <Link
                                    href={`/clientes?search=${encodeURIComponent(linha.nome)}`}
                                    className="flex items-center justify-between gap-3 px-2 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: linha.cor }} aria-hidden="true" />
                                        <span className="truncate font-medium text-slate-900 dark:text-white">{linha.nome}</span>
                                        {linha.emCorte && <StatusBadge tone="rose">Cortado</StatusBadge>}
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block font-semibold text-rose-600 dark:text-rose-400">{formatMoney(linha.valor)}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {Math.round((linha.valor / total) * 100)}% do top
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </AnimatedPanel>
    );
}
