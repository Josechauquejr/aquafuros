import { Head, Link, router } from "@inertiajs/react";
import { ChevronRight, Search } from "lucide-react";
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

const abas = [
    { chave: "acessos", label: "Acessos", href: "/dev/logs/acessos" },
    { chave: "erros", label: "Erros", href: "/dev/logs/erros" },
    { chave: "aplicacao", label: "Aplicação", href: "/dev/logs/aplicacao" },
];

const tomNivel = { debug: "slate", info: "cyan", notice: "cyan", warning: "amber", error: "rose", critical: "rose", alert: "rose", emergency: "rose" };

function Entrada({ entrada, propsLinha }) {
    return (
        <li {...propsLinha} className={cn("px-4 py-3", linhaClicavel)}>
            <div className="flex items-start gap-3">
                <StatusBadge tone={tomNivel[entrada.nivel] ?? "slate"}>{entrada.nivel}</StatusBadge>
                <div className="min-w-0 flex-1">
                    <p className="break-words text-sm text-slate-900 dark:text-white">{entrada.mensagem}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entrada.data} · {entrada.ambiente}</p>
                </div>
                {entrada.detalhe !== "" && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
            </div>
        </li>
    );
}

const seleccao = "rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function LogsAplicacao({ ficheiros, entradas, truncado, canalLog, niveis, filtros }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const linhas = entradas.data.map((e, i) => ({ ...e, chave: `${entradas.current_page}-${i}` }));
    const cartao = useCartaoDeLinha(linhas, (l) => l.chave);
    const e = cartao.linha;
    const aplicar = (extra) => {
        const params = Object.fromEntries(Object.entries({ ...filtros, ...extra }).filter(([, v]) => v));
        router.get("/dev/logs/aplicacao", params, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const t = setTimeout(() => aplicar({ search, page: null }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Logs Técnicos</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registo da aplicação (storage/logs). Senhas e tokens aparecem mascarados.</p>
                </div>
            }
        >
            <Head title="Logs da aplicação" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                        {abas.map((item) => (
                            <Link
                                key={item.chave}
                                href={item.href}
                                className={cn(
                                    "border-b-2 px-4 py-2 text-sm font-semibold transition",
                                    item.chave === "aplicacao"
                                        ? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {ficheiros.length === 0 ? (
                        <AnimatedPanel className="p-8 text-center text-sm text-slate-600 dark:text-slate-300">
                            <p className="font-semibold text-slate-900 dark:text-white">Não há ficheiros de log legíveis.</p>
                            <p className="mt-2">
                                O canal de log em uso é <strong>{canalLog}</strong>. Se for <code>stderr</code> (recomendado em Railway), os logs vão para a consola do
                                serviço no Railway e não ficam em ficheiro, por isso não aparecem aqui.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <>
                            <AnimatedPanel className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                    <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar na mensagem ou no detalhe" className="block w-full pl-9" />
                                </div>
                                <select value={filtros.ficheiro ?? ""} onChange={(e) => aplicar({ ficheiro: e.target.value, page: null })} className={seleccao}>
                                    {ficheiros.map((f) => (
                                        <option key={f.nome} value={f.nome}>{f.nome} ({f.kb} KB)</option>
                                    ))}
                                </select>
                                <select value={filtros.nivel ?? ""} onChange={(e) => aplicar({ nivel: e.target.value, page: null })} className={seleccao}>
                                    <option value="">Todos os níveis</option>
                                    {niveis.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <input type="date" value={filtros.data ?? ""} onChange={(e) => aplicar({ data: e.target.value, page: null })} className={seleccao} />
                            </AnimatedPanel>

                            {truncado && (
                                <p className="text-xs text-amber-700 dark:text-amber-300">Ficheiro grande: só se mostram os últimos 2 MB.</p>
                            )}

                            <AnimatedPanel className="overflow-hidden">
                                {entradas.data.length === 0 ? (
                                    <p className="p-8 text-center text-sm text-slate-500">Sem entradas para estes filtros.</p>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {linhas.map((linha) => (
                                            <Entrada key={linha.chave} entrada={linha} propsLinha={cartao.propsLinha(linha)} />
                                        ))}
                                    </ul>
                                )}
                                <Pagination paginador={entradas} />
                            </AnimatedPanel>
                        </>
                    )}
                </div>
            </div>
            {e && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={e.mensagem}
                    description={`Registo da aplicação · ${e.data}`}
                    classNameExpanded="max-w-3xl"
                >
                    <Destaques>
                        <Destaque rotulo="Nível" tom={["error", "critical", "alert", "emergency"].includes(e.nivel) ? "perigo" : e.nivel === "warning" ? "neutro" : "primario"}>{e.nivel}</Destaque>
                        <Destaque rotulo="Ambiente">{e.ambiente}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Data/hora">{e.data}</Campo>
                    </Campos>
                    {e.detalhe !== "" ? (
                        <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{e.detalhe}</pre>
                    ) : (
                        <p className="mt-5 text-sm text-muted-foreground">Sem mais detalhe (sem rasto de pilha).</p>
                    )}
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
