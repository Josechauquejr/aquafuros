import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export default function AnimatedPanel({ className = "", delay = 0, children, ...props }) {
    return (
        <motion.div
            {...props}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
                className,
            )}
        >
            {children}
        </motion.div>
    );
}
