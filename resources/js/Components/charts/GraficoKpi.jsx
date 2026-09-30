import ApexChart from "./ApexChart";

/**
 * Mini-gráfico de um KPI — sempre desenhado com os números reais do sistema
 * (nunca uma animação decorativa):
 *
 * - { tipo: "radial", valor: 40 }                     percentagem (ex.: taxa de cobrança)
 * - { tipo: "donut", series: [a, b], labels: [...] }  partes de um todo (ex.: confirmadas / por confirmar)
 * - { tipo: "spark", serie: [1, 2, 3], rotulos: [...] } evolução (ex.: facturado nos últimos meses)
 *
 * `cor` é a cor principal; `formatar` formata os valores da dica.
 */
export default function GraficoKpi({ grafico, cor = "#06b6d4", altura = 120, formatar = (v) => v, rotulo }) {
    if (grafico.tipo === "radial") {
        const valor = Math.max(0, Math.min(100, Number(grafico.valor) || 0));

        return (
            <ApexChart
                rotulo={rotulo}
                altura={altura}
                opcoes={{
                    chart: { type: "radialBar", sparkline: { enabled: true } },
                    series: [valor],
                    colors: [cor],
                    plotOptions: {
                        radialBar: {
                            startAngle: -110,
                            endAngle: 110,
                            hollow: { size: "58%" },
                            track: { background: "rgba(113,113,122,0.25)", strokeWidth: "100%" },
                            dataLabels: {
                                name: { show: false },
                                value: { offsetY: 6, fontSize: "22px", fontWeight: 700, formatter: (v) => `${Math.round(v)}%` },
                            },
                        },
                    },
                    stroke: { lineCap: "round" },
                    grid: { padding: { top: -4, bottom: -28, left: 0, right: 0 } },
                }}
            />
        );
    }

    if (grafico.tipo === "donut") {
        const total = grafico.series.reduce((soma, v) => soma + Number(v), 0);

        return (
            <ApexChart
                rotulo={rotulo}
                altura={altura}
                opcoes={{
                    chart: { type: "donut", sparkline: { enabled: true } },
                    series: grafico.series.map(Number),
                    labels: grafico.labels,
                    colors: grafico.cores ?? [cor, "#71717a"],
                    stroke: { width: 0 },
                    legend: { show: false },
                    tooltip: { y: { formatter: (v) => formatar(v) } },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: "72%",
                                labels: {
                                    show: true,
                                    name: { show: false },
                                    value: { show: true, fontSize: "20px", fontWeight: 700, offsetY: 6, formatter: () => formatar(total) },
                                    total: { show: true, showAlways: true, label: "", formatter: () => formatar(total) },
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
            rotulo={rotulo}
            altura={altura}
            opcoes={{
                chart: { type: "area", sparkline: { enabled: true } },
                series: [{ name: rotulo ?? "Valor", data: grafico.serie.map(Number) }],
                colors: [cor],
                stroke: { curve: "smooth", width: 3 },
                fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.02, stops: [0, 95, 100] } },
                xaxis: { categories: grafico.rotulos ?? grafico.serie.map((_, i) => i + 1) },
                yaxis: { min: 0 },
                tooltip: { fixed: { enabled: false }, x: { show: true }, y: { formatter: (v) => formatar(v) }, marker: { show: false } },
                grid: { padding: { top: 6, bottom: 0, left: 0, right: 0 } },
            }}
        />
    );
}
