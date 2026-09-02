import { cn } from "@/lib/utils";

const tones = {
    emerald:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function StatusBadge({ tone = "slate", className = "", children }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                tones[tone] ?? tones.slate,
                className,
            )}
        >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
            {children}
        </span>
    );
}
