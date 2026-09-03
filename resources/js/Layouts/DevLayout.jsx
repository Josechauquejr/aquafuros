import { Link, useForm, usePage } from "@inertiajs/react";
import {
    ChevronDown,
    ClipboardList,
    Gauge,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    ScrollText,
    SlidersHorizontal,
    Terminal,
    User,
    UserCog,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import SidebarNav from "@/Components/SidebarNav";
import { cn } from "@/lib/utils";

// Área exclusiva do Desenvolvedor — sidebar totalmente separada da do
// AdminLayout (nenhum item partilhado), reflectindo o isolamento também
// aplicado nas rotas: o developer não vê nem acede às páginas do
// administrador/gestor/caixa/técnico, e vice-versa.
const navGroups = [
    {
        categoria: "Geral",
        items: [{ label: "Página Principal", href: "/dev/painel", icon: Gauge }],
    },
    {
        categoria: "Sistema",
        items: [
            { label: "Gestão de Usuários", href: "/dev/users", icon: UserCog },
            { label: "Configurações do Sistema", href: "/dev/configuracoes", icon: SlidersHorizontal },
            { label: "Registo de Actividade", href: "/dev/actividade", icon: ScrollText },
            { label: "Logs Técnicos", href: "/dev/logs/acessos", icon: Terminal },
        ],
    },
    {
        categoria: "Produtividade",
        items: [{ label: "Checklist", href: "/dev/tarefas", icon: ClipboardList }],
    },
];

export default function DevLayout({ header, children }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("aquafuros-dev-sidebar-collapsed") === "1";
        } catch {
            return false;
        }
    });
    const logout = useForm({});

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("aquafuros-dev-sidebar-collapsed", next ? "1" : "0");
            } catch {
                // ignora falha ao persistir preferência
            }
            return next;
        });
    };

    const submitLogout = (event) => {
        event.preventDefault();
        logout.post("/logout");
    };

    const { url } = usePage();

    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur"
            >
                <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen((open) => !open)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 lg:hidden"
                            aria-label="Alternar menu"
                        >
                            {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="hidden h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 lg:inline-flex"
                            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                            title={collapsed ? "Expandir menu" : "Recolher menu"}
                        >
                            {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <Link href="/dev/painel" className="flex items-center gap-3">
                            <ApplicationLogo className="h-9 w-9 text-sm" />
                            <span className="hidden text-sm font-bold text-white sm:flex sm:items-center sm:gap-1.5">
                                Aquafuros
                                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                                    Dev
                                </span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setAccountOpen((open) => !open)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium leading-4 text-slate-300 shadow-sm transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <User className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">{auth.user?.name}</span>
                                <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </button>

                            <AnimatePresence>
                                {accountOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96, y: -6 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                        className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg shadow-black/30"
                                    >
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                                        >
                                            <User className="h-4 w-4" aria-hidden="true" />
                                            Perfil
                                        </Link>
                                        <form onSubmit={submitLogout}>
                                            <button
                                                type="submit"
                                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                                            >
                                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                                Sair
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </motion.nav>

            <div className="flex flex-1">
                <aside
                    className={cn(
                        "hidden shrink-0 border-r border-slate-800 bg-slate-950 transition-[width] duration-200 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col",
                        collapsed ? "lg:w-20" : "lg:w-72",
                    )}
                >
                    <SidebarNav groups={navGroups} collapsed={collapsed} pillLayoutId="dev-sidebar-active-pill-desktop" />
                    {!collapsed && (
                        <div className="border-t border-slate-800 p-4">
                            <p className="text-xs font-medium text-slate-500">Aquafuros &middot; Área do Desenvolvedor</p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-600">
                                Configuração técnica do sistema — separada das áreas operacionais.
                            </p>
                        </div>
                    )}
                </aside>

                <AnimatePresence>
                    {sidebarOpen && (
                        <div className="fixed inset-0 z-30 lg:hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-black/60"
                                onClick={() => setSidebarOpen(false)}
                                aria-hidden="true"
                            />
                            <motion.aside
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute inset-y-0 left-0 flex w-80 flex-col border-r border-slate-800 bg-slate-950 pt-16"
                            >
                                <SidebarNav groups={navGroups} onNavigate={() => setSidebarOpen(false)} pillLayoutId="dev-sidebar-active-pill-mobile" />
                            </motion.aside>
                        </div>
                    )}
                </AnimatePresence>

                <div className="flex min-w-0 flex-1 flex-col">
                    {header && (
                        <header className="border-b border-slate-800 bg-slate-950">
                            <div className="px-4 py-6 sm:px-6 lg:px-8">{header}</div>
                        </header>
                    )}

                    <main className="flex-1">
                        <motion.div
                            key={url}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </main>
                </div>
            </div>
        </div>
    );
}
