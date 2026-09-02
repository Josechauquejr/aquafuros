import { Printer, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selector do formato de impressão — A4 (padrão do sistema) ou 58mm
 * (impressora térmica portátil, preto e branco). Nunca aparece impresso.
 */
export default function FormatoImpressaoToggle({ formato, onChange }) {
    return (
        <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 print:hidden">
            <button
                type="button"
                onClick={() => onChange("a4")}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition",
                    formato === "a4"
                        ? "bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white",
                )}
                title="Folha A4 — padrão do sistema"
            >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                A4
            </button>
            <button
                type="button"
                onClick={() => onChange("58mm")}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition",
                    formato === "58mm"
                        ? "bg-cyan-700 text-white dark:bg-cyan-500 dark:text-slate-950"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white",
                )}
                title="Impressora térmica portátil de 58mm (preto e branco)"
            >
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                58mm
            </button>
        </div>
    );
}

/**
 * @page do documento consoante o formato — tem de ser injectado como
 * <style> real (não classes Tailwind), porque @page não é seleccionável
 * por classe. Só um dos dois formatos está presente no DOM de cada vez.
 */
export function EstiloPagina({ formato }) {
    if (formato === "58mm") {
        // Altura fixa generosa (58 × 3) — mais fiável em impressoras/drivers
        // térmicos do que "auto", que nem todos suportam bem.
        return <style>{"@page { size: 58mm 174mm; margin: 4mm 2mm; }"}</style>;
    }

    return <style>{"@page { size: A4; margin: 12mm; }"}</style>;
}
