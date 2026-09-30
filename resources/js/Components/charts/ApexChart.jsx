import ApexCharts from "apexcharts";
import { useEffect, useRef, useState } from "react";

/** Acompanha a classe `dark` do <html> (tema claro/escuro da app). */
function useModoEscuro() {
    const [escuro, setEscuro] = useState(() =>
        typeof document === "undefined" ? false : document.documentElement.classList.contains("dark"),
    );

    useEffect(() => {
        const observador = new MutationObserver(() =>
            setEscuro(document.documentElement.classList.contains("dark")),
        );
        observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observador.disconnect();
    }, []);

    return escuro;
}

/**
 * Wrapper mínimo do ApexCharts 3.46 (sem react-apexcharts, que exige a v5):
 * cria o gráfico uma vez, actualiza-o quando os dados/tema mudam e destrói-o
 * ao desmontar. Fontes, cores de texto/grelha e tooltip seguem o tema.
 *
 * `opcoes` são as opções do Apex (chart.type, series, xaxis, colors, ...),
 * fundidas por cima das opções base da app.
 */
export default function ApexChart({ opcoes, altura = 280, rotulo }) {
    const contentor = useRef(null);
    const grafico = useRef(null);
    const escuro = useModoEscuro();

    const base = {
        chart: {
            height: altura,
            fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif",
            foreColor: escuro ? "#94a3b8" : "#64748b",
            background: "transparent",
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: { enabled: true, speed: 500 },
        },
        theme: { mode: escuro ? "dark" : "light" },
        grid: {
            borderColor: escuro ? "#1e293b" : "#e2e8f0",
            strokeDashArray: 4,
            padding: { left: 8, right: 8 },
        },
        dataLabels: { enabled: false },
        legend: { position: "top", horizontalAlign: "left", fontWeight: 500, markers: { size: 6 } },
        tooltip: { theme: escuro ? "dark" : "light" },
        noData: { text: "Sem dados suficientes para mostrar.", style: { fontSize: "14px" } },
    };

    const fundir = (a, b) => {
        const saida = { ...a };
        Object.keys(b).forEach((chave) => {
            const x = a[chave];
            const y = b[chave];
            saida[chave] =
                x && y && typeof x === "object" && typeof y === "object" && !Array.isArray(x) && !Array.isArray(y)
                    ? fundir(x, y)
                    : y;
        });
        return saida;
    };

    const final = fundir(base, opcoes);

    useEffect(() => {
        if (!contentor.current) return undefined;

        grafico.current = new ApexCharts(contentor.current, final);
        grafico.current.render();

        return () => {
            grafico.current?.destroy();
            grafico.current = null;
        };
        // Criado uma vez; as actualizações vêm do efeito seguinte.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const assinatura = JSON.stringify(final);
    const primeira = useRef(true);

    useEffect(() => {
        if (primeira.current) {
            primeira.current = false;
            return;
        }
        grafico.current?.updateOptions(final, true, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assinatura]);

    return <div ref={contentor} role="img" aria-label={rotulo} className="min-h-[1px] w-full" />;
}
