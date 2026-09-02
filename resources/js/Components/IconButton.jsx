import { Link } from "@inertiajs/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const tones = {
    default: "text-slate-500 hover:bg-slate-100 hover:text-cyan-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-300",
    danger: "text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400",
    success: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400",
};

/**
 * Botão de ícone com micro-interacção (usado nas acções das tabelas em
 * toda a app) — hover/tap animados via motion, em vez de um <button> estático.
 */
export default function IconButton({ as, tone = "default", className = "", children, ...props }) {
    const Component = motion.create(as ?? "button");

    return (
        <Component
            type={as ? undefined : "button"}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30",
                tones[tone],
                className,
            )}
            {...props}
        >
            {children}
        </Component>
    );
}

export function IconLink(props) {
    return <IconButton as={Link} {...props} />;
}
