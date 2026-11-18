import { Head, router, useForm } from "@inertiajs/react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import CabecalhoLista from "@/Components/CabecalhoLista";
import EstadoVazio from "@/Components/EstadoVazio";
import StatusBadge from "@/Components/StatusBadge";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/Components/ConfirmDialog";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import BarraProgresso from "@/Components/BarraProgresso";
import useAbrirNovo from "@/hooks/useAbrirNovo";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Index({ zonas, semZona, mesCiclo }) {
    const [texto, setTexto] = useState("");
    const [filtro, setFiltro] = useState("todas");
    const [editando, setEditando] = useState(null); // null = fechado, {} = nova, zona = editar
    const [paraApagar, setParaApagar] = useState(null);
    const form = useForm({ nome: "" });

    const abrir = (zona = {}) => {
        form.setData("nome", zona.nome ?? "");
        form.clearErrors();
        setEditando(zona);
    };
    useAbrirNovo(() => abrir());
    useEffect(() => {
        const zonaId = new URLSearchParams(window.location.search).get("editar");
        if (!zonaId) return;
        const zona = zonas.find((item) => String(item.id) === zonaId);
        if (zona) {
            abrir(zona);
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [zonas]);

    const guardar = (evento) => {
        evento.preventDefault();
        const opcoes = { preserveScroll: true, onSuccess: () => setEditando(null) };
        if (editando?.id) form.put(`/zonas/${editando.id}`, opcoes);
        else form.post("/zonas", opcoes);
    };

    const activosTotal = zonas.reduce((t, z) => t + (z.activos ?? 0), 0);
    const maxActivos = Math.max(1, ...zonas.map((z) => z.activos ?? 0));
    const termo = texto.trim().toLowerCase();
    const linhas = zonas
        .filter((z) => (filtro === "com" ? z.clientes_count > 0 : filtro === "sem" ? z.clientes_count === 0 : true))
        .filter((z) => !termo || z.nome.toLowerCase().includes(termo));
    const chips = [
        ["todas", "Todas", zonas.length],
        ["com", "Com clientes", zonas.filter((z) => z.clientes_count > 0).length],
        ["sem", "Sem clientes", zonas.filter((z) => z.clientes_count === 0).length],
    ];
    const mes = MESES[(mesCiclo ?? 1) - 1];

    return (
        <AdminLayout>
            <Head title="Zonas" />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CabecalhoLista
                    contexto="Cadastro"
                    titulo="Zonas"
                    resumo={`${zonas.length} ${zonas.length === 1 ? "zona" : "zonas"} · ${activosTotal} clientes activos · as rondas de leitura seguem esta divisão.`}
                >
                    <PrimaryButton type="button" onClick={() => abrir()} className="min-h-[48px] px-[22px]">
                        <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                        Nova zona
                    </PrimaryButton>
                </CabecalhoLista>

                {semZona > 0 && (
                    <p className="rounded-[14px] bg-amber-50 px-[18px] py-3.5 text-[15px] text-amber-700 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300">
                        {semZona} {semZona === 1 ? "cliente ainda não tem zona" : "clientes ainda não têm zona"}. Escolha-a ao editar o cliente.
                    </p>
                )}

                <AnimatedPanel className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E8ECF4] px-[18px] py-3.5 dark:border-slate-800">
                        <label className="flex min-h-[44px] flex-[1_1_240px] items-center gap-2.5 rounded-[10px] border border-[#DDE2EE] px-3 focus-within:border-cyan-500 dark:border-slate-800 dark:bg-[#1E232D]">
                            <Search className="h-[18px] w-[18px] text-slate-500" aria-hidden="true" />
                            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Procurar zona ou bairro" aria-label="Procurar zona" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]" />
                        </label>
                        <div role="group" aria-label="Filtrar zonas" className="flex flex-wrap gap-2">
                            {chips.map(([chave, rotulo, n]) => (
                                <button
                                    key={chave}
                                    type="button"
                                    aria-pressed={filtro === chave}
                                    onClick={() => setFiltro(chave)}
                                    className={cn(
                                        "min-h-[40px] rounded-full border px-3.5 text-sm font-semibold",
                                        filtro === chave
                                            ? "border-[#B9CCFF] bg-cyan-100 text-brand dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300"
                                            : "border-[#DDE2EE] text-ink hover:bg-slate-50 dark:border-slate-800 dark:text-[#F2F5FB]",
                                    )}
                                >
                                    {rotulo} <span className="tabular-nums opacity-80">{n}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {linhas.length === 0 ? (
                        <EstadoVazio ilustracao="pesquisa" titulo={termo ? `Nenhuma zona com “${texto}”` : "Ainda não há zonas"}>
                            Confirme o nome ou crie uma zona nova.
                        </EstadoVazio>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-[#E8ECF4] bg-[#F7F9FD] text-xs font-bold tracking-[0.6px] text-slate-500 dark:border-slate-800 dark:bg-white/[0.02] dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">ZONA</th>
                                        <th className="px-3 py-3">CLIENTES</th>
                                        <th className="px-3 py-3">LIDOS EM {mes.toUpperCase()}</th>
                                        <th className="px-3 py-3">EM ATRASO</th>
                                        <th className="px-3 py-3">OCORRÊNCIAS</th>
                                        <th className="px-6 py-3"><span className="sr-only">Acções</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                                    {linhas.map((zona) => (
                                        <tr key={zona.id}>
                                            <td className="px-6 py-3.5">
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{zona.nome}</strong>
                                                    {zona.clientes_count === 0 && <StatusBadge tone="slate">Sem clientes</StatusBadge>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                <span className="flex items-center gap-3">
                                                    <span className="w-8 text-right tabular-nums text-ink dark:text-[#F2F5FB]">{zona.activos}</span>
                                                    <BarraProgresso pct={((zona.activos ?? 0) / maxActivos) * 100} className="h-1.5 w-[120px]" />
                                                </span>
                                            </td>
                                            <td className="px-3 py-3.5 tabular-nums text-slate-600 dark:text-slate-300">
                                                {zona.activos > 0 ? `${zona.lidos} de ${zona.activos}` : "—"}
                                            </td>
                                            <td className="px-3 py-3.5">
                                                {zona.em_atraso > 0 ? (
                                                    <StatusBadge tone="amber">{zona.em_atraso} {zona.em_atraso === 1 ? "cliente" : "clientes"}</StatusBadge>
                                                ) : (
                                                    <span className="text-slate-500 dark:text-slate-400">Em dia</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
                                                {zona.ocorrencias_abertas > 0 ? (
                                                    <StatusBadge tone="amber">{zona.ocorrencias_abertas} abertas</StatusBadge>
                                                ) : (
                                                    "0 abertas"
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className="flex justify-end gap-1">
                                                    <button type="button" onClick={() => abrir(zona)} aria-label={`Editar ${zona.nome}`} className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-slate-500 hover:bg-slate-50 hover:text-ink dark:hover:bg-white/[0.06]">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    {zona.clientes_count === 0 && (
                                                        <button type="button" onClick={() => setParaApagar(zona)} aria-label={`Apagar ${zona.nome}`} className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-white/[0.06]">
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AnimatedPanel>
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
                title="Apagar esta zona?"
                confirmLabel="Apagar"
                tone="simples"
                description={paraApagar ? `A zona "${paraApagar.nome}" não tem clientes e deixa de aparecer nas listas.` : ""}
            />
        </AdminLayout>
    );
}
