import { Head, router, useForm } from "@inertiajs/react";
import { AlertTriangle, Lock, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmarComTexto from "@/Components/ConfirmarComTexto";
import InputError from "@/Components/InputError";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { formatDateTime } from "@/lib/utils";

function Operacao({ op }) {
    const form = useForm({
        operacao: op.chave,
        parametros: Object.fromEntries(op.parametros.map((p) => [p.nome, p.omissao])),
    });

    return (
        <AnimatedPanel className="p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-950 dark:text-white">{op.titulo}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{op.descricao}</p>
                </div>
                <StatusBadge tone={op.reversivel ? "emerald" : "rose"}>{op.reversivel ? "Reversível" : "Irreversível"}</StatusBadge>
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post("/dev/alteracoes/previa", { preserveScroll: true });
                }}
                className="mt-4 flex flex-wrap items-end gap-3"
            >
                {op.parametros.map((p) => (
                    <div key={p.nome}>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor={`${op.chave}-${p.nome}`}>{p.rotulo}</label>
                        <TextInput
                            id={`${op.chave}-${p.nome}`}
                            type="number"
                            min={p.min}
                            max={p.max}
                            value={form.data.parametros[p.nome]}
                            onChange={(e) => form.setData("parametros", { ...form.data.parametros, [p.nome]: e.target.value })}
                            className="mt-1 w-32"
                        />
                        <InputError message={form.errors[`parametros.${p.nome}`]} className="mt-1" />
                    </div>
                ))}
                <SecondaryButton type="submit" disabled={form.processing}>{form.processing ? "A calcular…" : "Pré-visualizar"}</SecondaryButton>
            </form>
        </AnimatedPanel>
    );
}

export default function Alteracoes({ activa, producao, palavra, operacoes, previa, historico }) {
    const [confirmar, setConfirmar] = useState(null);
    const painelPrevia = useRef(null);

    // A pré-visualização aparece no topo: leva-a para a vista (quem clicou mais abaixo não veria nada).
    useEffect(() => {
        if (previa) painelPrevia.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [previa]);

    const pedirExecucao = () =>
        setConfirmar({
            metodo: "post",
            url: "/dev/alteracoes/executar",
            dados: { operacao: previa.chave, parametros: previa.parametros, marca: previa.marca },
            titulo: previa.titulo,
            descricao: `${previa.total} registo(s) serão ${previa.reversivel ? "alterados (com snapshot, pode desfazer)" : "APAGADOS DE VEZ"}.${producao ? " Está em PRODUÇÃO." : ""}`,
            rotulo: "Executar",
        });

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Alterações de dados</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Lista fechada de operações, sempre com pré-visualização, snapshot e auditoria. Nunca SQL livre.
                    </p>
                </div>
            }
        >
            <Head title="Alterações de dados" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="flex items-start gap-3 p-5">
                        {activa ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" /> : <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />}
                        <div className="text-sm">
                            <p className="font-semibold text-slate-950 dark:text-white">
                                {activa ? "Alterações LIGADAS" : "Alterações desligadas"}
                                {producao && <span className="ml-2 text-rose-600">(produção)</span>}
                            </p>
                            <p className="mt-1 text-slate-600 dark:text-slate-300">
                                {activa
                                    ? <>Cada acção pede a senha e escrever <strong className="font-mono">{palavra}</strong>. Desligue a variável <span className="font-mono">DEV_ESCRITA</span> quando acabar.</>
                                    : <>Para as usar, defina <span className="font-mono">DEV_ESCRITA=true</span> nas variáveis de ambiente (Railway: Variables) e volte a desligar depois. Enquanto estiver desligada, o servidor recusa qualquer alteração.</>}
                            </p>
                        </div>
                    </AnimatedPanel>

                    {previa && (
                        <AnimatedPanel className="scroll-mt-20 border-amber-300 p-5 dark:border-amber-700">
                            <span ref={painelPrevia} />
                            <h3 className="font-semibold text-slate-950 dark:text-white">Pré-visualização: {previa.titulo}</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                <strong>{previa.total}</strong> registo(s) afectado(s). {previa.reversivel ? "Fica um snapshot para desfazer." : "Não é reversível."}
                            </p>
                            {previa.recusada && <p className="mt-2 rounded-md bg-rose-50 p-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{previa.recusada}</p>}
                            {previa.amostra.length > 0 && (
                                <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-auto rounded-md border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
                                    {previa.amostra.map((a) => (
                                        <li key={a.id} className="flex gap-3 px-3 py-2"><span className="w-14 shrink-0 font-mono text-xs text-slate-500">#{a.id}</span><span className="text-slate-800 dark:text-slate-200">{a.resumo}</span></li>
                                    ))}
                                </ul>
                            )}
                            {previa.total > previa.amostra.length && <p className="mt-1 text-xs text-slate-500">A mostrar os primeiros {previa.amostra.length} de {previa.total}.</p>}
                            {!activa && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Só está a ver a pré-visualização. Para <strong>executar</strong>, ligue <span className="font-mono">DEV_ESCRITA=true</span> nas variáveis de ambiente.</p>}
                            <div className="mt-4 flex gap-3">
                                <SecondaryButton type="button" onClick={() => router.get("/dev/alteracoes")}>Cancelar</SecondaryButton>
                                <button
                                    type="button"
                                    disabled={previa.total === 0 || Boolean(previa.recusada) || !activa}
                                    onClick={pedirExecucao}
                                    className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold uppercase text-white hover:bg-red-500 disabled:opacity-50"
                                >
                                    Executar sobre estes {previa.total}
                                </button>
                            </div>
                        </AnimatedPanel>
                    )}

                    <div className="space-y-4">
                        {operacoes.map((op) => <Operacao key={op.chave} op={op} />)}
                    </div>

                    <AnimatedPanel className="overflow-x-auto">
                        <p className="px-5 pt-5 font-semibold text-slate-950 dark:text-white">Histórico de alterações</p>
                        {historico.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Ainda sem alterações.</p> : (
                            <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                    <tr><th className="px-4 py-3">Quando</th><th className="px-4 py-3">Quem</th><th className="px-4 py-3">Acção</th><th className="px-4 py-3 text-right">Linhas</th><th className="px-4 py-3 text-right">Estado</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {historico.map((h) => (
                                        <tr key={h.id}>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(h.em)}</td>
                                            <td className="px-4 py-3 text-slate-900 dark:text-white">{h.por ?? "—"}</td>
                                            <td className="px-4 py-3 font-mono text-xs">{h.acao} <span className="text-slate-400">({h.tabela})</span></td>
                                            <td className="px-4 py-3 text-right tabular-nums">{h.total}</td>
                                            <td className="px-4 py-3 text-right">
                                                {h.desfeita_em ? <StatusBadge tone="slate">Desfeita</StatusBadge>
                                                    : h.reversivel ? (
                                                        <SecondaryButton type="button" disabled={!activa} onClick={() => setConfirmar({ metodo: "post", url: `/dev/alteracoes/${h.id}/desfazer`, titulo: "Desfazer alteração", descricao: `Repõe os valores de antes em ${h.total} registo(s). Só avança se nada mudou depois.`, rotulo: "Desfazer" })}>
                                                            <Undo2 className="mr-1 h-3 w-3" aria-hidden="true" /> Desfazer
                                                        </SecondaryButton>
                                                    ) : <StatusBadge tone="rose">Irreversível</StatusBadge>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </AnimatedPanel>
                </div>
            </div>

            <ConfirmarComTexto accao={confirmar ? { metodo: confirmar.metodo, url: confirmar.url, dados: confirmar.dados } : null} palavra={palavra} titulo={confirmar?.titulo} descricao={confirmar?.descricao} rotulo={confirmar?.rotulo} onClose={() => setConfirmar(null)} />
        </DevLayout>
    );
}
