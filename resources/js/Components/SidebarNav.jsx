import { Link } from "@inertiajs/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function isActive(href) {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    return href === "/dashboard" ? path === href : path.startsWith(href);
}

/**
 * Sidebar agrupada por categorias — cada grupo tem um cabeçalho discreto
 * (escondido quando a sidebar está recolhida) e a mesma "pílula" deslizante
 * a marcar o link activo. Usado pelo AdminLayout e pelo DevLayout, cada um
 * com o seu próprio conjunto de `groups` — mantém os dois totalmente
 * separados visualmente sem duplicar a lógica de renderização.
 */
export default function SidebarNav({ groups, collapsed = false, onNavigate, pillLayoutId = "sidebar-active-pill" }) {
    let indiceGlobal = 0;

    return (
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
            {groups.map((grupo) => (
                <div key={grupo.categoria}>
                    {!collapsed && (
                        <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                            {grupo.categoria}
                        </p>
                    )}
                    <div className="space-y-1">
                        {grupo.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            const index = indiceGlobal++;

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
                                                active ? "text-cyan-700 dark:text-cyan-300" : "text-slate-400 dark:text-slate-500",
                                            )}
                                            aria-hidden="true"
                                        />
                                        {!collapsed && <span className="relative">{item.label}</span>}
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
