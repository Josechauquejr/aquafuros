import { Skeleton } from "@/Components/ui/skeleton";

function CabecalhoSkeleton({ lista }) {
    return (
        <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-end justify-between gap-4 px-4 pb-2 pt-8 sm:px-6 lg:px-8" aria-hidden="true">
            <div className="flex min-w-0 flex-col gap-2">
                {lista && <Skeleton className="h-3.5 w-36" />}
                <Skeleton className="h-9 w-56 max-w-[70vw] rounded-lg" />
                <Skeleton className="h-4 w-72 max-w-[80vw]" />
            </div>
            {lista && <Skeleton className="h-10 w-32 rounded-md" />}
        </div>
    );
}

function TabelaSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-[22px] px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-[18px] py-3.5 dark:border-slate-800">
                    <Skeleton className="h-10 w-full max-w-[360px] rounded-md" />
                    <div className="flex gap-2"><Skeleton className="h-10 w-24 rounded-md" /><Skeleton className="h-10 w-28 rounded-md" /></div>
                </div>
                <div className="hidden overflow-hidden md:block">
                    <div className="grid h-[43px] grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr_44px] items-center gap-5 border-b border-slate-100 bg-slate-50 px-5 dark:border-slate-800 dark:bg-white/[0.02]">
                        {["w-28", "w-20", "w-20", "w-24", "w-16", "w-5"].map((width, i) => <Skeleton key={i} className={`h-3 ${width}`} />)}
                    </div>
                    {Array.from({ length: 15 }, (_, row) => (
                        <div key={row} className="grid min-h-[72px] grid-cols-[minmax(180px,2fr)_1fr_1fr_1fr_1fr_44px] items-center gap-5 border-b border-slate-100 px-5 last:border-b-0 dark:border-slate-800">
                            <div className="space-y-2"><Skeleton className="h-3.5 w-40 max-w-full" /><Skeleton className="h-3 w-24" /></div>
                            <Skeleton className="h-3.5 w-24 max-w-full" />
                            <Skeleton className="h-3.5 w-20" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-7 w-7 rounded-md" />
                        </div>
                    ))}
                    <div className="flex h-[53px] items-center justify-between border-t border-slate-100 px-5 dark:border-slate-800"><Skeleton className="h-3 w-32" /><Skeleton className="h-8 w-32 rounded-md" /></div>
                </div>
                <div className="space-y-3 bg-slate-50 p-3 md:hidden dark:bg-white/[0.02]">
                    {Array.from({ length: 15 }, (_, row) => <div key={row} className="min-h-[100px] space-y-3 rounded-[14px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-28" /><div className="flex flex-wrap justify-between gap-2"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div></div>)}
                </div>
            </div>
        </div>
    );
}

function PainelSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <section className="flex min-h-[118px] flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="space-y-3"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-80 max-w-[70vw]" /></div><Skeleton className="h-12 w-48 rounded-md" /></section>
            <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6 flex justify-between"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-24" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="flex min-h-[126px] flex-col gap-3 rounded-[14px] border border-slate-200 p-4 dark:border-slate-800"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>)}</div></section>
            <div className="flex flex-wrap items-stretch gap-6"><section className="min-h-[310px] min-w-0 flex-[3_1_420px] rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="mb-6 h-6 w-52" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex min-h-[56px] items-center gap-3 border-t border-slate-100 dark:border-slate-800"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</section><section className="min-h-[310px] min-w-0 flex-[2_1_300px] space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="h-6 w-40" /><Skeleton className="h-3.5 w-48" /><Skeleton className="h-9 w-56" /><div className="space-y-4 rounded-md bg-slate-50 p-4 dark:bg-[#1E232D]"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-2 w-full rounded-full" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-12 w-full" /></section></div>
        </div>
    );
}

function FichaSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8" aria-hidden="true">
            <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="mb-5 h-5 w-40" /><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-5 w-40 max-w-full" /></div>)}</div></section>
            <div className="grid gap-5 lg:grid-cols-2"><section className="min-h-56 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="mb-5 h-5 w-44" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex h-12 items-center justify-between border-t border-slate-100 dark:border-slate-800"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-20" /></div>)}</section><section className="min-h-56 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Skeleton className="mb-5 h-5 w-36" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex h-12 items-center gap-3 border-t border-slate-100 dark:border-slate-800"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}</section></div>
        </div>
    );
}

export default function PageLoadingSkeleton({ url, headerOnly = false, bodyOnly = false }) {
    const caminho = (url ?? "").split("?")[0];
    const lista = ["/clientes", "/leituras", "/facturas", "/pagamentos", "/cobranca", "/ocorrencias", "/producao", "/zonas", "/tarifas", "/lixeira", "/emails", "/notificacoes", "/leituras-estimadas"].includes(caminho);
    const painel = ["/dashboard", "/admin/dashboard", "/gestor/dashboard", "/caixa/dashboard", "/tecnico/dashboard", "/admin/kpis"].includes(caminho);
    const dashboardSemCabecalho = caminho === "/dashboard" || caminho.endsWith("/dashboard");

    if (headerOnly) return dashboardSemCabecalho ? null : <CabecalhoSkeleton lista={lista} />;
    if (bodyOnly) {
        return (
            <div role="status" aria-label="A carregar página" aria-live="polite" className="min-h-[60vh] pb-10">
                {lista ? <TabelaSkeleton /> : painel ? <PainelSkeleton /> : <FichaSkeleton />}
                <span className="sr-only">A carregar os dados…</span>
            </div>
        );
    }

    return <><CabecalhoSkeleton lista={lista} /><div className="mt-4">{lista ? <TabelaSkeleton /> : painel ? <PainelSkeleton /> : <FichaSkeleton />}</div></>;
}
