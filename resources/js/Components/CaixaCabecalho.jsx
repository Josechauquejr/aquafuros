import AbasPagina, { ABAS_CAIXA } from "@/Components/AbasPagina";
import CabecalhoLista from "@/Components/CabecalhoLista";
import { formatMoney } from "@/lib/utils";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Cabeçalho comum do Caixa: data, estado da caixa, total de hoje e os 3 separadores. */
export default function CaixaCabecalho({ caixaHoje, activa }) {
    const agora = new Date();
    const total = caixaHoje?.total ?? 0;
    const recibos = caixaHoje?.recibos ?? 0;

    return (
        <div className="flex flex-col gap-5">
            <CabecalhoLista
                contexto={`${DIAS[agora.getDay()]}, ${agora.getDate()} de ${MESES[agora.getMonth()]} · caixa ${caixaHoje?.fechada ? "fechada" : "aberta"}`}
                titulo="Caixa"
            >
                <div className="flex items-baseline gap-2 rounded-md border border-[#DDE2EE] bg-white px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-slate-500 dark:text-slate-400">Hoje</span>
                    <strong className="text-lg tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(total)}</strong>
                    <span className="text-slate-500 dark:text-slate-400">
                        · {recibos} {recibos === 1 ? "recibo" : "recibos"}
                    </span>
                </div>
            </CabecalhoLista>
            <AbasPagina abas={ABAS_CAIXA} activa={activa} />
        </div>
    );
}
