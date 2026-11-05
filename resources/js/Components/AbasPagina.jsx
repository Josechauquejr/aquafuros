import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils";

/**
 * Separadores entre páginas irmãs que partilham uma só entrada no menu
 * (ex.: os vários registos do desenvolvedor). Cada separador é um link real.
 */
export default function AbasPagina({ abas, activa }) {
    return (
        <nav aria-label="Secções" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex min-w-max gap-1 border-b border-slate-200 dark:border-slate-800">
                {abas.map((aba) => (
                    <Link
                        key={aba.chave}
                        href={aba.href}
                        aria-current={aba.chave === activa ? "page" : undefined}
                        className={cn(
                            "-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition",
                            aba.chave === activa
                                ? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                        )}
                    >
                        {aba.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}

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
