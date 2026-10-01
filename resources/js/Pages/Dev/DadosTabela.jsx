import { Head, Link, router } from "@inertiajs/react";
import { ArrowDown, ArrowLeft, ArrowUp, Download, Lock, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import Pagination from "@/Components/Pagination";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";

const mostrar = (v) => (v === null || v === undefined ? <span className="text-slate-400">null</span> : typeof v === "boolean" ? (v ? "true" : "false") : String(v));

export default function DadosTabela({ tabela, colunas, pk, estrangeiras, linhas, filtros, limiteExportacao }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const base = `/dev/dados/${tabela}`;
    const chaveLinha = pk ?? colunas[0]?.name;
    const cartao = useCartaoDeLinha(linhas.data, (l) => l[chaveLinha]);
    const linhaAberta = cartao.linha;
    const consulta = (extra = {}) => {
        const params = { ...filtros, ...extra };
        return Object.fromEntries(Object.entries({ search: params.search, col: params.coluna, val: params.valor, sort: params.sort, dir: params.dir }).filter(([, v]) => v));
    };
    const ir = (extra) => router.get(base, consulta(extra), { preserveState: true, preserveScroll: true, replace: true });

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const t = setTimeout(() => ir({ search }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const ordenar = (coluna) => ir({ sort: coluna, dir: filtros.sort === coluna && filtros.dir === "desc" ? "asc" : "desc" });
    const exportar = `${base}/exportar?${new URLSearchParams(consulta()).toString()}`;

    return (
        <DevLayout
            header={
                <div>
                    <Link href="/dev/dados" className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Explorador de dados
                    </Link>
                    <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">{tabela}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{linhas.total} registo(s) · só leitura</p>
                </div>
            }
        >
            <Head title={`Dados: ${tabela}`} />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-[96rem] space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nesta tabela" className="block w-full pl-9" />
                        </div>
                        {filtros.coluna && (
                            <button type="button" onClick={() => ir({ coluna: null, valor: null })} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                                {filtros.coluna} = {filtros.valor} <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        )}
                        <a href={exportar} className="ml-auto inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" title={`Máx. ${limiteExportacao} linhas, sem colunas sensíveis. Pede a senha.`}>
                            <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Exportar CSV
                        </a>
                    </div>

                    <AnimatedPanel className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                            <thead className="bg-slate-50 text-left font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                <tr>
                                    {colunas.map((c) => (
                                        <th key={c.name} className="whitespace-nowrap px-3 py-2">
                                            {c.sensivel ? (
                                                <span className="inline-flex items-center gap-1" title="Coluna sensível: sempre mascarada">
                                                    <Lock className="h-3 w-3" aria-hidden="true" /> {c.name}
                                                </span>
                                            ) : (
                                                <button type="button" onClick={() => ordenar(c.name)} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
                                                    {c.name}
                                                    {filtros.sort === c.name && (filtros.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                                                </button>
                                            )}
                                            <span className="ml-1 font-normal text-slate-400">{c.type}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {linhas.data.length === 0 && (
                                    <tr>
                                        <td colSpan={colunas.length} className="px-3 py-8 text-center text-slate-500">Sem registos para estes filtros.</td>
                                    </tr>
                                )}
                                {linhas.data.map((linha, i) => (
                                    <tr key={pk ? linha[pk] : i} {...cartao.propsLinha(linha)} className={cn("align-top", linhaClicavel)}>
                                        {colunas.map((c) => {
                                            const valor = linha[c.name];
                                            const destino = estrangeiras[c.name];
                                            return (
                                                <td key={c.name} className="max-w-[18rem] truncate px-3 py-2 text-slate-800 dark:text-slate-200" title={typeof valor === "string" ? valor : undefined}>
                                                    {c.sensivel ? (
                                                        <StatusBadge tone="slate">{valor === null ? "null" : valor}</StatusBadge>
                                                    ) : c.name === pk ? (
                                                        <Link href={`${base}/registo/${valor}`} className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300">{valor}</Link>
                                                    ) : destino && valor !== null ? (
                                                        <Link href={`/dev/dados/${destino}/registo/${valor}`} className="text-cyan-700 hover:underline dark:text-cyan-300">{valor}</Link>
                                                    ) : (
                                                        mostrar(valor)
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination paginador={linhas} />
                    </AnimatedPanel>
                </div>
            </div>
            {linhaAberta && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={pk ? `${tabela} #${linhaAberta[pk]}` : tabela}
                    description="Linha da tabela (só leitura)"
                    footer={
                        pk ? (
                            <div className="flex justify-end">
                                <Link href={`${base}/registo/${linhaAberta[pk]}`} className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-cyan-500">
                                    Abrir o registo completo
                                </Link>
                            </div>
                        ) : null
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Tabela">{tabela}</Destaque>
                        <Destaque rotulo="Colunas">{colunas.length}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        {colunas.map((c) => (
                            <Campo key={c.name} rotulo={`${c.name} (${c.type})`} largo={typeof linhaAberta[c.name] === "string" && linhaAberta[c.name].length > 40}>
                                {c.sensivel ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" /> {linhaAberta[c.name] ?? "null"}</span> : mostrar(linhaAberta[c.name])}
                            </Campo>
                        ))}
                    </Campos>
                    <p className="mt-5 text-xs text-muted-foreground">Textos longos aparecem cortados na lista: o registo completo mostra tudo.</p>
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
