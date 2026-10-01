import { Head, router } from "@inertiajs/react";
import { AlertTriangle, Clock, Copy, Eraser, Lock, Power } from "lucide-react";
import { useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmarComTexto from "@/Components/ConfirmarComTexto";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime } from "@/lib/utils";

function Seccao({ icone: Icone, titulo, descricao, children }) {
    return (
        <AnimatedPanel className="p-5">
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Icone className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                    <h3 className="font-semibold text-slate-950 dark:text-white">{titulo}</h3>
                    {descricao && <p className="text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
                </div>
            </div>
            <div className="mt-4">{children}</div>
        </AnimatedPanel>
    );
}

export default function Operacoes({ agendamentos, caches, manutencao, ambiente }) {
    const [perigo, setPerigo] = useState(null);
    const grupos = ambiente.reduce((acc, item) => ((acc[item.grupo] ??= []).push(item), acc), {});

    const limparCache = (c) =>
        c.palavra
            ? setPerigo({ metodo: "post", url: "/dev/operacoes/cache", dados: { tipo: c.chave }, palavra: c.palavra, titulo: `Limpar: ${c.rotulo}`, descricao: c.aviso, rotulo: "Limpar" })
            : router.post("/dev/operacoes/cache", { tipo: c.chave }, { preserveScroll: true });

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Operações do sistema</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Agendamentos, cache, manutenção e ambiente. Cada acção pede a senha e fica na auditoria.</p>
                </div>
            }
        >
            <Head title="Operações do sistema" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Seccao icone={Clock} titulo="Agendamentos" descricao="Tarefas que o agendador (schedule:run) corre sozinho.">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                <thead className="text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                    <tr><th className="py-2 pr-4">Tarefa</th><th className="py-2 pr-4">Quando</th><th className="py-2 pr-4">Última execução</th><th className="py-2 pr-4">Próxima</th><th className="py-2 text-right">Acção</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {agendamentos.map((t) => (
                                        <tr key={t.nome} className="align-top">
                                            <td className="py-3 pr-4 font-mono text-xs text-slate-900 dark:text-white">{t.nome}{t.descricao && <p className="mt-1 max-w-xs font-sans text-slate-500">{t.descricao}</p>}</td>
                                            <td className="py-3 pr-4 font-mono text-xs text-slate-600 dark:text-slate-300">{t.expressao}</td>
                                            <td className="py-3 pr-4 text-xs">
                                                {t.ultima ? (<><StatusBadge tone={t.ultima.estado === "ok" ? "emerald" : "rose"}>{t.ultima.estado === "ok" ? "OK" : "Falhou"}</StatusBadge><p className="mt-1 text-slate-500">{formatDateTime(t.ultima.em)}{t.ultima.duracao_ms != null && ` · ${t.ultima.duracao_ms} ms`}</p>{t.ultima.erro && <p className="text-rose-600">{t.ultima.erro}</p>}</>) : <span className="text-slate-400">Sem registo</span>}
                                            </td>
                                            <td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">{t.proxima ? formatDateTime(t.proxima) : "—"}</td>
                                            <td className="py-3 text-right">
                                                {t.executavel && (
                                                    <SecondaryButton type="button" onClick={() => setPerigo({ metodo: "post", url: "/dev/operacoes/tarefa", dados: { tarefa: t.nome }, palavra: "EXECUTAR", titulo: `Executar ${t.nome} agora`, descricao: t.descricao, rotulo: "Executar" })}>Executar agora</SecondaryButton>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Seccao>

                    <Seccao icone={Eraser} titulo="Cache" descricao="Limpar por tipo.">
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {caches.map((c) => (
                                <li key={c.chave} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <div className="max-w-2xl"><p className="text-sm font-semibold text-slate-900 dark:text-white">{c.rotulo}</p><p className="text-xs text-slate-500 dark:text-slate-400">{c.aviso}</p></div>
                                    <SecondaryButton type="button" onClick={() => limparCache(c)}>Limpar</SecondaryButton>
                                </li>
                            ))}
                        </ul>
                    </Seccao>

                    <Seccao icone={Power} titulo="Modo de manutenção" descricao="Mostra a página de manutenção a todos os utilizadores, excepto a quem tem o link de acesso.">
                        {manutencao.ligacao && (
                            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                <p className="font-semibold">Guarde este link de acesso: só é mostrado agora.</p>
                                <p className="mt-1 flex items-center gap-2 break-all font-mono text-xs">{manutencao.ligacao}
                                    <button type="button" title="Copiar" onClick={() => navigator.clipboard?.writeText(manutencao.ligacao)}><Copy className="h-4 w-4" aria-hidden="true" /></button>
                                </p>
                                <p className="mt-1 text-xs">Já tem acesso neste navegador. Em Railway a manutenção perde-se num novo deploy.</p>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge tone={manutencao.activa ? "rose" : "emerald"}>{manutencao.activa ? "Ligado: utilizadores bloqueados" : "Desligado"}</StatusBadge>
                            {manutencao.activa ? (
                                <SecondaryButton type="button" onClick={() => router.delete("/dev/operacoes/manutencao", { preserveScroll: true })}>Desligar manutenção</SecondaryButton>
                            ) : (
                                <SecondaryButton type="button" onClick={() => setPerigo({ metodo: "post", url: "/dev/operacoes/manutencao", palavra: "MANUTENCAO", titulo: "Ligar o modo de manutenção", descricao: "Todos os utilizadores (administrador, gestor, caixa e técnico) deixam de conseguir usar o sistema até desligar. Em produção isto afecta o trabalho em curso.", rotulo: "Ligar manutenção" })}>
                                    <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" /> Ligar manutenção
                                </SecondaryButton>
                            )}
                        </div>
                    </Seccao>

                    <Seccao icone={Lock} titulo="Ambiente" descricao="Só leitura. Segredos mostram apenas se estão definidos, nunca o valor.">
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {Object.entries(grupos).map(([grupo, itens]) => (
                                <div key={grupo}>
                                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{grupo}</p>
                                    <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {itens.map((i) => (
                                            <div key={i.chave} className="flex justify-between gap-3 py-1.5 text-sm">
                                                <dt className="font-mono text-xs text-slate-500">{i.chave}</dt>
                                                <dd className={i.valor === "NÃO definido" ? "text-right font-medium text-rose-600" : "break-all text-right text-slate-900 dark:text-white"}>{i.valor}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ))}
                        </div>
                    </Seccao>
                </div>
            </div>

            <ConfirmarComTexto accao={perigo ? { metodo: perigo.metodo, url: perigo.url, dados: perigo.dados } : null} palavra={perigo?.palavra} titulo={perigo?.titulo} descricao={perigo?.descricao} rotulo={perigo?.rotulo} onClose={() => setPerigo(null)} />
        </DevLayout>
    );
}
