import { Head, Link } from "@inertiajs/react";
import { Copy } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { Campo, Campos, Destaque, Destaques, Explicacao } from "@/Components/DataTable/Detalhe";
import useCartaoDeLinha, { linhaClicavel } from "@/Components/DataTable/useCartaoDeLinha";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import { cn } from "@/lib/utils";

const abas = [
    { chave: "qualidade", label: "Qualidade" },
    { chave: "crescimento", label: "Crescimento" },
    { chave: "indices", label: "Índices" },
    { chave: "lentidao", label: "Lentidão" },
];

const th = "px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400";

function Qualidade({ dados }) {
    if (dados.length === 0) return <p className="p-10 text-center text-sm text-slate-500">Sem dados para analisar.</p>;
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {dados.map((t) => (
                <AnimatedPanel key={t.tabela} className="p-5">
                    <div className="flex items-baseline justify-between">
                        <Link href={`/dev/dados/${t.tabela}`} className="font-semibold text-cyan-700 hover:underline dark:text-cyan-300">{t.tabela}</Link>
                        <span className="text-xs text-slate-500">{t.registos} registo(s){t.activos ? " activos" : ""}</span>
                    </div>
                    {t.campos.length === 0 ? (
                        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">Nenhum campo opcional em branco.</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {t.campos.map((c) => (
                                <li key={c.coluna} className="text-sm">
                                    <div className="flex justify-between"><span className="font-mono text-xs text-slate-700 dark:text-slate-300">{c.coluna}</span><span className="text-slate-500">{c.nulos} em branco ({c.pct}%)</span></div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.min(100, c.pct)}%` }} /></div>
                                </li>
                            ))}
                        </ul>
                    )}
                </AnimatedPanel>
            ))}
        </div>
    );
}

function Crescimento({ dados }) {
    return (
        <AnimatedPanel className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                        <th className={cn(th, "text-left")}>Tabela</th>
                        <th className={cn(th, "text-right")}>Total</th>
                        {dados.meses.map((m) => <th key={m} className={cn(th, "text-right")}>{m.slice(2).replace("-", "/")}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dados.tabelas.map((t) => {
                        const max = Math.max(1, ...t.meses);
                        return (
                            <tr key={t.tabela}>
                                <td className="px-4 py-2 font-mono text-xs text-slate-900 dark:text-white">{t.tabela}</td>
                                <td className="px-4 py-2 text-right font-semibold tabular-nums">{t.total}</td>
                                {t.meses.map((n, i) => (
                                    <td key={i} className="px-4 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300" style={{ background: n ? `rgba(6,182,212,${0.08 + (n / max) * 0.3})` : undefined }}>{n || "·"}</td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="px-4 py-3 text-xs text-slate-500">Registos criados por mês, nos últimos 12 meses. Tabelas que crescem depressa (acessos, erros, actividade) precisam de uma política de limpeza.</p>
        </AnimatedPanel>
    );
}

function Indices({ dados }) {
    const cartao = useCartaoDeLinha(dados.sugestoes, (s) => `${s.tabela}.${s.coluna}`);
    const sug = cartao.linha;
    if (dados.sugestoes.length === 0) return <p className="p-10 text-center text-sm text-emerald-700">Sem sugestões: as chaves estrangeiras e colunas muito filtradas têm índice.</p>;
    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
                {dados.sugestoes.length} sugestão(ões). <strong>Nada foi criado.</strong> Cada índice acelera leituras mas custa espaço e escrita: avalie caso a caso e crie por uma migração.
                {dados.motor === "pgsql" && " Em PostgreSQL, CONCURRENTLY evita bloquear a tabela (não pode correr dentro de uma transacção)."}
            </p>
            <AnimatedPanel className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className={th}>Tabela.coluna</th><th className={th}>Motivo</th><th className={cn(th, "text-right")}>Registos</th><th className={th}>SQL sugerido</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dados.sugestoes.map((s) => (
                            <tr key={`${s.tabela}.${s.coluna}`} {...cartao.propsLinha(s)} className={cn("align-top", linhaClicavel)}>
                                <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{s.tabela}.{s.coluna}</td>
                                <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{s.motivo}{s.nota && <span className="block text-slate-400">{s.nota}</span>}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{s.registos}</td>
                                <td className="px-4 py-3"><button type="button" title="Copiar" onClick={() => navigator.clipboard?.writeText(s.sql)} className="flex items-center gap-2 text-left font-mono text-xs text-slate-700 hover:text-cyan-700 dark:text-slate-300"><Copy className="h-3 w-3 shrink-0" aria-hidden="true" />{s.sql}</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </AnimatedPanel>

            {sug && (
                <ExpandableCard
                    open={cartao.aberta}
                    onOpenChange={(v) => !v && cartao.fechar()}
                    title={`${sug.tabela}.${sug.coluna}`}
                    description="Índice sugerido"
                    footer={
                        <div className="flex justify-end">
                            <SecondaryButton type="button" onClick={() => navigator.clipboard?.writeText(sug.sql)}>
                                <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Copiar o SQL
                            </SecondaryButton>
                        </div>
                    }
                >
                    <Destaques>
                        <Destaque rotulo="Registos na tabela" tom="primario">{sug.registos}</Destaque>
                        <Destaque rotulo="Motivo">{sug.motivo}</Destaque>
                    </Destaques>
                    <Campos className="mt-5">
                        <Campo rotulo="Tabela">{sug.tabela}</Campo>
                        <Campo rotulo="Coluna">{sug.coluna}</Campo>
                        {sug.nota && <Campo rotulo="Nota" largo>{sug.nota}</Campo>}
                        <Campo rotulo="SQL sugerido" largo><span className="font-mono text-sm">{sug.sql}</span></Campo>
                    </Campos>
                    <Explicacao tom="aviso" titulo="Nada foi criado" className="mt-5">
                        Um índice acelera leituras mas custa espaço e escrita. Crie-o por uma migração, avaliando caso a caso. Em PostgreSQL, CONCURRENTLY evita bloquear a tabela mas não pode correr dentro de uma transacção.
                    </Explicacao>
                </ExpandableCard>
            )}
        </div>
    );
}

function Lentidao({ dados }) {
    const { consultas } = dados;
    const tom = (ms) => (ms >= 1500 ? "rose" : ms >= 500 ? "amber" : "emerald");
    return (
        <div className="space-y-6">
            <AnimatedPanel className="overflow-x-auto">
                <p className="px-4 pt-4 text-sm font-semibold text-slate-950 dark:text-white">Rotas mais lentas (últimos 7 dias, {dados.amostra} pedidos analisados)</p>
                {dados.rotas.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Ainda sem pedidos suficientes.</p> : (
                    <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                        <thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className={th}>Rota</th><th className={cn(th, "text-right")}>Pedidos</th><th className={cn(th, "text-right")}>Média</th><th className={cn(th, "text-right")}>p95</th><th className={cn(th, "text-right")}>Máx.</th><th className={cn(th, "text-right")}>BD (média)</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dados.rotas.map((r) => (
                                <tr key={r.rota}>
                                    <td className="px-4 py-2 font-mono text-xs text-slate-900 dark:text-white">{r.rota}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{r.pedidos}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{r.media_ms} ms</td>
                                    <td className="px-4 py-2 text-right"><StatusBadge tone={tom(r.p95_ms)}>{r.p95_ms} ms</StatusBadge></td>
                                    <td className="px-4 py-2 text-right tabular-nums">{r.max_ms} ms</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{r.bd_media_ms} ms</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AnimatedPanel>

            <AnimatedPanel className="overflow-x-auto">
                <p className="px-4 pt-4 text-sm font-semibold text-slate-950 dark:text-white">Consultas SQL mais pesadas</p>
                {!consultas.disponivel ? <p className="p-6 text-sm text-slate-500">{consultas.motivo}</p> : (
                    <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                        <thead className="bg-slate-50 text-left dark:bg-slate-900"><tr><th className={th}>Consulta (valores normalizados)</th><th className={cn(th, "text-right")}>Chamadas</th><th className={cn(th, "text-right")}>Média</th><th className={cn(th, "text-right")}>Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {consultas.consultas.map((c, i) => (
                                <tr key={i} className="align-top"><td className="max-w-xl break-words px-4 py-2 font-mono text-xs text-slate-800 dark:text-slate-200">{c.consulta}</td><td className="px-4 py-2 text-right tabular-nums">{c.chamadas}</td><td className="px-4 py-2 text-right tabular-nums">{c.media_ms} ms</td><td className="px-4 py-2 text-right tabular-nums">{c.total_ms} ms</td></tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </AnimatedPanel>
        </div>
    );
}

export default function Analise({ aba, dados }) {
    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Análise de dados</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Qualidade, crescimento, índices e lentidão. Só leitura.</p>
                </div>
            }
        >
            <Head title="Análise de dados" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                        {abas.map((item) => (
                            <Link key={item.chave} href={`/dev/analise?aba=${item.chave}`} className={cn("border-b-2 px-4 py-2 text-sm font-semibold transition", aba === item.chave ? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400")}>
                                {item.label}
                            </Link>
                        ))}
                    </div>
                    {aba === "qualidade" && <Qualidade dados={dados} />}
                    {aba === "crescimento" && <Crescimento dados={dados} />}
                    {aba === "indices" && <Indices dados={dados} />}
                    {aba === "lentidao" && <Lentidao dados={dados} />}
                </div>
            </div>
        </DevLayout>
    );
}
