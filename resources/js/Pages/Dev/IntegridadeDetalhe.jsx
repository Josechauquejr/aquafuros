import { Head, Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";

export default function IntegridadeDetalhe({ verificacao, total, registos, amostra, erro }) {
    const cartao = useCartaoDeLinha(registos);
    const r = cartao.linha;

    return (
        <DevLayout
            header={
                <div>
                    <Link href="/dev/integridade" className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Integridade dos dados
                    </Link>
                    <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">{verificacao.titulo}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{verificacao.descricao}</p>
                </div>
            }
        >
            <Head title={verificacao.titulo} />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">
                    {erro && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{erro}</p>}

                    <AnimatedPanel className="overflow-hidden">
                        {registos.length === 0 ? (
                            <p className="p-10 text-center text-sm text-slate-500">{erro ? "Sem resultado." : "Nenhum registo suspeito."}</p>
                        ) : (
                            <>
                                <p className="border-b border-slate-100 px-5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                                    {total} registo(s){total > amostra && `: a mostrar os primeiros ${amostra}`}. Clique numa linha para ver o registo.
                                </p>
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {registos.map((item) => (
                                        <li key={item.id} {...cartao.propsLinha(item)} className={cn("flex items-center gap-4 px-5 py-3 text-sm", linhaClicavel)}>
                                            <Link href={`/dev/dados/${verificacao.tabela}/registo/${item.id}`} className="w-16 shrink-0 font-mono font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                                                #{item.id}
                                            </Link>
                                            <span className="text-slate-800 dark:text-slate-200">{item.resumo}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </AnimatedPanel>
                </div>
            </div>

            {r && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={`${verificacao.tabela} #${r.id}`}
                    description={verificacao.titulo}
                    footer={
                        <div className="flex justify-end">
                            <Link href={`/dev/dados/${verificacao.tabela}/registo/${r.id}`} className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                Abrir no explorador
                            </Link>
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Registo" tom="perigo">#{r.id}</Destaque>
                        <Destaque rotulo="Tabela">{verificacao.tabela}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Porque aparece aqui" largo>{r.resumo}</Campo>
                        <Campo rotulo="Verificação" largo>{verificacao.descricao}</Campo>
                    </Campos>
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
