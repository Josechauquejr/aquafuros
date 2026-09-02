import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function AnimatedPanel({ className = "", delay = 0, children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20",
                className,
            )}
        >
            {children}
        </motion.div>
    );
}
