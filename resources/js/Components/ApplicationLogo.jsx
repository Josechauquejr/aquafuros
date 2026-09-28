import { usePage } from "@inertiajs/react";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ApplicationLogo({ className = "" }) {
    const { empresa } = usePage().props;

    return (
        <div
            className={cn(
                "flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-cyan-700 text-white shadow-sm shadow-cyan-950/20 dark:bg-cyan-500 dark:text-slate-950",
                className,
            )}
            aria-label={empresa?.nome ?? "Aquafuros"}
        >
            {empresa?.logotipoUrl ? (
                <img src={empresa.logotipoUrl} alt={empresa.nome} className="h-full w-full object-contain" />
            ) : (
                <Droplets className="h-6 w-6" aria-hidden="true" />
            )}
        </div>
    );
}
