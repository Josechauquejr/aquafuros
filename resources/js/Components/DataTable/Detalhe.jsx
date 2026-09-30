import { AlertTriangle, CheckCircle2, ChevronDown, CircleSlash, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Peças do cartão expandido de uma linha. Mostra primeiro o essencial, em
 * letra grande (Destaques + Campos) e guarda o resto em "Mais detalhes".
 */

/** Números grandes no topo: ex.: Total, Já pago, Em falta. */
export function Destaques({ children, className }) {
    return <div className={cn("grid gap-3 sm:grid-cols-2", className)}>{children}</div>;
}

const tonsDestaque = {
    neutro: "border-border bg-muted/40",
    primario: "border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/30",
    perigo: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
    sucesso: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
};

export function Destaque({ rotulo, tom = "neutro", children, sub }) {
    return (
        <div className={cn("rounded-xl border p-4", tonsDestaque[tom])}>
            <p className="text-sm font-medium text-muted-foreground">{rotulo}</p>
            <p className="mt-1 break-words text-2xl font-bold text-foreground">{children}</p>
            {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
        </div>
    );
}

/** Grelha de campos "rótulo / valor". */
export function Campos({ children, className }) {
    return <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>{children}</dl>;
}

export function Campo({ rotulo, children, className, largo = false }) {
    return (
        <div className={cn("min-w-0", largo && "sm:col-span-2", className)}>
            <dt className="text-sm text-muted-foreground">{rotulo}</dt>
            <dd className="mt-0.5 break-words text-base font-medium text-foreground">{children ?? "—"}</dd>
        </div>
    );
}

/** Bloco com título (ex.: "Facturas por pagar") dentro do cartão expandido. */
export function SeccaoDetalhe({ titulo, icone: Icone, children, className }) {
    return (
        <section className={cn("mt-6 space-y-3", className)}>
            <h4 className="flex items-center gap-2 text-base font-semibold text-foreground">
                {Icone && <Icone className="h-4 w-4 text-primary" aria-hidden="true" />}
                {titulo}
            </h4>
            {children}
        </section>
    );
}

/** Dados secundários, recolhidos por omissão. */
export function MaisDetalhes({ titulo = "Mais detalhes", children, className }) {
    return (
        <details className={cn("group mt-6 rounded-xl border border-border", className)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {titulo}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-border p-4">{children}</div>
        </details>
    );
}

const tonsExplicacao = {
    info: { classes: "border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100", icone: Info },
    aviso: { classes: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100", icone: Clock },
    perigo: { classes: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100", icone: AlertTriangle },
    sucesso: { classes: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100", icone: CheckCircle2 },
    neutro: { classes: "border-border bg-muted/50 text-foreground", icone: CircleSlash },
};

/** Explicação em linguagem simples (ex.: o que significa o estado de uma factura). */
export function Explicacao({ tom = "info", titulo, children, className }) {
    const { classes, icone: Icone } = tonsExplicacao[tom] ?? tonsExplicacao.info;

    return (
        <div className={cn("flex gap-3 rounded-xl border p-4", classes, className)} role="note">
            <Icone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 text-sm leading-relaxed">
                {titulo && <p className="font-semibold">{titulo}</p>}
                <div className={titulo ? "mt-0.5" : ""}>{children}</div>
            </div>
        </div>
    );
}
