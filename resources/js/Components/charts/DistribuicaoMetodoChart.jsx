import ApexChart from "@/Components/charts/ApexChart";
import { formatMoney } from "@/lib/utils";

// Paleta categórica validada (skill de dataviz) — 4 slots aprovados para uso
// lado-a-lado, distinta da paleta de badges/estado do resto da app.
export const metodoConfig = {
    dinheiro: { label: "Dinheiro", hex: "#2a78d6" },
    banco: { label: "Transferência bancária", hex: "#eb6834" },
    mpesa: { label: "M-Pesa", hex: "#1baf7a" },
    "e-mola": { label: "e-Mola", hex: "#eda100" },
};

/**
 * Distribuição de pagamentos por método (ApexCharts) — barras horizontais
 * (variant "barras", /dashboard compacto) ou donut (variant "donut", página
 * dedicada de KPIs). Mesma fonte de dados e paleta em ambos.
 */
export default function DistribuicaoMetodoChart({ dados, variant = "barras" }) {
    if (dados.length === 0) {
        return <p className="text-sm text-slate-500 dark:text-slate-400">Sem pagamentos registados neste período.</p>;
    }

    const config = (metodo) => metodoConfig[metodo] ?? { label: metodo, hex: "#94a3b8" };
    const rotulos = dados.map((d) => config(d.metodo).label);
    const cores = dados.map((d) => config(d.metodo).hex);
    const valores = dados.map((d) => Number(d.total) || 0);
    const total = valores.reduce((soma, v) => soma + v, 0);

    if (variant === "donut") {
        return (
            <ApexChart
                rotulo="Distribuição de pagamentos por método"
                altura={300}
                opcoes={{
                    chart: { type: "donut" },
                    series: valores,
                    labels: rotulos,
                    colors: cores,
                    stroke: { width: 2 },
                    legend: { position: "bottom", horizontalAlign: "center" },
                    tooltip: { y: { formatter: (v) => formatMoney(v) } },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: "68%",
                                labels: {
                                    show: true,
                                    name: { show: true },
                                    value: { show: true, fontSize: "20px", fontWeight: 700, formatter: (v) => formatMoney(v) },
                                    total: { show: true, label: "Total", formatter: () => formatMoney(total) },
                                },
                            },
                        },
                    },
                }}
            />
        );
    }

    return (
        <ApexChart
            rotulo="Distribuição de pagamentos por método"
            altura={Math.max(160, dados.length * 56)}
            opcoes={{
                chart: { type: "bar" },
                series: [{ name: "Recebido", data: valores }],
                colors: cores,
                plotOptions: { bar: { horizontal: true, distributed: true, barHeight: "55%", borderRadius: 4 } },
                legend: { show: false },
                grid: { show: false },
                xaxis: { categories: rotulos, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { fontWeight: 500 } } },
                dataLabels: {
                    enabled: true,
                    formatter: (v) => `${formatMoney(v)} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`,
                    style: { fontWeight: 600 },
                },
                tooltip: { y: { formatter: (v, { dataPointIndex }) => `${formatMoney(v)} — ${dados[dataPointIndex].quantidade} pagamento(s)` } },
            }}
        />
    );
}
