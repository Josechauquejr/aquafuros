import { Link, usePage } from "@inertiajs/react";
import { ChevronRight, Home } from "lucide-react";

// Rótulos dos segmentos de URL. Segmentos em SEM_LINK são só agrupadores
// (não existe página em /admin nem em /dev).
const ROTULOS = {
    dashboard: "Página principal",
    clientes: "Clientes",
    leituras: "Leituras",
    facturas: "Facturas",
    pagamentos: "Pagamentos",
    tarifas: "Valores e regras",
    lixeira: "Lixeira",
    "fecho-caixa": "Fecho de caixa",
    "ler-qr": "Ler QR Code",
    profile: "Perfil",
    admin: "Administração",
    kpis: "KPIs",
    logs: "Logs",
    dev: "Desenvolvimento",
    painel: "Painel",
    users: "Utilizadores",
    configuracoes: "Configurações",
    actividade: "Registo de actividade",
    acessos: "Acessos",
    erros: "Erros",
    tarefas: "Checklist",
};

const SEM_LINK = new Set(["admin", "dev"]);

function rotulo(segmento) {
    if (ROTULOS[segmento]) return ROTULOS[segmento];
    const texto = decodeURIComponent(segmento).replace(/-/g, " ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Breadcrumbs (estilo Flowbite) derivados do URL actual: início › secção ›
 * página. A última é a página actual (sem link).
 */
export default function Breadcrumbs({ casa = "/dashboard", className = "" }) {
    const { url } = usePage();
    const caminho = url.split("?")[0].split("#")[0];
    const segmentos = caminho.split("/").filter(Boolean);

    const migalhas = segmentos.map((segmento, indice) => ({
        texto: rotulo(segmento),
        href: "/" + segmentos.slice(0, indice + 1).join("/"),
        semLink: SEM_LINK.has(segmento) || /^\d+$/.test(segmento),
    }));

    // Na própria página inicial só mostra o ícone + rótulo.
    const naCasa = caminho === casa || caminho.endsWith("/dashboard");

    return (
        <nav aria-label="Breadcrumb" className={className}>
            <ol className="flex min-w-0 items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li className="flex shrink-0 items-center">
                    <Link
                        href={casa}
                        className="inline-flex items-center gap-1.5 transition hover:text-cyan-700 dark:hover:text-cyan-300"
                        aria-current={naCasa ? "page" : undefined}
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        <span className={naCasa ? "" : "hidden sm:inline"}>Início</span>
                    </Link>
                </li>
                {!naCasa &&
                    migalhas.map((migalha, indice) => {
                        const ultima = indice === migalhas.length - 1;

                        return (
                            <li key={migalha.href} className={ultima ? "flex min-w-0 items-center gap-1" : "hidden min-w-0 items-center gap-1 sm:flex"}>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
                                {ultima || migalha.semLink ? (
                                    <span
                                        className={
                                            ultima
                                                ? "truncate text-slate-900 dark:text-white"
                                                : "hidden truncate sm:inline"
                                        }
                                        aria-current={ultima ? "page" : undefined}
                                    >
                                        {migalha.texto}
                                    </span>
                                ) : (
                                    <Link
                                        href={migalha.href}
                                        className="hidden truncate transition hover:text-cyan-700 dark:hover:text-cyan-300 sm:inline"
                                    >
                                        {migalha.texto}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
            </ol>
        </nav>
    );
}
