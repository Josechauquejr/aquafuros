import { Calendar } from "lucide-react";
import Dropdown from "@/Components/DataTable/Dropdown";
import { PainelPeriodo, rotuloPeriodo } from "@/Components/DataTable/Toolbar";

// O painel envia null para "sem valor"; estas páginas omitem o parâmetro (undefined).
const semNulos = (navegar) => (alteracoes) =>
    navegar(Object.fromEntries(Object.entries(alteracoes).map(([chave, valor]) => [chave, valor ?? undefined])));

/**
 * Filtro de período fora das tabelas (KPIs, painel do desenvolvedor): o mesmo
 * botão + painel (Hoje / Esta semana / Este mês / Todos / Personalizado) que a
 * barra das listas usa. `filtros` tem { periodo, data_inicio, data_fim } e
 * `navegar` recebe as alterações a aplicar.
 */
export default function FiltroPeriodo({ filtros, navegar, opcoes }) {
    return (
        <Dropdown rotulo={rotuloPeriodo(filtros, opcoes)} icone={Calendar} titulo="Período" alinhar="right">
            {(fechar) => <PainelPeriodo filtros={filtros} navegar={semNulos(navegar)} fechar={fechar} opcoes={opcoes} />}
        </Dropdown>
    );
}
