import { Link, router, useForm, usePage } from "@inertiajs/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import PageHelp from "@/Components/PageHelp";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
    useSidebar,
} from "@/Components/animate-ui/components/radix/sidebar";
import ApplicationLogo from "@/Components/ApplicationLogo";
import BranchedMenu from "@/Components/BranchedMenu";
import Breadcrumbs from "@/Components/Breadcrumbs";
import FlashToasts from "@/Components/FlashToasts";
import NovidadesModal from "@/Components/NovidadesModal";
import ThemeToggle from "@/Components/ThemeToggle";
import { cn } from "@/lib/utils";

function activo(url, href) {
    const caminho = url.split("?")[0];
    return href === "/dashboard" || href === "/dev/painel" ? caminho === href : caminho.startsWith(href);
}

/**
 * Quando a shell é persistente (ver `layout` em app.js), as páginas continuam a
 * escrever `<AdminLayout header={...}>`: o cabeçalho vai por portal para este
 * elemento. `undefined` = não há shell persistente (o layout monta a sua própria).
 */
export const CabecalhoContext = createContext(undefined);

function ItemMenu({ item, url }) {
    const { setOpenMobile } = useSidebar();
    const Icone = item.icon;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={activo(url, item.href)} tooltip={item.label}>
                <Link href={item.href} prefetch="hover" cacheFor={15000} onClick={() => setOpenMobile(false)}>
                    <Icone aria-hidden="true" />
                    <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// Todas as páginas de uma categoria, com ou sem subcategorias.
// Categoria simples: { categoria, items }. Com subcategorias: { categoria, subgrupos: [{ nome, items }] }.
const itensDoGrupo = (grupo) => grupo.subgrupos?.flatMap((sub) => sub.items) ?? grupo.items ?? [];

const folha = (item) => ({ value: item.href, label: item.label, icon: <item.icon aria-hidden="true" className="h-4 w-4" /> });

// A página mais específica ganha (ex.: /dev/logs/acessos antes de /dev).
function paginaActiva(groups, url) {
    return (
        groups
            .flatMap(itensDoGrupo)
            .map((item) => item.href)
            .filter((href) => activo(url, href))
            .sort((a, b) => b.length - a.length)[0] ?? ""
    );
}

const estiloArvore = {
    color: "hsl(var(--sidebar-foreground))",
    accentColor: "hsl(var(--sidebar-primary))",
    lineColor: "hsl(var(--sidebar-border))",
    width: 260,
    className: "px-1",
};

// Categoria com subcategorias: o título recolhe/expande, e cada subcategoria é
// um ramo (BranchedMenu) cujas folhas são as páginas.
function CategoriaComSubgrupos({ grupo, activa, aberta, alternar }) {
    const items = grupo.subgrupos.map((sub) => ({ label: sub.nome, children: sub.items.map(folha) }));

    return (
        <div>
            <button
                type="button"
                onClick={alternar}
                aria-expanded={aberta}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
                {grupo.categoria}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", !aberta && "-rotate-90")} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
                {aberta && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <BranchedMenu
                            items={items}
                            defaultOpen={items.map((_, indice) => indice)}
                            defaultActive={activa}
                            onSelect={(valor) => router.visit(valor)}
                            {...estiloArvore}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Menu em árvore (BranchedMenu). Categorias simples: cada categoria é um ramo e
// cada página uma folha. Com subcategorias (Desenvolvedor): título da categoria +
// um ramo por subcategoria. O valor de cada folha é o seu href.
function MenuArvore({ groups, url, chave }) {
    const activa = paginaActiva(groups, url);
    const categoriaActiva = groups.find((grupo) => itensDoGrupo(grupo).some((item) => item.href === activa))?.categoria;

    // Categorias abertas: a da página actual abre sempre; as outras lembram-se do que o utilizador fez.
    const [abertas, setAbertas] = useState(() => {
        let guardadas = [];
        try {
            guardadas = JSON.parse(localStorage.getItem(`${chave}-categorias`) ?? "[]");
        } catch {
            // sem armazenamento: só abre a actual
        }
        return new Set([...guardadas, categoriaActiva].filter(Boolean));
    });
    const alternar = (categoria) =>
        setAbertas((anterior) => {
            const seguinte = new Set(anterior);
            seguinte.has(categoria) ? seguinte.delete(categoria) : seguinte.add(categoria);
            try {
                localStorage.setItem(`${chave}-categorias`, JSON.stringify([...seguinte]));
            } catch {
                // preferência não guardada: não é grave
            }
            return seguinte;
        });

    // Sem subcategorias (Administrador, Gestor, Caixa, Técnico): cada categoria é um
    // ramo e cada página uma folha, tudo num só menu.
    if (!groups.some((grupo) => grupo.subgrupos)) {
        const items = groups.map((grupo) => ({ label: grupo.categoria, children: itensDoGrupo(grupo).map(folha) }));

        return (
            <BranchedMenu
                items={items}
                defaultOpen={groups.map((_, indice) => indice)}
                defaultActive={activa}
                onSelect={(valor) => router.visit(valor)}
                {...estiloArvore}
            />
        );
    }

    return (
        <div className="space-y-1">
            {groups.map((grupo) =>
                grupo.subgrupos ? (
                    <CategoriaComSubgrupos
                        key={grupo.categoria}
                        grupo={grupo}
                        activa={activa}
                        aberta={abertas.has(grupo.categoria)}
                        alternar={() => alternar(grupo.categoria)}
                    />
                ) : (
                    <BranchedMenu
                        key={grupo.categoria}
                        items={[{ label: grupo.categoria, children: grupo.items.map(folha) }]}
                        defaultOpen={[0]}
                        defaultActive={activa}
                        onSelect={(valor) => router.visit(valor)}
                        {...estiloArvore}
                    />
                ),
            )}
        </div>
    );
}

function MenuLateral({ groups, casa, empresa, chave }) {
    const { url } = usePage();

    return (
        <Sidebar collapsible="icon" animateOnHover={false}>
            <SidebarHeader>
                <Link href={casa} className="flex items-center gap-3 px-1 py-1">
                    <ApplicationLogo className="h-8 w-8 shrink-0 text-sm" />
                        <span className="max-w-[13rem] break-words text-sm font-bold leading-tight group-data-[collapsible=icon]:hidden">
                        {empresa?.nome ?? "Aquafuros"}
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {/* Sidebar aberta: menu em árvore. Recolhida (só ícones): os botões
                    com tooltip de sempre (com pré-carregamento), que a árvore não mostra. */}
                <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
                    <MenuArvore groups={groups} url={url} chave={chave} />
                </div>
                {groups.map((grupo) => (
                    <SidebarGroup key={grupo.categoria} className="hidden group-data-[collapsible=icon]:block">
                        <SidebarGroupLabel>{grupo.categoria}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {itensDoGrupo(grupo).map((item) => (
                                    <ItemMenu key={item.href} item={item} url={url} />
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="group-data-[collapsible=icon]:hidden">
                <p className="text-xs font-medium text-muted-foreground">
                    {empresa?.nome ?? "Aquafuros"} &middot; Gestão de furos de água
                </p>
                <p className="text-[11px] leading-snug text-muted-foreground/70">
                    Desenvolvido pela RJM Consultórios e Serviços
                    <br />
                    José Zeferino Chaúque Júnior
                </p>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}

function MenuConta({ nome }) {
    const [aberto, setAberto] = useState(false);
    const logout = useForm({});

    const terminarSessao = (evento) => {
        evento.preventDefault();
        logout.post("/logout");
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-haspopup="menu"
                aria-expanded={aberto}
            >
                <User className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{nome}</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            <AnimatePresence>
                {aberto && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -6 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <User className="h-4 w-4" aria-hidden="true" />
                            Perfil
                        </Link>
                        <form onSubmit={terminarSessao}>
                            <button
                                type="submit"
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                Sair
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Estrutura partilhada das áreas autenticadas (AdminLayout e DevLayout):
 * sidebar do Animate UI (recolhe para ícones; folha no móvel), barra de topo
 * com breadcrumbs, tema e conta, e o conteúdo da página.
 */
export default function AppShell({ groups, casa, chaveRecolhido, header, children }) {
    const pagina = usePage();
    const [cabecalho, setCabecalho] = useState(null);
    const { auth, empresa } = pagina.props;
    const url = pagina.url;
    const [aberta, setAberta] = useState(() => {
        try {
            return localStorage.getItem(chaveRecolhido) !== "1";
        } catch {
            return true;
        }
    });

    const alterar = (valor) => {
        setAberta(valor);
        try {
            localStorage.setItem(chaveRecolhido, valor ? "0" : "1");
        } catch {
            // ignora falha ao persistir a preferência
        }
    };

    return (
        <SidebarProvider open={aberta} onOpenChange={alterar}>
            <FlashToasts />
            <NovidadesModal />
            <MenuLateral groups={groups} casa={casa} empresa={empresa} chave={chaveRecolhido} />

            <SidebarInset className="min-w-0 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
                <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <SidebarTrigger className="size-9 shrink-0" aria-label="Alternar menu lateral" />
                        <Breadcrumbs casa={casa} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <PageHelp url={url} />
                        <ThemeToggle />
                        <MenuConta nome={auth?.user?.name} />
                    </div>
                </div>

                {/* Escondido enquanto vazio: páginas sem cabeçalho não ganham uma faixa. */}
                <header className="border-b border-slate-200 bg-white has-[>div:empty]:hidden dark:border-slate-800 dark:bg-slate-950">
                    <div ref={setCabecalho} className="px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>

                <div className="flex-1">
                    <motion.div
                        key={url.split("?")[0]}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <CabecalhoContext.Provider value={cabecalho}>{children}</CabecalhoContext.Provider>
                    </motion.div>
                </div>
            </SidebarInset>
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
