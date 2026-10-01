import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Lock } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";

const mostrar = (v) => (v === null || v === undefined ? <span className="text-slate-400">null</span> : typeof v === "boolean" ? (v ? "true" : "false") : String(v));

export default function DadosRegisto({ tabela, id, campos, paraOnde, quemAponta, podeEditar }) {
    return (
        <DevLayout
            header={
                <div>
                    <Link href={`/dev/dados/${tabela}`} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tabela}
                    </Link>
                    <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                        {tabela} #{id}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registo completo. Esta consulta ficou na auditoria.</p>
                    {podeEditar && <Link href={`/dev/editar/${tabela}/${id}`} className="mt-2 inline-block rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Editar</Link>}
                </div>
            }
        >
            <Head title={`${tabela} #${id}`} />

            <div className="py-8 sm:py-10">
                <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
                    <AnimatedPanel className="p-5 lg:col-span-2">
                        <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                            {campos.map((c) => (
                                <div key={c.nome} className="grid gap-1 py-2 sm:grid-cols-3 sm:gap-4">
                                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                                        <span className="font-mono text-slate-700 dark:text-slate-300">{c.nome}</span>
                                        <span className="ml-1 text-xs">{c.tipo}</span>
                                    </dt>
                                    <dd className="break-words text-sm text-slate-900 dark:text-white sm:col-span-2">
                                        {c.sensivel ? (
                                            <span className="inline-flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" aria-hidden="true" /> {c.valor ?? "null"}</span>
                                        ) : (
                                            <span className="whitespace-pre-wrap">{mostrar(c.valor)}</span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </AnimatedPanel>

                    <div className="space-y-6">
                        <AnimatedPanel className="p-5">
                            <h3 className="font-semibold text-slate-950 dark:text-white">Depende de</h3>
                            {paraOnde.length === 0 ? (
                                <p className="mt-2 text-sm text-slate-500">Nenhuma ligação.</p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm">
                                    {paraOnde.map((r) => (
                                        <li key={r.coluna}>
                                            <span className="font-mono text-xs text-slate-500">{r.coluna}</span> →{" "}
                                            <Link href={`/dev/dados/${r.tabela}/registo/${r.id}`} className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                                                {r.tabela} #{r.id}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </AnimatedPanel>

                        <AnimatedPanel className="p-5">
                            <h3 className="font-semibold text-slate-950 dark:text-white">Registos que dependem deste</h3>
                            {quemAponta.length === 0 ? (
                                <p className="mt-2 text-sm text-slate-500">Nenhum.</p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm">
                                    {quemAponta.map((r) => (
                                        <li key={`${r.tabela}-${r.coluna}`}>
                                            <Link
                                                href={`/dev/dados/${r.tabela}?col=${r.coluna}&val=${encodeURIComponent(r.valor)}`}
                                                className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                                            >
                                                {r.tabela}
                                            </Link>{" "}
                                            <span className="text-slate-500">({r.total} via {r.coluna})</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </AnimatedPanel>
                    </div>
                </div>
            </div>
        </DevLayout>
    );
}
