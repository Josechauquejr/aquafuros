import { Link, useForm, usePage } from "@inertiajs/react";
import { ChevronDown, Gauge, LogOut, Menu, User, X } from "lucide-react";
import { useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import ThemeToggle from "@/Components/ThemeToggle";
import { cn } from "@/lib/utils";

function NavLink({ href, active, icon: Icon, children }) {
    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center gap-2 border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition",
                active
                    ? "border-cyan-600 text-slate-950 dark:border-cyan-400 dark:text-white"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100",
            )}
        >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {children}
        </Link>
    );
}

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const logout = useForm({});

    const submitLogout = (event) => {
        event.preventDefault();
        logout.post("/logout");
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
            <nav className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/dashboard" className="flex items-center gap-3">
                                    <ApplicationLogo className="h-9 w-9 text-sm" />
                                    <span className="hidden text-sm font-bold text-slate-900 dark:text-white sm:block">
                                        Aquafuros
                                    </span>
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href="/dashboard"
                                    active={window.location.pathname === "/dashboard"}
                                    icon={Gauge}
                                >
                                    Dashboard
                                </NavLink>
                            </div>
                        </div>

                        <div className="hidden gap-3 sm:ms-6 sm:flex sm:items-center">
                            <ThemeToggle />

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setAccountOpen((open) => !open)}
                                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-4 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                                >
                                    <User className="h-4 w-4" aria-hidden="true" />
                                    <span>{auth.user?.name}</span>
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </button>

                                {accountOpen && (
                                    <div className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900">
                                        <Link
                                            href="/profile"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            <User className="h-4 w-4" aria-hidden="true" />
                                            Profile
                                        </Link>
                                        <form onSubmit={submitLogout}>
                                            <button
                                                type="submit"
                                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                                            >
                                                <LogOut className="h-4 w-4" aria-hidden="true" />
                                                Log Out
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:bg-slate-100 focus:text-slate-700 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                aria-label="Abrir menu"
                            >
                                {menuOpen ? (
                                    <X className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Menu className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {menuOpen && (
                    <div className="sm:hidden">
                        <div className="space-y-1 pb-3 pt-2">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 border-l-4 border-cyan-600 bg-cyan-50 py-2 pe-4 ps-3 text-base font-medium text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950/50 dark:text-cyan-200"
                            >
                                <Gauge className="h-4 w-4" aria-hidden="true" />
                                Dashboard
                            </Link>
                        </div>

                        <div className="border-t border-slate-200 pb-1 pt-4 dark:border-slate-800">
                            <div className="px-4">
                                <div className="text-base font-medium text-slate-800 dark:text-slate-100">
                                    {auth.user?.name}
                                </div>
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {auth.user?.email}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <div className="px-4 pb-2">
                                    <ThemeToggle />
                                </div>
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 px-4 py-2 text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                    <User className="h-4 w-4" aria-hidden="true" />
                                    Profile
                                </Link>
                                <form onSubmit={submitLogout}>
                                    <button
                                        type="submit"
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-base font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                    >
                                        <LogOut className="h-4 w-4" aria-hidden="true" />
                                        Log Out
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {header && (
                <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
