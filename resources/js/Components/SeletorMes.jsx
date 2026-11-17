import { router } from "@inertiajs/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Escolhe o mês que o painel mostra (por omissão, o actual): anterior /
 * seguinte, ou qualquer um dos últimos 24 na lista. O mês vai no URL
 * (?mes=AAAA-MM), por isso recarregar ou partilhar mantém a vista.
 */
export default function SeletorMes({ rota, mesReferencia, extra = {}, semVoltar = false }) {
    const { valor, opcoes, eActual } = mesReferencia;
    const indice = opcoes.findIndex((opcao) => opcao.valor === valor);
    const maisAntigo = opcoes[indice + 1];
    const maisRecente = opcoes[indice - 1];

    // `extra`: outros parâmetros da página (pesquisa, filtros) que a troca de
    // mês não deve perder — só valores com conteúdo vão para o URL.
    const preservados = Object.fromEntries(
        Object.entries(extra).filter(
            ([chave, v]) => chave !== "mes" && chave !== "page" && v !== "" && v !== null && v !== undefined && v !== false,
        ),
    );

    const ir = (mes) =>
        router.get(rota, mes === opcoes[0].valor ? preservados : { ...preservados, mes }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            showProgress: false,
        });

    const botao =
        "inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#DDE2EE] bg-white text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]";

    return (
        <div role="group" aria-label="Escolher mês" className="flex flex-wrap items-center gap-1.5">
            <button
                type="button"
                className={botao}
                onClick={() => maisAntigo && ir(maisAntigo.valor)}
                disabled={!maisAntigo}
                title="Mês anterior"
                aria-label="Mês anterior"
            >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <label className="relative">
                <span className="sr-only">Mês</span>
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <select
                    value={valor}
                    onChange={(evento) => ir(evento.target.value)}
                    className="h-11 min-w-[150px] rounded-md border-[#DDE2EE] bg-white pl-10 pr-8 text-[15px] font-bold text-ink dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB]"
                >
                    {opcoes.map((opcao) => (
                        <option key={opcao.valor} value={opcao.valor}>
                            {opcao.rotulo}
                        </option>
                    ))}
                </select>
            </label>

            <button
                type="button"
                className={botao}
                onClick={() => maisRecente && ir(maisRecente.valor)}
                disabled={!maisRecente}
                title="Mês seguinte"
                aria-label="Mês seguinte"
            >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {!eActual && !semVoltar && (
                <button
                    type="button"
                    onClick={() => ir(opcoes[0].valor)}
                    className="ml-1 text-sm font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-400"
                >
                    Voltar ao mês actual
                </button>
            )}
        </div>
    );
}
