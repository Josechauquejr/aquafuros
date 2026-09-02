import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ApplicationLogo({ className = "" }) {
    return (
        <div
            className={cn(
                "flex h-12 w-12 items-center justify-center rounded-md bg-cyan-700 text-white shadow-sm shadow-cyan-950/20 dark:bg-cyan-500 dark:text-slate-950",
                className,
            )}
            aria-label="Aquafuros"
        >
            <Droplets className="h-6 w-6" aria-hidden="true" />
        </div>
    );
}
