import { usePage } from "@inertiajs/react";
import { cn } from "@/lib/utils";

/** Logótipo: gota branca num quadrado azul-marinho (ou o logótipo da empresa). */
export default function MarcaAquafuros({ className = "" }) {
    const { empresa } = usePage().props;

    if (empresa?.logotipoUrl) {
        return (
            <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white", className)}>
                <img src={empresa.logotipoUrl} alt="" className="h-full w-full object-contain" />
            </span>
        );
    }

    return (
        <svg viewBox="0 0 56 56" aria-hidden="true" className={cn("shrink-0", className)}>
            <rect width="56" height="56" rx="16" fill="#041A53" />
            <path d="M28 12s11 11.5 11 20a11 11 0 0 1-22 0c0-8.5 11-20 11-20z" fill="#F1F5FB" />
            <path d="M22 34a6 6 0 0 0 6 6" stroke="#041A53" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
    );
}

