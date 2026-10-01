import { Head, Link, useForm } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import DangerButton from "@/Components/DangerButton";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import { cn } from "@/lib/utils";

const seleccao = "mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function Editar({ tabela, id, titulo, campos, valores, palavra }) {
    const inicial = Object.fromEntries(campos.map((c) => [c.nome, valores[c.nome] ?? ""]));
    const form = useForm({ ...inicial, confirmacao: "" });
    const mudou = (nome) => String(form.data[nome] ?? "") !== String(inicial[nome] ?? "");
    const alterados = campos.filter((c) => mudou(c.nome));

    return (
        <DevLayout
            header={
                <div>
                    <Link href={`/dev/dados/${tabela}/registo/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tabela} #{id}
                    </Link>
                    <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">Editar: {titulo}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Validação igual à da aplicação. Só estes campos se podem alterar; valores financeiros mudam-se pelos fluxos do sistema.</p>
                </div>
            }
        >
            <Head title={`Editar ${tabela} #${id}`} />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="p-6">
                        <form onSubmit={(e) => { e.preventDefault(); form.put(`/dev/editar/${tabela}/${id}`, { preserveScroll: true }); }} className="space-y-4">
                            {campos.map((c) => (
                                <div key={c.nome} className={cn("rounded-md", mudou(c.nome) && "bg-amber-50 p-2 dark:bg-amber-950/20")}>
                                    <InputLabel htmlFor={c.nome} value={c.rotulo} />
                                    {c.tipo === "select" ? (
                                        <select id={c.nome} value={form.data[c.nome] ?? ""} onChange={(e) => form.setData(c.nome, e.target.value)} className={seleccao}>
                                            {!c.obrigatorio && <option value="">(nenhuma)</option>}
                                            {c.opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                                        </select>
                                    ) : (
                                        <TextInput id={c.nome} type={c.tipo} value={form.data[c.nome] ?? ""} onChange={(e) => form.setData(c.nome, e.target.value)} className="mt-1 block w-full" />
                                    )}
                                    {mudou(c.nome) && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Antes: {String(inicial[c.nome] === "" ? "(vazio)" : inicial[c.nome])}</p>}
                                    <InputError message={form.errors[c.nome]} className="mt-1" />
                                </div>
                            ))}

                            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                                <InputLabel htmlFor="confirmacao" value={`Para confirmar, escreva ${palavra}`} />
                                <TextInput id="confirmacao" value={form.data.confirmacao} onChange={(e) => form.setData("confirmacao", e.target.value)} autoComplete="off" className="mt-1 block w-full font-mono" />
                                <InputError message={form.errors.confirmacao} className="mt-1" />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-slate-500">{alterados.length === 0 ? "Sem alterações." : `${alterados.length} campo(s) a alterar. Fica snapshot e auditoria.`}</p>
                                <div className="flex gap-3">
                                    <Link href={`/dev/dados/${tabela}/registo/${id}`}><SecondaryButton type="button">Cancelar</SecondaryButton></Link>
                                    <DangerButton type="submit" disabled={form.processing || alterados.length === 0 || form.data.confirmacao.trim() !== palavra}>Guardar</DangerButton>
                                </div>
                            </div>
                        </form>
                    </AnimatedPanel>
                </div>
            </div>
        </DevLayout>
    );
}
