import { Link, useForm, usePage } from "@inertiajs/react";
import {
    Banknote,
    ChevronDown,
    FileText,
    Gauge,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    PieChart,
    SlidersHorizontal,
    User,
    UserCog,
    Users,
    Waves,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import ThemeToggle from "@/Components/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: Gauge },
    { label: "KPIs", href: "/admin/kpis", icon: PieChart },
    { label: "Clientes", href: "/clientes", icon: Users },
    { label: "Leituras", href: "/leituras", icon: Waves },
    { label: "Facturas", href: "/facturas", icon: FileText },
    { label: "Pagamentos", href: "/pagamentos", icon: Banknote },
    { label: "Gestão de Usuários", href: "/users", icon: UserCog },
    { label: "Valores e Regras", href: "/tarifas", icon: SlidersHorizontal },
];

function isActive(href) {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    return href === "/dashboard" ? path === href : path.startsWith(href);
}

function SidebarNav({ collapsed = false, onNavigate, pillLayoutId = "sidebar-active-pill" }) {
    return (
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                    <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Link
                            href={item.href}
                            onClick={onNavigate}
                            title={collapsed ? item.label : undefined}
                            className={cn(
                                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
                                collapsed && "justify-center px-0",
                                active
                                    ? "text-cyan-800 dark:text-cyan-200"
                                    : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                            )}
                        >
                            {active ? (
                                <motion.span
                                    layoutId={pillLayoutId}
                                    className="absolute inset-0 rounded-md bg-cyan-50 dark:bg-cyan-950/50"
                                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                                />
                            ) : (
                                <span className="absolute inset-0 rounded-md opacity-0 transition group-hover:bg-slate-100 group-hover:opacity-100 dark:group-hover:bg-slate-800" />
                            )}
                            <Icon
                                className={cn(
                                    "relative h-5 w-5 shrink-0",
                                    active
                                        ? "text-cyan-700 dark:text-cyan-300"
                                        : "text-slate-400 dark:text-slate-500",
                                )}
                                aria-hidden="true"
                            />
                            {!collapsed && <span className="relative">{item.label}</span>}
                        </Link>
                    </motion.div>
                );
            })}
        </nav>
    );
}

export default function AdminLayout({ header, children }) {
    const { auth } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem("aquafuros-sidebar-collapsed") === "1";
        } catch {
            return false;
        }
    });
    const logout = useForm({});

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("aquafuros-sidebar-collapsed", next ? "1" : "0");
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
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
            <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85"
            >
                <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen((open) => !open)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
                            aria-label="Alternar menu"
                        >
                            {sidebarOpen ? (
                                <X className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <Menu className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={toggleCollapsed}
                            className="hidden h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white lg:inline-flex"
                            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
                            title={collapsed ? "Expandir menu" : "Recolher menu"}
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                            ) : (
                                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
                            )}
                        </button>

                        <Link href="/dashboard" className="flex items-center gap-3">
                            <ApplicationLogo className="h-9 w-9 text-sm" />
                            <span className="hidden text-sm font-bold text-slate-900 dark:text-white sm:block">
                                Aquafuros
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setAccountOpen((open) => !open)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-4 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
                                        className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900"
                                    >
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <User className="h-4 w-4" aria-hidden="true" />
                                            Perfil
                                        </Link>
                                        <form onSubmit={submitLogout}>
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
                    </div>
                </div>
            </motion.nav>

            <div className="flex flex-1">
                <aside
                    className={cn(
                        "hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col",
                        collapsed ? "lg:w-20" : "lg:w-72",
                    )}
                >
                    <SidebarNav collapsed={collapsed} pillLayoutId="sidebar-active-pill-desktop" />
                    {!collapsed && (
                        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                Aquafuros &middot; Gestão de furos de água
                            </p>
                            <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-600">
                                Desenvolvido pela RJM Consultórios e Serviços
                                <br />
                                José Zeferino Chaúque Júnior
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
                                className="absolute inset-0 bg-slate-950/50"
                                onClick={() => setSidebarOpen(false)}
                                aria-hidden="true"
                            />
                            <motion.aside
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute inset-y-0 left-0 flex w-80 flex-col border-r border-slate-200 bg-white pt-16 dark:border-slate-800 dark:bg-slate-950"
                            >
                                <SidebarNav onNavigate={() => setSidebarOpen(false)} pillLayoutId="sidebar-active-pill-mobile" />
                            </motion.aside>
                        </div>
                    )}
                </AnimatePresence>

                <div className="flex min-w-0 flex-1 flex-col">
                    {header && (
                        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
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
