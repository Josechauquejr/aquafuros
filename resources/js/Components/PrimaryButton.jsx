import { cn } from "@/lib/utils";

/** Acção principal — uma por página (#041A53 no claro, #0059FF no escuro). */
export default function PrimaryButton({ className = "", disabled = false, children, ...props }) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-transparent bg-brand px-5 text-[15px] font-bold text-white transition hover:bg-brand-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-500 dark:text-white dark:hover:bg-cyan-600",
                className,
            )}
        >
            {children}
        </button>
    );
}
