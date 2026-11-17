import { cn } from "@/lib/utils";

/** Acção perigosa (apagar, anular) — vermelho de risco #B42318. */
export default function DangerButton({ className = "", disabled = false, children, ...props }) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={cn(
                "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-transparent bg-rose-600 px-5 text-[15px] font-bold text-white transition hover:bg-rose-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500",
                className,
            )}
        >
            {children}
        </button>
    );
}
