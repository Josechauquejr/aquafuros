import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const variants = {
    primary:
        "border-transparent bg-cyan-700 text-white shadow-sm shadow-cyan-900/10 hover:bg-cyan-800 focus:ring-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400",
    secondary:
        "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    ghost:
        "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:ring-cyan-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
};

export default function AnimatedButton({
    as = "button",
    variant = "primary",
    className = "",
    children,
    ...props
}) {
    const Component = motion.create(as);

    return (
        <Component
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:pointer-events-none disabled:opacity-60 dark:focus:ring-offset-slate-950",
                variants[variant],
                className,
            )}
            {...props}
        >
            {children}
        </Component>
    );
}
