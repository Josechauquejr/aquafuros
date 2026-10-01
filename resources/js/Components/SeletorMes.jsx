import { router } from "@inertiajs/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Escolhe o mês que o painel mostra (por omissão, o actual): anterior /
 * seguinte, ou qualquer um dos últimos 24 na lista. O mês vai no URL
 * (?mes=AAAA-MM), por isso recarregar ou partilhar mantém a vista.
 */
export default function SeletorMes({ rota, mesReferencia, extra = {} }) {
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
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

    return (
        <div className="flex flex-wrap items-center gap-2">
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
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <select
                    value={valor}
                    onChange={(evento) => ir(evento.target.value)}
                    className="h-10 min-w-[11rem] rounded-md border-slate-300 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

            {!eActual && (
                <button
                    type="button"
                    onClick={() => ir(opcoes[0].valor)}
                    className="text-sm font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
                >
                    Voltar ao mês actual
                </button>
            )}
        </div>
    );
}
