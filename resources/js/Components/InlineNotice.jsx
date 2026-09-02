import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
    success: {
        wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
        icon: CheckCircle2,
    },
    error: {
        wrapper: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
        icon: AlertTriangle,
    },
    info: {
        wrapper: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200",
        icon: Info,
    },
};

export default function InlineNotice({ show, tone = "success", children }) {
    if (!show) return null;

    const { wrapper, icon: Icon } = tones[tone] ?? tones.success;

    return (
        <div className={cn("flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium", wrapper)}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {children}
        </div>
    );
}
