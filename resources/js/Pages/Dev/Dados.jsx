import { Head, Link } from "@inertiajs/react";
import { Database, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques, SeccaoDetalhe } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";

const tamanho = (kb) => (kb == null ? "—" : kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

export default function Dados({ tabelas, relacoes }) {
    const [search, setSearch] = useState("");
    const filtradas = useMemo(() => tabelas.filter((t) => t.nome.includes(search.trim().toLowerCase())), [tabelas, search]);
    const cartao = useCartaoDeLinha(filtradas, (t) => t.nome);
    const tab = cartao.linha;
    const dependeDe = tab ? relacoes.filter((r) => r.origem === tab.nome) : [];
    const dependentes = tab ? relacoes.filter((r) => r.destino === tab.nome) : [];

    // Relações agrupadas por tabela de origem: cliente → leituras → facturas...
    const porOrigem = useMemo(() => {
        const mapa = {};
        relacoes.forEach((r) => (mapa[r.origem] ??= []).push(r));
        return Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b));
    }, [relacoes]);

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Explorador de dados</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Só leitura. Segredos (senhas, tokens, payloads) ficam sempre mascarados e fora da pesquisa e da exportação.
                    </p>
                </div>
            }
        >
            <Head title="Explorador de dados" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="relative max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar tabela" className="block w-full pl-9" />
                    </div>

                    <AnimatedPanel className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">Tabela</th>
                                    <th className="px-4 py-3 text-right">Registos</th>
                                    <th className="px-4 py-3 text-right">Colunas</th>
                                    <th className="px-4 py-3 text-right">Tamanho</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtradas.map((t) => (
                                    <tr key={t.nome} {...cartao.propsLinha(t)} className={linhaClicavel}>
                                        <td className="px-4 py-3">
                                            <Link href={`/dev/dados/${t.nome}`} className="inline-flex items-center gap-2 font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                                                <Database className="h-4 w-4" aria-hidden="true" />
                                                {t.nome}
                                            </Link>
                                            {t.sensivel && (
                                                <StatusBadge tone="amber" className="ml-2">
                                                    <Lock className="h-3 w-3" aria-hidden="true" /> colunas mascaradas
                                                </StatusBadge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{t.registos ?? "—"}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{t.colunas}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{tamanho(t.tamanho_kb)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </AnimatedPanel>

                    <AnimatedPanel className="p-5">
                        <h3 className="font-semibold text-slate-950 dark:text-white">Mapa de relações</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Chaves estrangeiras da base de dados: cada linha aponta para a tabela de que depende.
                        </p>
                        {porOrigem.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">Sem chaves estrangeiras declaradas.</p>
                        ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {porOrigem.map(([origem, lista]) => (
                                    <div key={origem} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                                        <Link href={`/dev/dados/${origem}`} className="text-sm font-semibold text-slate-900 hover:underline dark:text-white">
                                            {origem}
                                        </Link>
                                        <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                            {lista.map((r) => (
                                                <li key={`${r.coluna}-${r.destino}`}>
                                                    <span className="font-mono">{r.coluna}</span> →{" "}
                                                    <Link href={`/dev/dados/${r.destino}`} className="font-medium text-cyan-700 hover:underline dark:text-cyan-300">
                                                        {r.destino}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatedPanel>
                </div>
            </div>
            {tab && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={tab.nome}
                    description="Tabela da base de dados"
                    footer={
                        <div className="flex justify-end">
                            <Link href={`/dev/dados/${tab.nome}`} className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-cyan-500">
                                Abrir a tabela
                            </Link>
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Registos" tom="primario">{tab.registos ?? "—"}</Destaque>
                        <Destaque rotulo="Colunas">{tab.colunas}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Tamanho">{tamanho(tab.tamanho_kb)}</Campo>
                        <Campo rotulo="Colunas sensíveis">{tab.sensivel ? "Sim: ficam sempre mascaradas" : "Não"}</Campo>
                    </Campos>
                    <SeccaoDetalhe titulo="Depende de">
                        {dependeDe.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ligação a outras tabelas.</p> : (
                            <ul className="space-y-1 text-sm">
                                {dependeDe.map((r) => (
                                    <li key={`${r.coluna}-${r.destino}`}><span className="font-mono text-xs text-muted-foreground">{r.coluna}</span> → <Link href={`/dev/dados/${r.destino}`} className="font-medium text-cyan-700 hover:underline dark:text-cyan-300">{r.destino}</Link></li>
                                ))}
                            </ul>
                        )}
                    </SeccaoDetalhe>
                    <SeccaoDetalhe titulo="Tabelas que dependem desta">
                        {dependentes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : (
                            <ul className="space-y-1 text-sm">
                                {dependentes.map((r) => (
                                    <li key={`${r.origem}-${r.coluna}`}><Link href={`/dev/dados/${r.origem}`} className="font-medium text-cyan-700 hover:underline dark:text-cyan-300">{r.origem}</Link> <span className="font-mono text-xs text-muted-foreground">via {r.coluna}</span></li>
                                ))}
                            </ul>
                        )}
                    </SeccaoDetalhe>
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
