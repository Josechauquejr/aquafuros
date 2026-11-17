import { cn } from "@/lib/utils";

/**
 * Separadores por estado no topo de uma lista (Por ler · Por confirmar ·
 * Confirmadas…): sublinhado de 3px no activo, contagem ao lado.
 * abas: [{ chave, rotulo, contagem?, href? }] — com `href` é um link real.
 */
export default function AbasEstado({ abas, activa, onEscolher, rotulo = "Estado", className = "" }) {
    return (
        <div
            role="tablist"
            aria-label={rotulo}
            className={cn("flex flex-wrap gap-1 border-b border-[#E8ECF4] px-3.5 pt-2.5 dark:border-slate-800", className)}
        >
            {abas.map((aba) => {
                const on = aba.chave === activa;
                return (
                    <button
                        key={aba.chave}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onEscolher(aba)}
                        className={cn(
                            "-mb-px min-h-[44px] border-b-[3px] px-3.5 text-sm transition-colors",
                            on
                                ? "border-brand font-bold text-ink dark:border-cyan-400 dark:text-[#F2F5FB]"
                                : "border-transparent font-medium text-slate-600 hover:text-ink dark:text-slate-300 dark:hover:text-white",
                        )}
                    >
                        {aba.rotulo}
                        {aba.contagem !== undefined && aba.contagem !== null && (
                            <span className="ml-1.5 tabular-nums text-slate-500 dark:text-slate-400">{aba.contagem}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
