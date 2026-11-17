import { cn } from "@/lib/utils";

/** Acção secundária: contorno neutro. */
export default function SecondaryButton({ className = "", children, ...props }) {
    return (
        <button
            {...props}
            className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-semibold text-ink transition hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-[#1E232D]",
                className,
            )}
        >
            {children}
        </button>
    );
}
