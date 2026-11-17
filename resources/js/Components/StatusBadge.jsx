import { cn } from "@/lib/utils";

// Etiquetas de estado: sempre cor + texto. Verde = em dia, âmbar = atenção,
// vermelho = risco, azul = informativo (ex.: estimada), cinzento = neutro.
// No escuro: fundo transparente e texto claro.
const tones = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-[rgba(244,163,154,0.14)] dark:text-rose-300",
    cyan: "bg-cyan-100 text-brand dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300",
    slate: "bg-[#ECEFF5] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
};

export default function StatusBadge({ tone = "slate", className = "", children, ...props }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
                tones[tone] ?? tones.slate,
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
