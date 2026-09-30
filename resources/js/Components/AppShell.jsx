import { Link, useForm, usePage } from "@inertiajs/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
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
import Breadcrumbs from "@/Components/Breadcrumbs";
import ThemeToggle from "@/Components/ThemeToggle";

function activo(url, href) {
    const caminho = url.split("?")[0];
    return href === "/dashboard" || href === "/dev/painel" ? caminho === href : caminho.startsWith(href);
}

function ItemMenu({ item, url }) {
    const { setOpenMobile } = useSidebar();
    const Icone = item.icon;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={activo(url, item.href)} tooltip={item.label}>
                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                    <Icone aria-hidden="true" />
                    <span>{item.label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function MenuLateral({ groups, casa, empresa }) {
    const { url } = usePage();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <Link href={casa} className="flex items-center gap-3 px-1 py-1">
                    <ApplicationLogo className="h-8 w-8 shrink-0 text-sm" />
                    <span className="truncate text-sm font-bold group-data-[collapsible=icon]:hidden">
                        {empresa?.nome ?? "Aquafuros"}
                    </span>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {groups.map((grupo) => (
                    <SidebarGroup key={grupo.categoria}>
                        <SidebarGroupLabel>{grupo.categoria}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {grupo.items.map((item) => (
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
            <MenuLateral groups={groups} casa={casa} empresa={empresa} />

            <SidebarInset className="min-w-0 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
                <div className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <SidebarTrigger className="size-9 shrink-0" aria-label="Alternar menu lateral" />
                        <Breadcrumbs casa={casa} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <ThemeToggle />
                        <MenuConta nome={auth?.user?.name} />
                    </div>
                </div>

                {header && (
                    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                        <div className="px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                    </header>
                )}

                <div className="flex-1">
                    <motion.div
                        key={url.split("?")[0]}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {children}
                    </motion.div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
