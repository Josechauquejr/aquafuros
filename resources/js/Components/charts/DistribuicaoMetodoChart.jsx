import { Banknote, Landmark, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import DonutChart from "@/Components/charts/DonutChart";
import { formatCurrency } from "@/lib/utils";

// Mesma paleta categórica validada usada na Evolução Mensal — 4 slots
// aprovados pelo validador de acessibilidade (claro e escuro) para uso
// lado-a-lado, distinto da paleta de badges/estado já usada no resto da app.
export const metodoConfig = {
    dinheiro: { label: "Dinheiro", icon: Banknote, cor: "bg-[#2a78d6] dark:bg-[#3987e5]", hex: "#2a78d6" },
    banco: { label: "Transferência bancária", icon: Landmark, cor: "bg-[#eb6834] dark:bg-[#d95926]", hex: "#eb6834" },
    mpesa: { label: "M-Pesa", icon: Smartphone, cor: "bg-[#1baf7a] dark:bg-[#199e70]", hex: "#1baf7a" },
    "e-mola": { label: "e-Mola", icon: Smartphone, cor: "bg-[#eda100] dark:bg-[#c98500]", hex: "#eda100" },
};

/**
 * Distribuição de pagamentos por método — barras horizontais (variant
 * "barras", usado no /dashboard compacto) ou donut (variant "donut", usado
 * na página dedicada de KPIs). Mesma fonte de dados e paleta em ambos.
 */
export default function DistribuicaoMetodoChart({ dados, variant = "barras" }) {
    if (dados.length === 0) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Sem pagamentos registados neste período.
            </p>
        );
    }

    if (variant === "donut") {
        const dadosDonut = dados.map((d) => {
            const config = metodoConfig[d.metodo] ?? { label: d.metodo, hex: "#94a3b8" };
            return { chave: d.metodo, label: config.label, valor: d.total, cor: config.hex };
        });

        return <DonutChart dados={dadosDonut} />;
    }

    const total = dados.reduce((soma, d) => soma + d.total, 0);

    return (
        <div className="space-y-4">
            {dados.map((d, index) => {
                const config = metodoConfig[d.metodo] ?? {
                    label: d.metodo,
                    icon: Banknote,
                    cor: "bg-slate-400 dark:bg-slate-600",
                };
                const Icon = config.icon;
                const pct = total > 0 ? (d.total / total) * 100 : 0;

                return (
                    <div key={d.metodo}>
                        <div className="flex items-center justify-between text-sm">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                                <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                {config.label}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300">
                                {formatCurrency(d.total)}{" "}
                                <span className="text-slate-400 dark:text-slate-500">
                                    ({pct.toFixed(0)}%)
                                </span>
                            </span>
                        </div>
                        <div
                            className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                            title={`${config.label}: ${formatCurrency(d.total)} — ${d.quantidade} pagamento(s)`}
                        >
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(2, pct)}%` }}
                                transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                className={`h-full rounded-full ${config.cor}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
