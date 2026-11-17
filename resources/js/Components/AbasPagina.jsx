import { Link } from "@inertiajs/react";
import { ClipboardCheck, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Separadores entre páginas irmãs que partilham uma só entrada no menu
 * (ex.: os vários registos do desenvolvedor). Cada separador é um link real.
 */
export default function AbasPagina({ abas, activa }) {
    return (
        <nav aria-label="Secções" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex min-w-max gap-1.5 rounded-[14px] border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(4,26,83,0.05)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                {abas.map((aba) => {
                    const Icone = aba.icon;
                    return (
                        <Link
                            key={aba.chave}
                            href={aba.href}
                            aria-current={aba.chave === activa ? "page" : undefined}
                            className={cn(
                                "inline-flex min-h-[42px] items-center gap-2 rounded-[10px] px-4 text-sm font-bold transition-colors",
                                aba.chave === activa
                                    ? "bg-brand text-white dark:bg-cyan-500"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-ink dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white",
                            )}
                        >
                            {Icone ? <Icone className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> : null}
                            {aba.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export const ABAS_LEITURAS = [
    { chave: "leituras", label: "Leituras", href: "/leituras" },
    { chave: "estimadas", label: "Estimadas", href: "/leituras-estimadas" },
];

export const ABAS_REGISTOS = [
    { chave: "acessos", label: "Acessos", href: "/dev/logs/acessos" },
    { chave: "erros", label: "Erros", href: "/dev/logs/erros" },
    { chave: "aplicacao", label: "Aplicação", href: "/dev/logs/aplicacao" },
    { chave: "actividade", label: "Actividade", href: "/dev/actividade" },
    { chave: "auditoria", label: "Auditoria do painel", href: "/dev/auditoria" },
];

export const ABAS_DIAGNOSTICO = [
    { chave: "saude", label: "Saúde do sistema", href: "/dev/saude" },
    { chave: "integridade", label: "Integridade dos dados", href: "/dev/integridade" },
    { chave: "analise", label: "Análise de dados", href: "/dev/analise" },
];

export const ABAS_CAIXA = [
    { chave: "receber", label: "Receber", href: "/pagamentos", icon: Wallet },
    { chave: "recibos", label: "Recibos", href: "/pagamentos?aba=recibos", icon: Receipt },
    { chave: "fecho", label: "Fecho do dia", href: "/pagamentos/fecho-caixa", icon: ClipboardCheck },
];
