import { Link, router, useForm, usePage } from "@inertiajs/react";
import { ChevronsUpDown, Download, LogOut, Moon, Plus, QrCode, Search, Sun, User, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PageHelp from "@/Components/PageHelp";
import AquaGuia from "@/Components/AquaGuia";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/Components/animate-ui/components/radix/sidebar";
import FlashToasts from "@/Components/FlashToasts";
import MarcaAquafuros from "@/Components/MarcaAquafuros";
import NovidadesModal from "@/Components/NovidadesModal";
import { EVENTO_NOVO } from "@/hooks/useAbrirNovo";
import { useTheme } from "@/hooks/use-theme";
import { useInstalarApp } from "@/lib/pwa";
import { cn } from "@/lib/utils";
import BarraProgresso from "@/Components/BarraProgresso";
import PageLoadingSkeleton from "@/Components/PageLoadingSkeleton";

function activo(url, href) {
    const caminho = url.split("?")[0];
    return href === "/dashboard" || href === "/dev/painel" ? caminho === href : caminho.startsWith(href);
}

// O prefixo mais longo que liga o URL ao item: o próprio href ou um dos
// `activoEm` (páginas agrupadas sob uma só entrada do menu).
function correspondencia(url, item) {
    return [item.href, ...(item.activoEm ?? [])]
        .filter((prefixo) => activo(url, prefixo))
        .sort((a, b) => b.length - a.length)[0];
}

/**
 * Quando a shell é persistente (ver `layout` em app.js), as páginas continuam a
 * escrever `<AdminLayout header={...}>`: o cabeçalho vai por portal para este
 * elemento. `undefined` = não há shell persistente (o layout monta a sua própria).
 */
export const CabecalhoContext = createContext(undefined);

// Categoria simples: { categoria, items }. Com subcategorias: { categoria, subgrupos: [{ nome, items }] }.
const itensDoGrupo = (grupo) => grupo.subgrupos?.flatMap((sub) => sub.items) ?? grupo.items ?? [];

// A página mais específica ganha (ex.: /dev/logs/acessos antes de /dev).
function paginaActiva(groups, url) {
    return (
        groups
            .flatMap(itensDoGrupo)
            .map((item) => [item.href, correspondencia(url, item)])
            .filter(([, prefixo]) => prefixo)
            .sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? ""
    );
}

const PAPEIS = {
    administrador: "Administrador",
    gestor: "Gestor",
    caixa: "Caixa",
    tecnico: "Técnico",
    desenvolvedor: "Desenvolvedor",
};

function iniciais(nome = "") {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "?";
}

export { MarcaAquafuros };

function ItemMenu({ item, activo: estaActivo }) {
    const { setOpenMobile } = useSidebar();
    const Icone = item.icon;

    return (
        <Link
            href={item.href}
            prefetch="hover"
            cacheFor="5m"
            onClick={() => setOpenMobile(false)}
            aria-current={estaActivo ? "page" : undefined}
            title={item.label}
            className={cn(
                "flex min-h-[42px] items-center gap-3 rounded-md px-2 text-sm transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                estaActivo
                    ? "bg-cyan-100 font-bold text-brand dark:bg-[rgba(0,89,255,0.18)] dark:text-white"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-ink dark:text-[#C9D3E6] dark:hover:bg-white/[0.04] dark:hover:text-white",
            )}
        >
            <span
                className={cn(
                    "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]",
                    estaActivo ? "bg-cyan-500 text-white" : "bg-[#EEF2FA] text-brand dark:bg-[#1E232D] dark:text-cyan-300",
                )}
            >
                <Icone className="h-[17px] w-[17px]" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
            {item.badge ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-700 group-data-[collapsible=icon]:hidden dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300">
                    {item.badge}
                </span>
            ) : null}
        </Link>
    );
}

/** "Ciclo de Novembro · dia 7 de 30": em que fase do mês estamos. */
function BlocoCiclo({ ciclo }) {
    if (!ciclo) return null;
    const progresso = Math.min(100, Math.round((ciclo.dia / ciclo.dias) * 100));

    return (
        <div className="mx-1 flex flex-col gap-2 rounded-[14px] bg-[#EEF3FF] p-3.5 group-data-[collapsible=icon]:hidden dark:bg-[#1E232D]">
            <div className="flex items-baseline justify-between gap-2">
                <strong className="text-sm text-ink dark:text-[#F2F5FB]">Ciclo de {ciclo.mes}</strong>
                <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                    dia {ciclo.dia} de {ciclo.dias}
                </span>
            </div>
            <BarraProgresso pct={progresso} className="h-1.5" fundo="bg-cyan-200 dark:bg-slate-800" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
                Leituras até {ciclo.leiturasAte} · vence {ciclo.vence}
            </span>
        </div>
    );
}

function MenuConta() {
    const { auth } = usePage().props;
    const [aberto, setAberto] = useState(false);
    const logout = useForm({});
    const instalarApp = useInstalarApp();
    const { resolvedTheme, setTheme } = useTheme();
    const caixa = useRef(null);
    const nome = auth?.user?.name ?? "";
    const papel = PAPEIS[auth?.roles?.[0]] ?? "";
    const escuro = resolvedTheme === "dark";

    useEffect(() => {
        if (!aberto) return undefined;
        const fechar = (evento) => {
            if (evento.type === "keydown" ? evento.key === "Escape" : !caixa.current?.contains(evento.target)) setAberto(false);
        };
        document.addEventListener("mousedown", fechar);
        document.addEventListener("keydown", fechar);
        return () => {
            document.removeEventListener("mousedown", fechar);
            document.removeEventListener("keydown", fechar);
        };
    }, [aberto]);

    const terminarSessao = (evento) => {
        evento.preventDefault();
        router.flushAll();
        logout.post("/logout");
    };

    const linha =
        "flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-ink hover:bg-slate-50 dark:text-[#F2F5FB] dark:hover:bg-white/[0.06]";

    return (
        <div ref={caixa} className="relative">
            <button
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                aria-haspopup="menu"
                aria-expanded={aberto}
                title={nome}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 dark:hover:bg-white/[0.04]"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[13px] font-bold text-brand dark:bg-[#262C38] dark:text-[#F2F5FB]">
                    {iniciais(nome)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold text-ink dark:text-[#F2F5FB]">{nome}</span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">{papel}</span>
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400 group-data-[collapsible=icon]:hidden" aria-hidden="true" />
            </button>

            <AnimatePresence>
                {aberto && (
                    <motion.div
                        role="menu"
                        initial={{ opacity: 0, scale: 0.97, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 6 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute bottom-full left-0 z-50 mb-2 w-60 origin-bottom-left rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#262C38]"
                    >
                        <Link href="/profile" role="menuitem" className={linha} onClick={() => setAberto(false)}>
                            <User className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            Perfil
                        </Link>
                        <button type="button" role="menuitem" className={linha} onClick={() => setTheme(escuro ? "light" : "dark")}>
                            {escuro ? (
                                <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            ) : (
                                <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            )}
                            {escuro ? "Tema claro" : "Tema escuro"}
                        </button>
                        {instalarApp && (
                            <button
                                type="button"
                                role="menuitem"
                                className={linha}
                                onClick={() => {
                                    setAberto(false);
                                    instalarApp();
                                }}
                            >
                                <Download className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                Instalar aplicação
                            </button>
                        )}
                        <form onSubmit={terminarSessao} className="mt-1 border-t border-[#E8ECF4] pt-1 dark:border-slate-800">
                            <button type="submit" role="menuitem" className={linha}>
                                <LogOut className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                Sair
                            </button>
                        </form>
                        <p className="px-3 pb-1.5 pt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                            Desenvolvido pela RJM Consultórios e Serviços · José Zeferino Chaúque Júnior
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MenuLateral({ groups, casa }) {
    const { url, props } = usePage();
    const { empresa, ciclo } = props;
    const activa = paginaActiva(groups, url);

    return (
        <Sidebar collapsible="icon" animateOnHover={false} className="!border-r-0 !shadow-none">
            <SidebarHeader className="px-3.5 pb-0 pt-5">
                <Link href={casa} className="flex items-start gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <MarcaAquafuros className="h-[38px] w-[38px]" />
                    <span className="flex min-w-0 flex-1 flex-col whitespace-normal group-data-[collapsible=icon]:hidden">
                        <span className="break-words text-lg font-bold leading-tight text-ink dark:text-[#F2F5FB]">{empresa?.nome ?? "Aquafuros"}</span>
                        {empresa?.localizacao ? (
                            <span className="break-words text-xs leading-snug text-slate-500 dark:text-slate-400">{empresa.localizacao}</span>
                        ) : null}
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent className="gap-5 px-3.5 py-5">
                <BlocoCiclo ciclo={ciclo} />
                <nav aria-label="Menu principal" className="flex flex-col gap-5">
                    {groups.map((grupo) => (
                        <div key={grupo.categoria} className="flex flex-col gap-0.5">
                            <span className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-[1px] text-[#6B7388] group-data-[collapsible=icon]:hidden dark:text-[#7F8BA6]">
                                {grupo.categoria}
                            </span>
                            {itensDoGrupo(grupo).map((item) => (
                                <ItemMenu key={item.href} item={item} activo={item.href === activa} />
                            ))}
                        </div>
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter className="mx-3.5 mb-2 !border-t-0 px-0 pt-3">
                <MenuConta />
            </SidebarFooter>
        </Sidebar>
    );
}

// O utilizador está a escrever: as teclas de atalho não fazem nada.
function aEscrever(alvo) {
    return alvo instanceof HTMLElement && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));
}

function irPara(accao) {
    if (window.location.pathname === accao.href) {
        window.dispatchEvent(new Event(EVENTO_NOVO));
    } else {
        router.visit(accao.abre === false ? accao.href : `${accao.href}?novo=1`);
    }
}

/** "+ Novo": as acções mais usadas, com teclas de atalho (P, L, N, F). */
function MenuNovo({ accoes }) {
    const [aberto, setAberto] = useState(false);
    const caixa = useRef(null);

    useEffect(() => {
        const atalho = (evento) => {
            if (evento.ctrlKey || evento.metaKey || evento.altKey || aEscrever(evento.target)) return;
            if (document.querySelector('[role="dialog"]')) return;
            const accao = accoes.find((a) => a.tecla && a.tecla.toLowerCase() === evento.key.toLowerCase());
            if (!accao) return;
            evento.preventDefault();
            setAberto(false);
            irPara(accao);
        };
        window.addEventListener("keydown", atalho);
        return () => window.removeEventListener("keydown", atalho);
    }, [accoes]);

    useEffect(() => {
        if (!aberto) return undefined;
        const fechar = (evento) => {
            if (evento.type === "keydown" ? evento.key === "Escape" : !caixa.current?.contains(evento.target)) setAberto(false);
        };
        document.addEventListener("mousedown", fechar);
        document.addEventListener("keydown", fechar);
        return () => {
            document.removeEventListener("mousedown", fechar);
            document.removeEventListener("keydown", fechar);
        };
    }, [aberto]);

    if (accoes.length === 0) return null;

    return (
        <div ref={caixa} className="relative">
            <button
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                aria-haspopup="menu"
                aria-expanded={aberto}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover active:translate-y-px dark:bg-cyan-500 dark:hover:bg-cyan-600"
            >
                <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                Novo
            </button>
            <AnimatePresence>
                {aberto && (
                    <motion.div
                        role="menu"
                        initial={{ opacity: 0, scale: 0.97, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -6 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 top-[52px] z-50 flex w-[280px] origin-top-right flex-col rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#262C38]"
                    >
                        {accoes.map((accao) => {
                            const Icone = accao.icon;
                            return (
                                <button
                                    key={accao.label}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setAberto(false);
                                        irPara(accao);
                                    }}
                                    className="flex min-h-[46px] items-center gap-3 rounded-[10px] px-2.5 text-left text-sm font-bold text-ink hover:bg-slate-50 dark:text-[#F2F5FB] dark:hover:bg-white/[0.06]"
                                >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#EEF2FA] text-brand dark:bg-[#1E232D] dark:text-cyan-300">
                                        <Icone className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                                    </span>
                                    <span className="flex-1">{accao.label}</span>
                                    {accao.tecla ? (
                                        <kbd className="rounded-md border border-b-2 border-[#DDE2EE] bg-slate-50 px-[7px] py-px font-sans text-xs font-extrabold text-slate-500 dark:border-slate-700 dark:bg-[#1E232D] dark:text-slate-300">
                                            {accao.tecla}
                                        </kbd>
                                    ) : null}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/** Pesquisa do topo: FAT-… vai para Facturas, REC-… para o Caixa, o resto para Clientes. */
function Pesquisa({ pesquisa }) {
    const [texto, setTexto] = useState("");

    const procurar = (evento) => {
        evento.preventDefault();
        const termo = texto.trim();
        if (!termo) return;
        router.get(pesquisa.destino(termo), { search: termo });
    };

    return (
        <form role="search" onSubmit={procurar} className="min-w-0 flex-1 basis-[320px]">
            <label className="flex min-h-[44px] items-center gap-2.5 rounded-md border border-[#DDE2EE] bg-slate-50 px-3.5 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:border-slate-800 dark:bg-[#1E232D]">
                <Search className="h-[18px] w-[18px] shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <input
                    type="search"
                    value={texto}
                    onChange={(evento) => setTexto(evento.target.value)}
                    placeholder={pesquisa.placeholder}
                    aria-label="Procurar"
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-ink placeholder:text-slate-500 focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB] dark:placeholder:text-slate-400"
                />
            </label>
        </form>
    );
}

/**
 * Estrutura partilhada das áreas autenticadas (AdminLayout e DevLayout):
 * menu lateral agrupado pelo ciclo do mês (recolhe para pastilhas; folha no
 * móvel), barra de topo com pesquisa, QR e "+ Novo", e o conteúdo da página.
 */
/** Faixa "Sem ligação": pode consultar o que está no ecrã, mas gravar fica bloqueado. */
function AvisoSemLigacao() {
    const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
    useEffect(() => {
        const mudar = () => setOnline(navigator.onLine);
        window.addEventListener("online", mudar);
        window.addEventListener("offline", mudar);
        return () => {
            window.removeEventListener("online", mudar);
            window.removeEventListener("offline", mudar);
        };
    }, []);
    if (online) return null;
    return (
        <div role="status" className="flex items-center gap-3 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 sm:px-8 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
                <strong>Sem ligação à internet.</strong> Pode consultar o que está no ecrã; gravar fica bloqueado até a ligação voltar.
            </span>
        </div>
    );
}

export default function AppShell({ groups, casa, header, children, accoesNovo = [], pesquisa = null, lerQr = false }) {
    const pagina = usePage();
    const [cabecalho, setCabecalho] = useState(null);
    const [urlCarregamento, setUrlCarregamento] = useState(null);
    const url = pagina.url;
    const mostrarNavbarPainel = url.split(/[?#]/, 1)[0] === "/dashboard";

    useEffect(() => {
        const pararInicio = router.on("start", (evento) => {
            const visita = evento.detail.visit;
            if (visita.method === "get" && visita.showProgress !== false) {
                setUrlCarregamento(visita.url?.toString?.() ?? String(visita.url));
            }
        });
        const pararFim = router.on("finish", () => setUrlCarregamento(null));
        const pararCancelamento = router.on("cancel", () => setUrlCarregamento(null));
        const pararExcepcao = router.on("exception", () => setUrlCarregamento(null));
        return () => {
            pararInicio();
            pararFim();
            pararCancelamento();
            pararExcepcao();
        };
    }, []);
    return (
        <SidebarProvider open={true} onOpenChange={() => {}}>
            <a
                href="#conteudo-principal"
                className="fixed left-4 top-[-4rem] z-[100] rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg transition-[top] focus:top-4"
            >
                Saltar para o conteúdo principal
            </a>
            <FlashToasts />
            <NovidadesModal />
            <MenuLateral groups={groups} casa={casa} />

            <SidebarInset
                id="conteudo-principal"
                tabIndex={-1}
                className="min-w-0 bg-slate-100 text-ink focus-visible:outline-none dark:bg-[#0B0D12] dark:text-slate-100"
            >
                {mostrarNavbarPainel ? (
                    <div className="shell-topo sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-[#DDE2EE] bg-white px-4 py-3 sm:px-8 sm:py-4 dark:border-[#2A3140] dark:bg-[#161A22]">
                        <SidebarTrigger
                            className="size-11 shrink-0 rounded-md border border-[#DDE2EE] dark:border-slate-800 md:hidden"
                            aria-label="Abrir menu"
                        />
                        {pesquisa ? <Pesquisa pesquisa={pesquisa} /> : <div className="flex-1" />}
                        <div className="flex shrink-0 items-center gap-2">
                            {lerQr && (
                                <Link
                                    href="/ler-qr"
                                    aria-label="Ler QR code"
                                    title="Ler QR code"
                                    className="flex h-11 w-11 items-center justify-center rounded-md border border-[#DDE2EE] bg-white text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB] dark:hover:bg-[#262C38]"
                                >
                                    <QrCode className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                                </Link>
                            )}
                            <PageHelp url={url} />
                            <MenuNovo accoes={accoesNovo} />
                        </div>
                    </div>
                ) : (
                    <div className="flex px-4 pt-3 md:hidden">
                        <SidebarTrigger
                            className="size-10 shrink-0 rounded-md border border-[#DDE2EE] bg-white dark:border-[#2A3140] dark:bg-[#161A22]"
                            aria-label="Abrir menu"
                        />
                    </div>
                )}

                <AvisoSemLigacao />

                {/* Título da página (vem de cada página). Escondido enquanto vazio. */}
                <header className="has-[>div:empty]:hidden">
                    <div ref={setCabecalho} className="shell-cabecalho mx-auto max-w-7xl px-4 pb-2 pt-8 sm:px-6 lg:px-8">
                        {urlCarregamento ? <PageLoadingSkeleton url={urlCarregamento} headerOnly /> : header}
                    </div>
                </header>

                <div className="shell-conteudo flex-1 pb-10 pt-8">
                    <CabecalhoContext.Provider value={cabecalho}>
                        {urlCarregamento ? <PageLoadingSkeleton url={urlCarregamento} bodyOnly /> : children}
                    </CabecalhoContext.Provider>
                </div>
            </SidebarInset>
            <AquaGuia />
        </SidebarProvider>
    );
}

/**
 * Corpo comum do AdminLayout/DevLayout. Dentro da shell persistente só leva o
 * cabeçalho para a ranhura da shell; fora dela (página sem `layout` em app.js)
 * monta a shell completa à volta da página, como sempre fez.
 */
export function ConteudoDaPagina({ Shell, header, children }) {
    const cabecalho = useContext(CabecalhoContext);

    if (cabecalho === undefined) {
        return <Shell header={header}>{children}</Shell>;
    }

    return (
        <>
            {cabecalho && header ? createPortal(header, cabecalho) : null}
            {children}
        </>
    );
}
