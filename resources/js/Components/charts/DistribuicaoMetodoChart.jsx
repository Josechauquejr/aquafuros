import { PieChart } from "lucide-react";
import DonutAnimado from "@/Components/charts/DonutAnimado";
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
 * Métodos de pagamento mais usados — donut animado (Animated Card 2) com o
 * valor recebido por método. `dados`: [{ metodo, total, quantidade }].
 */
export default function DistribuicaoMetodoChart({
    dados,
    titulo = "Métodos de pagamento mais usados",
    descricao,
    largo = false,
}) {
    const config = (metodo) => metodoConfig[metodo] ?? { label: metodo, hex: "#94a3b8" };

    return (
        <DonutAnimado
            titulo={titulo}
            descricao={descricao}
            icone={PieChart}
            largo={largo}
            dados={dados.map((d) => ({
                chave: d.metodo,
                label: `${config(d.metodo).label}${d.quantidade ? ` (${d.quantidade})` : ""}`,
                valor: Number(d.total) || 0,
                cor: config(d.metodo).hex,
            }))}
            formatar={formatMoney}
            rotuloTotal="Recebido"
            vazio="Sem pagamentos registados neste período."
        />
    );
}
