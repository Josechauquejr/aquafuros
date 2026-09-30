import { UserX } from "lucide-react";
import DonutAnimado from "@/Components/charts/DonutAnimado";
import { formatMoney } from "@/lib/utils";

const CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];

/**
 * Maiores devedores — donut animado (Animated Card 2) com a parte de cada
 * cliente na dívida dos maiores devedores; cada linha da legenda abre a
 * ficha do cliente.
 *
 * devedores: [{ id, valor_divida, em_corte, cliente: { nome } }]
 */
export default function DevedoresChart({ devedores, titulo = "Maiores devedores", descricao, largo = false, className }) {
    return (
        <DonutAnimado
            titulo={titulo}
            descricao={descricao ?? `Top ${devedores.length} clientes por dívida acumulada`}
            icone={UserX}
            largo={largo}
            className={className}
            dados={devedores.map((divida, indice) => {
                const nome = divida.cliente?.nome ?? "Cliente removido";

                return {
                    chave: String(divida.id),
                    label: divida.em_corte ? `${nome} (cortado)` : nome,
                    valor: Number(divida.valor_divida) || 0,
                    cor: CORES[indice % CORES.length],
                    href: `/clientes?search=${encodeURIComponent(nome)}`,
                };
            })}
            formatar={formatMoney}
            rotuloTotal="Dívida"
            vazio="Nenhum cliente em dívida no momento."
        />
    );
}
