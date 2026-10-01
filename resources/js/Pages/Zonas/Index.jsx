import { Head, router, useForm } from "@inertiajs/react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";

export default function Index({ zonas, semZona }) {
    const [editando, setEditando] = useState(null); // null = fechado, {} = nova, zona = editar
    const [paraApagar, setParaApagar] = useState(null);
    const form = useForm({ nome: "" });

    const abrir = (zona = {}) => {
        form.setData("nome", zona.nome ?? "");
        form.clearErrors();
        setEditando(zona);
    };

    const guardar = (evento) => {
        evento.preventDefault();
        const opcoes = { preserveScroll: true, onSuccess: () => setEditando(null) };
        if (editando?.id) form.put(`/zonas/${editando.id}`, opcoes);
        else form.post("/zonas", opcoes);
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Administração</p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Zonas</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Bairros de abastecimento. Cada cliente pertence a uma zona; os KPIs, as ocorrências e a produção de água usam-nas.
                        </p>
                    </div>
                    <PrimaryButton type="button" onClick={() => abrir()}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Nova zona
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Zonas" />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-3xl space-y-4 px-4 sm:px-6 lg:px-8">
                    {semZona > 0 && (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                            {semZona} cliente(s) ainda sem zona — escolha-a ao editar o cliente.
                        </p>
                    )}
                    <AnimatedPanel className="overflow-hidden">
                        {zonas.length === 0 ? (
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Ainda não há zonas.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {zonas.map((zona) => (
                                    <li key={zona.id} className="flex items-center justify-between gap-3 px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                            <span className="font-medium text-slate-900 dark:text-white">{zona.nome}</span>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">{zona.clientes_count} cliente(s)</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <SecondaryButton type="button" onClick={() => abrir(zona)} aria-label={`Editar ${zona.nome}`}>
                                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                            </SecondaryButton>
                                            <SecondaryButton type="button" onClick={() => setParaApagar(zona)} aria-label={`Apagar ${zona.nome}`}>
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </SecondaryButton>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </AnimatedPanel>
                </div>
            </div>

            <Modal show={editando !== null} onClose={() => setEditando(null)} title={editando?.id ? "Editar zona" : "Nova zona"} maxWidth="md">
                <form onSubmit={guardar} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="nome_zona" value="Nome da zona" />
                        <TextInput id="nome_zona" value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} className="mt-1 block w-full" autoFocus required />
                        <InputError message={form.errors.nome} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setEditando(null)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={form.processing}>Guardar</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraApagar)}
                onClose={() => setParaApagar(null)}
                onConfirm={() => router.delete(`/zonas/${paraApagar.id}`, { preserveScroll: true, onFinish: () => setParaApagar(null) })}
                title="Apagar zona"
                confirmLabel="Apagar"
                description={paraApagar ? `Apagar a zona "${paraApagar.nome}"? Só é possível se não tiver clientes.` : ""}
            />
        </AdminLayout>
    );
}
