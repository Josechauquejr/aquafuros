import { Head, Link, router } from "@inertiajs/react";
import { AlertTriangle, Check, MonitorSmartphone, RotateCcw, Search } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques, MaisDetalhes } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import IconButton from "@/Components/IconButton";
import Pagination from "@/Components/Pagination";
import FiltroPeriodo from "@/Components/FiltroPeriodo";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const abas = [
    { chave: "acessos", label: "Acessos", href: "/dev/logs/acessos" },
    { chave: "erros", label: "Erros", href: "/dev/logs/erros" },
    { chave: "aplicacao", label: "Aplicação", href: "/dev/logs/aplicacao" },
];

export default function Logs({ aba, acessos, erros, utilizadores = [], filtros }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const cartaoAcesso = useCartaoDeLinha(acessos?.data ?? []);
    const cartaoErro = useCartaoDeLinha(erros?.data ?? []);
    const acesso = cartaoAcesso.linha;
    const erroAberto = cartaoErro.linha;

    const rota = aba === "erros" ? "/dev/logs/erros" : "/dev/logs/acessos";

    const aplicarFiltros = (novosFiltros) => {
        router.get(rota, { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const marcarResolvido = (erro) => {
        router.put(`/dev/logs/erros/${erro.id}/resolver`, {}, { preserveScroll: true });
    };

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Logs Técnicos</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Acessos ao sistema (quem, quando, IP/dispositivo) e erros da aplicação.
                    </p>
                </div>
            }
        >
            <Head title="Logs Técnicos" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                        {abas.map((item) => (
                            <Link
                                key={item.chave}
                                href={item.href}
                                className={cn(
                                    "border-b-2 px-4 py-2 text-sm font-semibold transition",
                                    aba === item.chave
                                        ? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {aba === "acessos" ? (
                        <>
                            <AnimatedPanel delay={0.1} className="space-y-3 p-4">
                                <FiltroPeriodo filtros={filtros} navegar={aplicarFiltros} />
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                        <TextInput
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Pesquisar por URL..."
                                            className="w-full pl-9"
                                        />
                                    </div>
                                    <select
                                        value={filtros.utilizador_id}
                                        onChange={(event) => aplicarFiltros({ utilizador_id: event.target.value })}
                                        className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    >
                                        <option value="todos">Todos os utilizadores</option>
                                        {utilizadores.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </AnimatedPanel>

                            {acessos.data.length === 0 ? (
                                <AnimatedPanel delay={0.16}>
                                    <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                        Nenhum acesso encontrado para os filtros seleccionados.
                                    </p>
                                </AnimatedPanel>
                            ) : (
                                <>
                                    <AnimatedPanel delay={0.16} className="overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[900px] text-left text-sm">
                                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                                    <tr>
                                                        <th className="px-6 py-3">Utilizador</th>
                                                        <th className="px-6 py-3">Data/hora</th>
                                                        <th className="px-6 py-3">IP</th>
                                                        <th className="px-6 py-3">Dispositivo</th>
                                                        <th className="px-6 py-3">URL</th>
                                                        <th className="px-6 py-3 text-right">Estado</th>
                                                    </tr>
                                                </thead>
                                                <motion.tbody variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {acessos.data.map((linha) => (
                                                        <motion.tr key={linha.id} variants={itemVariants} {...cartaoAcesso.propsLinha(linha)} className={linhaClicavel}>
                                                            <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                                                                {linha.user?.name ?? "—"}
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                                                {formatDateTime(linha.created_at)}
                                                            </td>
                                                            <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{linha.ip ?? "—"}</td>
                                                            <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                                                <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate" title={linha.user_agent}>
                                                                    <MonitorSmartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                                    {linha.user_agent ?? "—"}
                                                                </span>
                                                            </td>
                                                            <td className="max-w-[260px] truncate px-6 py-3 text-slate-500 dark:text-slate-400" title={linha.url}>
                                                                {linha.url}
                                                            </td>
                                                            <td className="px-6 py-3 text-right">
                                                                <StatusBadge tone={linha.status_code && linha.status_code < 400 ? "emerald" : "rose"}>
                                                                    {linha.status_code ?? "—"}
                                                                </StatusBadge>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </motion.tbody>
                                            </table>
                                        </div>
                                    </AnimatedPanel>
                                    <Pagination paginador={acessos} />
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <AnimatedPanel delay={0.1} className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                        <TextInput
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Pesquisar por mensagem, excepção ou URL..."
                                            className="w-full pl-9"
                                        />
                                    </div>
                                    <select
                                        value={filtros.estado}
                                        onChange={(event) => aplicarFiltros({ estado: event.target.value })}
                                        className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    >
                                        <option value="todos">Todos os estados</option>
                                        <option value="pendente">Pendente</option>
                                        <option value="resolvido">Resolvido</option>
                                    </select>
                                </div>
                            </AnimatedPanel>

                            {erros.data.length === 0 ? (
                                <AnimatedPanel delay={0.16}>
                                    <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                        Nenhum erro encontrado para os filtros seleccionados.
                                    </p>
                                </AnimatedPanel>
                            ) : (
                                <>
                                    <AnimatedPanel delay={0.16} className="overflow-hidden">
                                        <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {erros.data.map((erro) => (
                                                <motion.div key={erro.id} variants={itemVariants} {...cartaoErro.propsLinha(erro)} className={cn("p-4 sm:px-6", linhaClicavel)}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                                                                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{erro.mensagem}</p>
                                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                    {erro.excepcao} &middot; {erro.ficheiro}:{erro.linha}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                    {erro.url ?? "—"} &middot; {erro.user?.name ?? "—"} &middot; {formatDateTime(erro.created_at)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-2">
                                                            <StatusBadge tone={erro.resolvido ? "emerald" : "amber"}>
                                                                {erro.resolvido ? "Resolvido" : "Pendente"}
                                                            </StatusBadge>
                                                            <IconButton
                                                                onClick={() => marcarResolvido(erro)}
                                                                tone={erro.resolvido ? "default" : "success"}
                                                                title={erro.resolvido ? "Marcar como pendente" : "Marcar como resolvido"}
                                                            >
                                                                {erro.resolvido ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                                                            </IconButton>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </AnimatedPanel>
                                    <Pagination paginador={erros} />
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {acesso && (
                <ExpandableCard
                    open={cartaoAcesso.aberta}
                    onOpenChange={(v) => !v && cartaoAcesso.fechar()}
                    title={`${acesso.metodo ?? "GET"} ${acesso.url}`}
                    description="Acesso ao sistema"
                >
                    <Destaques>
                        <Destaque rotulo="Estado" tom={acesso.status_code && acesso.status_code < 400 ? "sucesso" : "perigo"}>{acesso.status_code ?? "—"}</Destaque>
                        <Destaque rotulo="Duração" tom="primario">{acesso.duracao_ms != null ? `${acesso.duracao_ms} ms` : "—"}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Utilizador">{acesso.user?.name}</Campo>
                        <Campo rotulo="Data/hora">{formatDateTime(acesso.created_at)}</Campo>
                        <Campo rotulo="IP">{acesso.ip}</Campo>
                        <Campo rotulo="Tempo na base de dados">{acesso.tempo_bd_ms != null ? `${acesso.tempo_bd_ms} ms` : null}</Campo>
                    </Campos>
                    <MaisDetalhes>
                        <Campos>
                            <Campo rotulo="URL completo" largo>{acesso.url}</Campo>
                            <Campo rotulo="Dispositivo" largo>{acesso.user_agent}</Campo>
                        </Campos>
                    </MaisDetalhes>
                </ExpandableCard>
            )}

            {erroAberto && (
                <ExpandableCard
                    open={cartaoErro.aberta}
                    onOpenChange={(v) => !v && cartaoErro.fechar()}
                    title={erroAberto.mensagem}
                    description={erroAberto.excepcao}
                    footer={
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => marcarResolvido(erroAberto)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold uppercase text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                {erroAberto.resolvido ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                                {erroAberto.resolvido ? "Marcar como pendente" : "Marcar como resolvido"}
                            </button>
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Estado" tom={erroAberto.resolvido ? "sucesso" : "perigo"}>{erroAberto.resolvido ? "Resolvido" : "Pendente"}</Destaque>
                        <Destaque rotulo="Quando">{formatDateTime(erroAberto.created_at)}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Ficheiro" largo>{erroAberto.ficheiro}:{erroAberto.linha}</Campo>
                        <Campo rotulo="Pedido" largo>{erroAberto.metodo} {erroAberto.url}</Campo>
                        <Campo rotulo="Utilizador">{erroAberto.user?.name}</Campo>
                    </Campos>
                    {erroAberto.trace && (
                        <MaisDetalhes titulo="Rasto da pilha (trace)">
                            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{erroAberto.trace}</pre>
                        </MaisDetalhes>
                    )}
                </ExpandableCard>
            )}
        </DevLayout>
    );
}
