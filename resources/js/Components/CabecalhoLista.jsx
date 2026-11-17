import { Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";

/**
 * Cabeçalho das páginas de lista: uma linha de contexto (ex.: "Ciclo de
 * Novembro · passo 1 de 5"), o título e, à direita, o mês e a acção principal.
 */
export default function CabecalhoLista({ contexto, titulo, resumo, children }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
                {contexto && <span className="text-sm text-slate-500 dark:text-slate-400">{contexto}</span>}
                <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">{titulo}</h1>
                {resumo && <span className="text-base text-slate-600 dark:text-slate-300">{resumo}</span>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
        </div>
    );
}

/** Faixa azul de "mês já fechado" com o regresso ao mês actual. */
export function AvisoMesFechado({ children, href, rotuloVoltar }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-cyan-100 px-[18px] py-3.5 text-brand dark:bg-[rgba(0,89,255,0.18)] dark:text-cyan-300">
            <span className="text-[15px]">{children}</span>
            <Link
                href={href}
                preserveScroll
                className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-cyan-500 bg-white px-4 text-sm font-bold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-400 dark:bg-slate-900 dark:text-cyan-400"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {rotuloVoltar}
            </Link>
        </div>
    );
}
