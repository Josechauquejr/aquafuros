import { Head, router, useForm } from "@inertiajs/react";
import { CheckCircle2, Circle, ClipboardList, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import IconButton from "@/Components/IconButton";
import InputLabel from "@/Components/InputLabel";
import PrimaryButton from "@/Components/PrimaryButton";
import Textarea from "@/Components/Textarea";
import TextInput from "@/Components/TextInput";
import { cn } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

export default function Tarefas({ tarefas }) {
    const form = useForm({ titulo: "", descricao: "" });

    const pendentes = tarefas.filter((t) => !t.concluida);
    const concluidas = tarefas.filter((t) => t.concluida);

    const submit = (event) => {
        event.preventDefault();
        if (!form.data.titulo.trim()) return;
        form.post("/dev/tarefas", { onSuccess: () => form.reset() });
    };

    const alternar = (tarefa) => {
        router.put(`/dev/tarefas/${tarefa.id}`, { concluida: !tarefa.concluida }, { preserveScroll: true });
    };

    const eliminar = (tarefa) => {
        router.delete(`/dev/tarefas/${tarefa.id}`, { preserveScroll: true });
    };

    return (
        <DevLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Desenvolvedor</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Checklist</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Lista pessoal de tarefas técnicas por resolver.
                    </p>
                </div>
            }
        >
            <Head title="Checklist" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel delay={0.1} className="p-4">
                        <form onSubmit={submit} className="space-y-3">
                            <div>
                                <InputLabel htmlFor="titulo_tarefa" value="Título" />
                                <TextInput
                                    id="titulo_tarefa"
                                    value={form.data.titulo}
                                    onChange={(event) => form.setData("titulo", event.target.value)}
                                    placeholder="Nova tarefa..."
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="descricao_tarefa" value="Descrição (opcional)" />
                                <Textarea
                                    id="descricao_tarefa"
                                    value={form.data.descricao}
                                    onChange={(event) => form.setData("descricao", event.target.value)}
                                    placeholder="Detalhes, passos, notas..."
                                    rows={3}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div className="flex justify-end">
                                <PrimaryButton type="submit" disabled={form.processing || !form.data.titulo.trim()}>
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Adicionar
                                </PrimaryButton>
                            </div>
                        </form>
                    </AnimatedPanel>

                    <AnimatedPanel delay={0.16} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                                <ClipboardList className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Por fazer ({pendentes.length})
                            </h3>
                        </div>
                        {pendentes.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                Sem tarefas pendentes.
                            </p>
                        ) : (
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                {pendentes.map((tarefa) => (
                                    <motion.div key={tarefa.id} variants={itemVariants} className="flex items-start gap-3 px-6 py-3">
                                        <button type="button" onClick={() => alternar(tarefa)} className="mt-0.5 text-slate-400 transition hover:text-emerald-600">
                                            <Circle className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-900 dark:text-white">{tarefa.titulo}</p>
                                            {tarefa.descricao && (
                                                <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500 dark:text-slate-400">
                                                    {tarefa.descricao}
                                                </p>
                                            )}
                                        </div>
                                        <IconButton tone="danger" onClick={() => eliminar(tarefa)} title="Eliminar">
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </IconButton>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatedPanel>

                    {concluidas.length > 0 && (
                        <AnimatedPanel delay={0.22} className="overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                                <h3 className="font-semibold text-slate-950 dark:text-white">Concluídas ({concluidas.length})</h3>
                            </div>
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                {concluidas.map((tarefa) => (
                                    <motion.div key={tarefa.id} variants={itemVariants} className="flex items-start gap-3 px-6 py-3">
                                        <button type="button" onClick={() => alternar(tarefa)} className="mt-0.5 text-emerald-600">
                                            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                        <div className="flex-1">
                                            <p className={cn("text-sm text-slate-500 line-through dark:text-slate-500")}>{tarefa.titulo}</p>
                                            {tarefa.descricao && (
                                                <p className="mt-0.5 whitespace-pre-line text-xs text-slate-400 line-through dark:text-slate-600">
                                                    {tarefa.descricao}
                                                </p>
                                            )}
                                        </div>
                                        <IconButton tone="danger" onClick={() => eliminar(tarefa)} title="Eliminar">
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </IconButton>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatedPanel>
                    )}
                </div>
            </div>
        </DevLayout>
    );
}
