import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho de coluna. Todos partilham o mesmo estilo; quem diz que uma
 * coluna é ordenável é o ícone (↕ discreto; ↑/↓ destacado na activa),
 * depois do texto nas colunas de texto e antes nas numéricas à direita.
 */
export default function SortableHeader({ coluna, sort, dir, onOrdenar, className = "" }) {
    const direita = Boolean(coluna.direita);
    const activo = coluna.ordenavel && sort === coluna.chave;
    const aria = !coluna.ordenavel ? undefined : activo ? (dir === "asc" ? "ascending" : "descending") : "none";

    const Icone = activo ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    const icone = coluna.ordenavel && (
        <Icone
            className={cn(
                "h-3.5 w-3.5 shrink-0",
                activo ? "text-cyan-700 dark:text-cyan-300" : "text-slate-300 dark:text-slate-600",
            )}
            aria-hidden="true"
        />
    );

    return (
        <th
            scope="col"
            aria-sort={aria}
            className={cn(
                "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
                direita ? "text-right" : "text-left",
                className,
            )}
        >
            {coluna.ordenavel ? (
                <button
                    type="button"
                    onClick={() => onOrdenar(coluna.chave)}
                    className={cn(
                        "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:text-white",
                        activo && "text-slate-900 dark:text-white",
                    )}
                    title={`Ordenar por ${coluna.titulo}`}
                >
                    {direita && icone}
                    {coluna.titulo}
                    {!direita && icone}
                </button>
            ) : (
                coluna.titulo
            )}
        </th>
    );
}
