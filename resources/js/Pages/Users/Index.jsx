import { Head, router, useForm, usePage } from "@inertiajs/react";
import { Check, Copy, KeyRound, Pencil, Plus, Search, Shield, ShieldCheck, Trash2, UserCheck, Users as UsersIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const roleConfig = {
    administrador: { label: "Administrador", tone: "rose" },
    desenvolvedor: { label: "Desenvolvedor", tone: "slate" },
    gestor: { label: "Gestor", tone: "cyan" },
    caixa: { label: "Caixa", tone: "amber" },
    tecnico: { label: "Técnico", tone: "emerald" },
};

const formVazio = { name: "", username: "", email: "", telefone: "", papel: "gestor", is_active: true };

export default function Index({ usuarios, papeis, filtros }) {
    const { flash, auth } = usePage().props;
    const [search, setSearch] = useState(filtros.search ?? "");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraRepor, setParaRepor] = useState(null);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [senhaRevelada, setSenhaRevelada] = useState(null);
    const [copiado, setCopiado] = useState(false);
    const ultimaSenhaTratadaRef = useRef(null);

    const form = useForm(formVazio);
    const resetForm = useForm({});
    const deleteForm = useForm({});

    const dados = usuarios.data;

    const aplicarFiltros = (novosFiltros) => {
        router.get("/dev/users", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Depois de criar um utilizador ou repor uma senha, a senha gerada só
    // aparece uma vez — desduplicada pela combinação username+senha, para
    // nunca reabrir o modal numa navegação posterior não relacionada.
    useEffect(() => {
        const nova = flash.novaSenha;
        if (!nova) return;
        const chave = `${nova.username}:${nova.senha}`;
        if (chave !== ultimaSenhaTratadaRef.current) {
            ultimaSenhaTratadaRef.current = chave;
            setSenhaRevelada(nova);
            setCopiado(false);
        }
    }, [flash.novaSenha]);

    const mudarPapel = (papel) => aplicarFiltros({ papel });
    const mudarEstado = (estado) => aplicarFiltros({ estado });

    const activos = dados.filter((u) => u.is_active).length;
    const administradores = dados.filter((u) => u.roles?.some((r) => r.name === "administrador")).length;

    const metrics = [
        { label: "Utilizadores nesta página", value: dados.length, icon: UsersIcon, tone: "cyan" },
        { label: "Activos nesta página", value: activos, icon: UserCheck, tone: "emerald" },
        { label: "Administradores nesta página", value: administradores, icon: ShieldCheck, tone: "rose" },
        { label: "Perfis distintos", value: papeis.length, icon: Shield, tone: "amber" },
    ];

    const abrirNovo = () => {
        setEditando(null);
        form.reset();
        form.setData(formVazio);
        form.clearErrors();
        setShowModal(true);
    };

    const abrirEdicao = (user) => {
        setEditando(user);
        form.setData({
            name: user.name,
            username: user.username,
            email: user.email,
            telefone: user.telefone ?? "",
            papel: user.roles?.[0]?.name ?? "gestor",
            is_active: user.is_active,
        });
        form.clearErrors();
        setShowModal(true);
    };

    const submit = (event) => {
        event.preventDefault();

        if (editando) {
            form.put(`/dev/users/${editando.id}`, { onSuccess: () => setShowModal(false) });
        } else {
            form.post("/dev/users", { onSuccess: () => setShowModal(false) });
        }
    };

    const confirmarReposicao = () => {
        if (!paraRepor) return;
        resetForm.post(`/dev/users/${paraRepor.id}/reset-password`, { onFinish: () => setParaRepor(null), preserveScroll: true });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        deleteForm.delete(`/dev/users/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    const copiarSenha = async () => {
        if (!senhaRevelada) return;
        try {
            await navigator.clipboard.writeText(senhaRevelada.senha);
            setCopiado(true);
        } catch {
            // clipboard indisponível (ex.: sem HTTPS) — o utilizador copia manualmente
        }
    };

    return (
        <DevLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Controlo de acesso
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Gestão de Usuários
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Contas com acesso ao sistema e respectivas funções.
                        </p>
                    </div>
                    <AnimatedButton variant="primary" onClick={abrirNovo}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Novo usuário
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Usuários" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <AnimatedPanel delay={0.2} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden="true"
                                />
                                <TextInput
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Pesquisar por nome, username ou email..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.papel}
                                onChange={(event) => mudarPapel(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todas as funções</option>
                                {papeis.map((papel) => (
                                    <option key={papel} value={papel}>
                                        {roleConfig[papel]?.label ?? papel}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filtros.estado}
                                onChange={(event) => mudarEstado(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os estados</option>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum usuário encontrado para os filtros seleccionados.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <>
                            {/* Cartões — visíveis apenas em telas pequenas (mobile) */}
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3 sm:hidden">
                                {dados.map((user) => {
                                    const papel = user.roles?.[0]?.name;
                                    const role = roleConfig[papel] ?? { label: papel ?? "—", tone: "slate" };
                                    const iniciais = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

                                    return (
                                        <motion.div
                                            key={user.id}
                                            variants={itemVariants}
                                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-sm font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                                        {iniciais}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge tone={user.is_active ? "emerald" : "slate"}>
                                                    {user.is_active ? "Activo" : "Inactivo"}
                                                </StatusBadge>
                                            </div>

                                            <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                                                <p>{user.email}</p>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                                                <div className="flex items-center gap-1">
                                                    <IconButton onClick={() => setParaRepor(user)} title="Repor senha">
                                                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton onClick={() => abrirEdicao(user)} title="Editar usuário">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    {user.id !== auth.user.id && (
                                                        <IconButton tone="danger" onClick={() => setParaEliminar(user)} title="Eliminar usuário">
                                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                        </IconButton>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {/* Tabela — visível a partir de sm (tablet/desktop) */}
                            <AnimatedPanel delay={0.28} className="hidden overflow-hidden sm:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Usuário</th>
                                                <th className="px-6 py-3">Email</th>
                                                <th className="px-6 py-3">Função</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Criado em</th>
                                                <th className="px-6 py-3 text-right">Acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            variants={listVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="divide-y divide-slate-100 dark:divide-slate-800"
                                        >
                                            {dados.map((user) => {
                                                const papel = user.roles?.[0]?.name;
                                                const role = roleConfig[papel] ?? { label: papel ?? "—", tone: "slate" };

                                                return (
                                                    <motion.tr
                                                        key={user.id}
                                                        variants={itemVariants}
                                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-sm font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                                                    {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400">@{user.username}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{user.email}</td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={user.is_active ? "emerald" : "slate"}>
                                                                {user.is_active ? "Activo" : "Inactivo"}
                                                            </StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                                            {formatDateTime(user.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <IconButton onClick={() => setParaRepor(user)} title="Repor senha">
                                                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton onClick={() => abrirEdicao(user)} title="Editar usuário">
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                {user.id !== auth.user.id && (
                                                                    <IconButton tone="danger" onClick={() => setParaEliminar(user)} title="Eliminar usuário">
                                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                    </IconButton>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </motion.tbody>
                                    </table>
                                </div>
                            </AnimatedPanel>
                            <Pagination paginador={usuarios} />
                        </>
                    )}
                </div>
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editando ? `Editar ${editando.name}` : "Novo usuário"}
                maxWidth="lg"
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="name" value="Nome completo" />
                            <TextInput
                                id="name"
                                required
                                value={form.data.name}
                                onChange={(event) => form.setData("name", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={form.errors.name} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="username" value="Username" />
                            <TextInput
                                id="username"
                                required
                                value={form.data.username}
                                onChange={(event) => form.setData("username", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={form.errors.username} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="email" value="Email" />
                            <TextInput
                                id="email"
                                type="email"
                                required
                                value={form.data.email}
                                onChange={(event) => form.setData("email", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={form.errors.email} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="telefone" value="Telefone (opcional)" />
                            <TextInput
                                id="telefone"
                                value={form.data.telefone}
                                onChange={(event) => form.setData("telefone", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="+258 8..."
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="papel" value="Função" />
                        <select
                            id="papel"
                            value={form.data.papel}
                            onChange={(event) => form.setData("papel", event.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            {papeis.map((papel) => (
                                <option key={papel} value={papel}>
                                    {roleConfig[papel]?.label ?? papel}
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData("is_active", event.target.checked)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                        Conta activa
                    </label>

                    {!editando && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Uma senha temporária é gerada automaticamente e mostrada uma única vez ao guardar.
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>
                            {editando ? "Guardar alterações" : "Criar usuário"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraRepor)}
                onClose={() => setParaRepor(null)}
                onConfirm={confirmarReposicao}
                title="Repor senha"
                tone="primary"
                confirmLabel="Repor senha"
                description={
                    paraRepor
                        ? `Gerar uma nova senha temporária para ${paraRepor.name}? A senha actual deixa de funcionar imediatamente.`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar usuário"
                tone="danger"
                confirmLabel="Eliminar"
                description={
                    paraEliminar
                        ? `Eliminar ${paraEliminar.name} (@${paraEliminar.username})? Esta acção não pode ser desfeita.`
                        : ""
                }
            />

            <Modal show={Boolean(senhaRevelada)} onClose={() => setSenhaRevelada(null)} title="Senha gerada" maxWidth="sm">
                {senhaRevelada && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Transmita esta senha a <strong>{senhaRevelada.utilizador}</strong> (@{senhaRevelada.username}) —
                            só é mostrada uma vez.
                        </p>
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                            <code className="flex-1 select-all font-mono text-base font-semibold text-slate-900 dark:text-white">
                                {senhaRevelada.senha}
                            </code>
                            <IconButton onClick={copiarSenha} title="Copiar">
                                {copiado ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                            </IconButton>
                        </div>
                        <div className="flex justify-end pt-2">
                            <PrimaryButton type="button" onClick={() => setSenhaRevelada(null)}>
                                Concluído
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </DevLayout>
    );
}
