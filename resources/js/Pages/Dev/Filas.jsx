import { Head, Link, router } from "@inertiajs/react";
import { Play, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmarComTexto from "@/Components/ConfirmarComTexto";
import IconButton from "@/Components/IconButton";
import Pagination from "@/Components/Pagination";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatDateTime } from "@/lib/utils";

export default function Filas({ aba, ligacao, trabalhador, totais, pendentes, falhados }) {
    const [perigo, setPerigo] = useState(null);
    const lista = aba === "falhados" ? falhados : pendentes;

    const abas = [
        { chave: "pendentes", label: `Pendentes (${totais.pendentes + totais.em_curso})` },
        { chave: "falhados", label: `Falhados (${totais.falhados})` },
    ];

    const accao = (metodo, url) => router[metodo](url, {}, { preserveScroll: true });

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Filas e jobs</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Ligação: <strong>{ligacao}</strong>. A fila na base de dados só guarda o que está pendente ou falhou; os concluídos não ficam registados.
                        O conteúdo dos jobs nunca é mostrado.
                    </p>
                </div>
            }
        >
            <Head title="Filas e jobs" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {trabalhador && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{trabalhador}</p>}

                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 dark:border-slate-800">
                        {abas.map((item) => (
                            <Link
                                key={item.chave}
                                href={`/dev/filas?aba=${item.chave}`}
                                className={cn("border-b-2 px-4 py-2 text-sm font-semibold transition", aba === item.chave ? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400")}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="ml-auto flex gap-2 pb-2">
                            {aba === "falhados" ? (
                                <>
                                    <SecondaryButton type="button" disabled={totais.falhados === 0} onClick={() => accao("post", "/dev/filas/falhados/repetir-todos")}>
                                        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" /> Repetir todos
                                    </SecondaryButton>
                                    <SecondaryButton type="button" disabled={totais.falhados === 0} onClick={() => setPerigo({ url: "/dev/filas/falhados", titulo: "Apagar todos os jobs falhados", descricao: `Apaga ${totais.falhados} job(s) falhado(s) de vez. Não se pode desfazer.`, rotulo: "Apagar todos" })}>
                                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Apagar todos
                                    </SecondaryButton>
                                </>
                            ) : (
                                <SecondaryButton type="button" disabled={totais.pendentes === 0} onClick={() => setPerigo({ url: "/dev/filas/pendentes", titulo: "Apagar todos os jobs pendentes", descricao: `Apaga ${totais.pendentes} job(s) que ainda não começaram. Os que estão em curso não são tocados. O trabalho desses jobs perde-se.`, rotulo: "Apagar pendentes" })}>
                                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Limpar pendentes
                                </SecondaryButton>
                            )}
                        </div>
                    </div>

                    <AnimatedPanel className="overflow-x-auto">
                        {lista.data.length === 0 ? (
                            <p className="p-10 text-center text-sm text-slate-500">{aba === "falhados" ? "Nenhum job falhado." : "Fila vazia: nada pendente."}</p>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3">Job</th>
                                        <th className="px-4 py-3">Fila</th>
                                        {aba === "falhados" ? <><th className="px-4 py-3">Falhou em</th><th className="px-4 py-3">Erro</th></> : <><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Tentativas</th><th className="px-4 py-3">Disponível em</th></>}
                                        <th className="px-4 py-3 text-right">Acções</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lista.data.map((j) => (
                                        <tr key={j.id} className="align-top">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{j.job}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{j.fila}</td>
                                            {aba === "falhados" ? (
                                                <>
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(j.falhou_em)}</td>
                                                    <td className="max-w-md px-4 py-3 text-xs text-rose-700 dark:text-rose-300">{j.erro}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3"><StatusBadge tone={j.em_curso ? "cyan" : "amber"}>{j.em_curso ? "Em curso" : "À espera"}</StatusBadge></td>
                                                    <td className="px-4 py-3 tabular-nums">{j.tentativas}</td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{j.disponivel_em}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {aba === "falhados" && (
                                                        <IconButton title="Repetir" onClick={() => accao("post", `/dev/filas/falhados/${j.uuid}/repetir`)}>
                                                            <Play className="h-4 w-4" aria-hidden="true" />
                                                        </IconButton>
                                                    )}
                                                    {!j.em_curso && (
                                                        <IconButton title="Apagar" onClick={() => accao("delete", aba === "falhados" ? `/dev/filas/falhados/${j.uuid}` : `/dev/filas/pendentes/${j.id}`)}>
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </IconButton>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <Pagination paginador={lista} />
                    </AnimatedPanel>
                </div>
            </div>

            <ConfirmarComTexto
                accao={perigo ? { metodo: "delete", url: perigo.url } : null}
                palavra="LIMPAR"
                titulo={perigo?.titulo}
                descricao={perigo?.descricao}
                rotulo={perigo?.rotulo}
                onClose={() => setPerigo(null)}
            />
        </DevLayout>
    );
}
