import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import TextInput from "@/Components/TextInput";
import { cn } from "@/lib/utils";

/**
 * Lista pesquisável e organizada por letra — usada em qualquer selector que
 * antes era um `<select>` simples (cliente, leitura, factura...). Mesmo
 * padrão em toda a app: campo de pesquisa + lista de linhas clicáveis
 * agrupadas por cabeçalhos alfabéticos (A, B, C...), como um directório de
 * contactos.
 *
 * `itens`: array de dados. `obterId`: chave única. `obterOrdenacao`: string
 * usada para ordenar/agrupar por letra (ex.: nome do cliente). `obterTexto`:
 * string(s) usada na pesquisa (pode incluir mais campos que `obterOrdenacao`,
 * ex.: número + nome). `renderItem(item, seleccionado)`: conteúdo de cada
 * linha. `onSeleccionar(item)`: clique numa linha.
 */
export default function ListaPesquisavel({
    itens,
    valorSeleccionado,
    onSeleccionar,
    obterId,
    obterOrdenacao,
    obterTexto,
    renderItem,
    placeholder = "Pesquisar...",
    vazioTexto = "Nenhum resultado encontrado.",
}) {
    const [busca, setBusca] = useState("");

    const grupos = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        const filtrados = termo
            ? itens.filter((item) => obterTexto(item).toLowerCase().includes(termo))
            : itens;

        const ordenados = [...filtrados].sort((a, b) =>
            obterOrdenacao(a).localeCompare(obterOrdenacao(b), "pt", { sensitivity: "base" }),
        );

        const mapa = new Map();
        ordenados.forEach((item) => {
            const letra = (obterOrdenacao(item)?.[0] ?? "#").toUpperCase();
            if (!mapa.has(letra)) mapa.set(letra, []);
            mapa.get(letra).push(item);
        });

        return [...mapa.entries()].map(([letra, itensGrupo]) => ({ letra, itens: itensGrupo }));
    }, [itens, busca, obterOrdenacao, obterTexto]);

    const totalResultados = grupos.reduce((soma, g) => soma + g.itens.length, 0);

    return (
        <div>
            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                />
                <TextInput
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9"
                />
            </div>

            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                {totalResultados === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">{vazioTexto}</p>
                ) : (
                    grupos.map((grupo) => (
                        <div key={grupo.letra}>
                            <p className="sticky top-0 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                                {grupo.letra}
                            </p>
                            <div className="space-y-0.5 p-1">
                                {grupo.itens.map((item) => {
                                    const id = obterId(item);
                                    const seleccionado = String(valorSeleccionado) === String(id);

                                    return (
                                        <button
                                            type="button"
                                            key={id}
                                            onClick={() => onSeleccionar(item)}
                                            className={cn(
                                                "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                                                seleccionado
                                                    ? "bg-cyan-50 ring-1 ring-inset ring-cyan-500 dark:bg-cyan-950/40"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                            )}
                                        >
                                            {renderItem(item, seleccionado)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
