import { AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de formulário: rótulo, "(opcional)", marca "· alterado" quando o
 * valor mudou (Visibilidade do estado do sistema), erro com dica e ajuda.
 */
export function Campo({ id, rotulo, opcional = false, alterado = false, erro, ajuda, className = "", children }) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <label htmlFor={id} className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">
                {rotulo}
                {opcional && <span className="font-medium text-slate-500 dark:text-slate-400"> (opcional)</span>}
                {alterado && <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400"> · alterado</span>}
            </label>
            {children}
            {erro ? (
                <span className="flex items-start gap-1.5 text-[13px] font-medium text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {erro}
                </span>
            ) : (
                ajuda && <span className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{ajuda}</span>
            )}
        </div>
    );
}

/** Classes de um campo marcado como alterado (borda e fundo azul claro). */
export const classeAlterado = "!border-[#9DB8FF] !bg-[#F7F9FF] dark:!border-[rgba(110,162,255,0.45)] dark:!bg-[rgba(0,89,255,0.08)]";

/** O que não se pode mudar aqui: valor com cadeado e porquê / onde se muda. */
export function CampoBloqueado({ rotulo, valor, motivo }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">{rotulo}</span>
            <span className="flex min-h-[48px] items-center gap-2 rounded-md border border-[#E1E7F3] bg-slate-50 px-3.5 text-slate-600 dark:border-slate-700 dark:bg-[#1E232D] dark:text-slate-300">
                <span className="flex-1 text-[15px]">{valor}</span>
                <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
            {motivo && <span className="text-[13px] text-slate-500 dark:text-slate-400">{motivo}</span>}
        </div>
    );
}

/** Bloco numerado de um formulário longo (1 · Tipo, 2 · Quem é, 3 · Onde fica). */
export function BlocoNumerado({ numero, titulo, children }) {
    return (
        <fieldset className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8F2] p-5 dark:border-slate-700">
            <legend className="flex items-center gap-2.5 px-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white dark:bg-cyan-500">{numero}</span>
                <strong className="text-base text-ink dark:text-[#F2F5FB]">{titulo}</strong>
            </legend>
            {children}
        </fieldset>
    );
}

/** Resumo dos erros no topo do formulário, a dizer quantos campos corrigir. */
export function ResumoErros({ erros }) {
    const lista = Object.values(erros ?? {}).filter(Boolean);
    if (lista.length === 0) return null;
    return (
        <div role="alert" className="flex gap-3 rounded-[14px] border border-[#F3C6C1] bg-rose-50 p-4 dark:border-[rgba(244,163,154,0.3)] dark:bg-[rgba(244,163,154,0.10)]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" aria-hidden="true" />
            <div className="flex flex-col gap-1">
                <strong className="text-[15px] text-rose-700 dark:text-rose-300">
                    {lista.length === 1 ? "Falta corrigir 1 campo" : `Falta corrigir ${lista.length} campos`}
                </strong>
                <ul className="list-disc pl-4 text-sm text-rose-700 dark:text-rose-300">
                    {lista.map((erro) => (
                        <li key={erro}>{erro}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export const classeCampo =
    "block min-h-[48px] w-full rounded-md border-[#DDE2EE] bg-white text-[15px] text-ink placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#1E232D] dark:text-[#F2F5FB]";
