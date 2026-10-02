import { ArrowDown, ArrowUp, Calendar, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import TextInput from "@/Components/TextInput";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import Dropdown from "./Dropdown";

export const opcoesPeriodo = [
    { valor: "hoje", rotulo: "Hoje" },
    { valor: "semana", rotulo: "Esta semana" },
    { valor: "mes", rotulo: "Este mês" },
    { valor: "todos", rotulo: "Todos" },
    { valor: "personalizado", rotulo: "Personalizado" },
];

const campoClasses =
    "block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function rotuloPeriodo(filtros, opcoes = opcoesPeriodo) {
    if (filtros.periodo === "personalizado" && (filtros.data_inicio || filtros.data_fim)) {
        return `${filtros.data_inicio ? formatDate(filtros.data_inicio) : "…"} – ${
            filtros.data_fim ? formatDate(filtros.data_fim) : "…"
        }`;
    }
    return opcoes.find((opcao) => opcao.valor === filtros.periodo)?.rotulo ?? "Período";
}

export function PainelPeriodo({ filtros, navegar, fechar, opcoes = opcoesPeriodo }) {
    const [inicio, setInicio] = useState(filtros.data_inicio ?? "");
    const [fim, setFim] = useState(filtros.data_fim ?? "");
    // Escolher "Personalizado" só mostra os campos; o pedido ao servidor
    // vai com "Aplicar" (senão a página recarregava e fechava o painel).
    const [personalizado, setPersonalizado] = useState(filtros.periodo === "personalizado");

    const escolher = (valor) => {
        if (valor === "personalizado") {
            setPersonalizado(true);
            return;
        }
        setPersonalizado(false);
        navegar({ periodo: valor, data_inicio: null, data_fim: null });
        fechar();
    };

    return (
        <div className="space-y-1">
            {opcoes.map((opcao) => (
                <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => escolher(opcao.valor)}
                    className={cn(
                        "flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm transition",
                        (personalizado ? opcao.valor === "personalizado" : filtros.periodo === opcao.valor)
                            ? "bg-cyan-50 font-semibold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    )}
                >
                    {opcao.rotulo}
                </button>
            ))}

            {personalizado && (
                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                        De
                        <input
                            type="date"
                            value={inicio}
                            onChange={(evento) => setInicio(evento.target.value)}
                            className={cn(campoClasses, "mt-1")}
                        />
                    </label>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Até
                        <input
                            type="date"
                            value={fim}
                            onChange={(evento) => setFim(evento.target.value)}
                            className={cn(campoClasses, "mt-1")}
                        />
                    </label>
                    <button
                        type="button"
                        disabled={!inicio && !fim}
                        onClick={() => {
                            navegar({ periodo: "personalizado", data_inicio: inicio || null, data_fim: fim || null });
                            fechar();
                        }}
                        className="h-10 w-full rounded-md bg-cyan-700 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950"
                    >
                        Aplicar
                    </button>
                </div>
            )}
        </div>
    );
}

export function PainelFiltros({ filtrosConfig, filtros, navegar, colunasOrdenaveis }) {
    return (
        <div className="space-y-4">
            {filtrosConfig.filter((filtro) => filtro.tipo !== "oculto").map((filtro) =>
                filtro.tipo === "checkbox" ? (
                    <label key={filtro.chave} className="flex min-h-10 items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={Boolean(filtros[filtro.chave])}
                            onChange={(evento) => navegar({ [filtro.chave]: evento.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                        {filtro.rotulo}
                    </label>
                ) : (
                    <label key={filtro.chave} className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                        {filtro.rotulo}
                        <select
                            value={filtros[filtro.chave] ?? filtro.padrao}
                            onChange={(evento) => navegar({ [filtro.chave]: evento.target.value })}
                            className={cn(campoClasses, "mt-1")}
                        >
                            {filtro.opcoes.map((opcao) => (
                                <option key={opcao.valor} value={opcao.valor}>
                                    {opcao.rotulo}
                                </option>
                            ))}
                        </select>
                    </label>
                ),
            )}

            {/* Móvel: a tabela vira cartões e não há cabeçalhos — a ordenação
                partilha o mesmo estado (sort/dir) que o clique no cabeçalho. */}
            {colunasOrdenaveis.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800 md:hidden">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ordenar por</p>
                    <div className="flex gap-2">
                        <select
                            value={filtros.sort}
                            onChange={(evento) => navegar({ sort: evento.target.value, dir: filtros.dir })}
                            className={campoClasses}
                            aria-label="Ordenar por"
                        >
                            {colunasOrdenaveis.map((coluna) => (
                                <option key={coluna.chave} value={coluna.chave}>
                                    {coluna.titulo}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => navegar({ sort: filtros.sort, dir: filtros.dir === "asc" ? "desc" : "asc" })}
                            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            aria-label={filtros.dir === "asc" ? "Ordem crescente, alternar" : "Ordem decrescente, alternar"}
                        >
                            {filtros.dir === "asc" ? (
                                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            )}
                            {filtros.dir === "asc" ? "Cresc." : "Decresc."}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Chips dos filtros activos (e do período, se não for o de origem). */
export function chipsActivos({ filtrosConfig, filtros, padroes, periodo }) {
    const chips = [];

    filtrosConfig.forEach((filtro) => {
        const valor = filtros[filtro.chave];
        if (filtro.tipo === "checkbox") {
            if (valor) chips.push({ chave: filtro.chave, texto: filtro.rotulo, limpar: { [filtro.chave]: false } });
            return;
        }
        if (valor && String(valor) !== String(filtro.padrao)) {
            const opcao = filtro.opcoes.find((o) => String(o.valor) === String(valor));
            chips.push({
                chave: filtro.chave,
                texto: `${filtro.rotulo}: ${opcao?.rotulo ?? valor}`,
                limpar: { [filtro.chave]: filtro.padrao },
            });
        }
    });

    if (periodo && filtros.periodo !== padroes.periodo) {
        chips.push({
            chave: "periodo",
            texto: `Período: ${rotuloPeriodo(filtros)}`,
            limpar: { periodo: padroes.periodo, data_inicio: null, data_fim: null },
        });
    }

    return chips;
}

export default function Toolbar({
    estado,
    filtros,
    padroes,
    placeholder,
    periodo,
    filtrosConfig,
    colunasOrdenaveis,
}) {
    const { search, setSearch, navegar } = estado;
    const chips = chipsActivos({ filtrosConfig, filtros, padroes, periodo });
    const nFiltros = chips.filter((chip) => chip.chave !== "periodo").length;
    const temAlgo = chips.length > 0 || Boolean(search);
    const mostrarFiltros = filtrosConfig.some((filtro) => filtro.tipo !== "oculto") || colunasOrdenaveis.length > 0;

    const limparTudo = () => {
        const alteracoes = { search: "" };
        chips.forEach((chip) => Object.assign(alteracoes, chip.limpar));
        setSearch("");
        navegar(alteracoes);
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative basis-full md:basis-0 md:flex-1">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />
                    <TextInput
                        type="search"
                        value={search}
                        onChange={(evento) => setSearch(evento.target.value)}
                        placeholder={placeholder}
                        aria-label={placeholder}
                        className="h-10 w-full pl-9"
                    />
                </div>

                {periodo && (
                    <Dropdown
                        rotulo={rotuloPeriodo(filtros)}
                        icone={Calendar}
                        titulo="Período"
                        className="min-w-0 flex-1 md:flex-none"
                    >
                        {(fechar) => <PainelPeriodo filtros={filtros} navegar={navegar} fechar={fechar} />}
                    </Dropdown>
                )}

                {mostrarFiltros && (
                    <Dropdown
                        rotulo="Filtros"
                        icone={SlidersHorizontal}
                        contador={nFiltros}
                        titulo="Filtros"
                        sheetMobile
                        alinhar="right"
                        className="min-w-0 flex-1 md:flex-none"
                    >
                        <PainelFiltros
                            filtrosConfig={filtrosConfig}
                            filtros={filtros}
                            navegar={navegar}
                            colunasOrdenaveis={colunasOrdenaveis}
                        />
                    </Dropdown>
                )}
            </div>

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {chips.map((chip) => (
                        <span
                            key={chip.chave}
                            className="inline-flex items-center gap-1 rounded-full bg-cyan-50 py-1 pl-3 pr-1 text-xs font-medium text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200"
                        >
                            {chip.texto}
                            <button
                                type="button"
                                onClick={() => navegar(chip.limpar)}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-cyan-100 dark:hover:bg-cyan-900"
                                title={`Remover ${chip.texto}`}
                                aria-label={`Remover filtro ${chip.texto}`}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                    {temAlgo && (
                        <button
                            type="button"
                            onClick={limparTudo}
                            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
                        >
                            Limpar tudo
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
