import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ExpandableCard({ title, description, icon: Icon, children, defaultOpen = true, className = "" }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900", className)}>
            <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="flex min-w-0 items-center gap-3">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
                    <span className="min-w-0">
                        <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
                        {description && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
                    </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open && <div className="border-t border-slate-200 dark:border-slate-800">{children}</div>}
        </section>
    );
}
