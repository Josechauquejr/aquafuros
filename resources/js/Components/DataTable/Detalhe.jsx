import { cn } from "@/lib/utils";

/** Grelha de campos "rótulo / valor" do cartão expandido de uma linha. */
export function Campos({ children, className }) {
    return <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>{children}</dl>;
}

export function Campo({ rotulo, children, className, largo = false }) {
    return (
        <div className={cn("min-w-0", largo && "sm:col-span-2", className)}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
            <dd className="mt-0.5 break-words font-medium text-foreground">{children ?? "—"}</dd>
        </div>
    );
}

/** Bloco com título (ex.: "Histórico de pagamentos") dentro do cartão expandido. */
export function SeccaoDetalhe({ titulo, icone: Icone, children, className }) {
    return (
        <section className={cn("mt-6 space-y-2", className)}>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {Icone && <Icone className="h-4 w-4 text-primary" aria-hidden="true" />}
                {titulo}
            </h4>
            {children}
        </section>
    );
}
