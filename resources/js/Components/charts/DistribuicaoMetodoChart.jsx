import { PieChart } from "lucide-react";
import DonutAnimado from "@/Components/charts/DonutAnimado";
import { formatMoney } from "@/lib/utils";

// Paleta categórica validada (skill de dataviz) — 4 slots aprovados para uso
// lado-a-lado, distinta da paleta de badges/estado do resto da app.
export const metodoConfig = {
    dinheiro: { label: "Dinheiro", hex: "#0059FF" },
    banco: { label: "Transferência bancária", hex: "#6EA2FF" },
    mpesa: { label: "M-Pesa", hex: "#1E7148" },
    "e-mola": { label: "e-Mola", hex: "#B86A00" },
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
    const config = (metodo) => metodoConfig[metodo] ?? { label: metodo, hex: "#8C97B0" };

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
