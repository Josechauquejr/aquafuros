import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    CheckCircle2,
    Clock,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
    Waves,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const hoje = new Date();

const formVazio = {
    cliente_id: "",
    mes: hoje.getMonth() + 1,
    ano: hoje.getFullYear(),
    leitura_actual: "",
};

export default function Index({ leituras, clientes, totais, filtros }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filtros.search ?? "");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [leituraParaFacturar, setLeituraParaFacturar] = useState(null);

    const form = useForm(formVazio);

    const dados = leituras.data;

    const aplicarFiltros = (novosFiltros) => {
        router.get("/leituras", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const mudarEstadoFiltro = (estado) => aplicarFiltros({ estado });

    const metrics = [
        { label: "Total de leituras", value: totais.total, icon: Waves, tone: "cyan" },
        { label: "Confirmadas", value: totais.confirmadas, icon: CheckCircle2, tone: "emerald" },
        { label: "Pendentes de confirmação", value: totais.pendentes, icon: Clock, tone: "amber" },
        { label: "Confirmadas sem factura", value: totais.semFactura, icon: FileText, tone: "rose" },
    ];

    const abrirNova = () => {
        setEditando(null);
        form.reset();
        form.setData({ ...formVazio, cliente_id: clientes[0]?.id ?? "" });
        form.clearErrors();
        setShowModal(true);
    };

    const abrirEdicao = (leitura) => {
        setEditando(leitura);
        form.setData({
            cliente_id: leitura.cliente_id,
            mes: leitura.mes,
            ano: leitura.ano,
            leitura_actual: leitura.leitura_actual,
        });
        form.clearErrors();
        setShowModal(true);
    };

    const submit = (event) => {
        event.preventDefault();

        if (editando) {
            form.transform((data) => ({ leitura_actual: data.leitura_actual, confirmado: editando.confirmado }))
                .put(`/leituras/${editando.id}`, { onSuccess: () => setShowModal(false) });
        } else {
            form.post("/leituras", { onSuccess: () => setShowModal(false) });
        }
    };

    const confirmarLeitura = (leitura) => {
        router.put(
            `/leituras/${leitura.id}`,
            { leitura_actual: leitura.leitura_actual, confirmado: true },
            { preserveScroll: true, onSuccess: () => setLeituraParaFacturar(leitura) },
        );
    };

    const irParaEmitirFactura = () => {
        if (!leituraParaFacturar) return;
        router.visit(`/facturas?leitura_id=${leituraParaFacturar.id}`);
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/leituras/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Leituras de consumo
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Leituras
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Registo de leituras do contador — base para gerar facturas.
                        </p>
                    </div>
                    <AnimatedButton variant="primary" onClick={abrirNova} disabled={clientes.length === 0}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Nova leitura
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Leituras" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => {
                            const Icon = metric.icon;
                            const tones = {
                                cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
                                emerald:
                                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                                amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                                rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                            };

                            return (
                                <AnimatedPanel key={metric.label} delay={index * 0.06}>
                                    <div className="flex items-start justify-between p-5">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                                {metric.label}
                                            </p>
                                            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                                                {metric.value}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                "flex h-11 w-11 items-center justify-center rounded-md",
                                                tones[metric.tone],
                                            )}
                                        >
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                    </div>
                                </AnimatedPanel>
                            );
                        })}
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
                                    placeholder="Pesquisar por cliente..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.estado}
                                onChange={(event) => mudarEstadoFiltro(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os estados</option>
                                <option value="confirmada">Confirmada</option>
                                <option value="pendente">Pendente</option>
                            </select>
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma leitura encontrada para os filtros seleccionados.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <>
                            {/* Cartões — visíveis apenas em telas pequenas (mobile) */}
                            <motion.div
                                variants={listVariants}
                                initial="hidden"
                                animate="show"
                                className="space-y-3 sm:hidden"
                            >
                                {dados.map((leitura) => {
                                    const consumo = Number(leitura.leitura_actual) - Number(leitura.leitura_anterior);

                                    return (
                                        <motion.div
                                            key={leitura.id}
                                            variants={itemVariants}
                                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {leitura.cliente?.nome ?? "Cliente removido"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {meses[leitura.mes - 1]}/{leitura.ano}
                                                    </p>
                                                </div>
                                                <StatusBadge tone={leitura.confirmado ? "emerald" : "amber"}>
                                                    {leitura.confirmado ? "Confirmada" : "Pendente"}
                                                </StatusBadge>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                                                <span>
                                                    {Number(leitura.leitura_anterior).toFixed(2)} →{" "}
                                                    {Number(leitura.leitura_actual).toFixed(2)}
                                                </span>
                                                <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                                    {consumo.toFixed(2)} m&sup3;
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {leitura.registado_por?.name ?? "—"}
                                                    {leitura.confirmado && leitura.factura && (
                                                        <> &middot; {leitura.factura.numero_factura}</>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <IconButton
                                                        tone="success"
                                                        onClick={() => confirmarLeitura(leitura)}
                                                        disabled={leitura.confirmado}
                                                        title="Confirmar leitura"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => abrirEdicao(leitura)}
                                                        disabled={leitura.confirmado}
                                                        title={leitura.confirmado ? "Leitura já confirmada" : "Editar leitura"}
                                                    >
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton
                                                        tone="danger"
                                                        onClick={() => setParaEliminar(leitura)}
                                                        disabled={leitura.confirmado || Boolean(leitura.factura)}
                                                        title="Eliminar leitura"
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>

                            {/* Tabela — visível a partir de sm (tablet/desktop) */}
                            <AnimatedPanel delay={0.28} className="hidden overflow-hidden sm:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[980px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Cliente</th>
                                                <th className="px-6 py-3">Período</th>
                                                <th className="px-6 py-3 text-right">Anterior</th>
                                                <th className="px-6 py-3 text-right">Actual</th>
                                                <th className="px-6 py-3 text-right">Consumo</th>
                                                <th className="px-6 py-3">Estado</th>
                                                <th className="px-6 py-3">Registada por</th>
                                                <th className="px-6 py-3 text-right">Acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            variants={listVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="divide-y divide-slate-100 dark:divide-slate-800"
                                        >
                                            {dados.map((leitura) => {
                                                const consumo = Number(leitura.leitura_actual) - Number(leitura.leitura_anterior);

                                                return (
                                                    <motion.tr
                                                        key={leitura.id}
                                                        variants={itemVariants}
                                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
                                                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                            {leitura.cliente?.nome ?? "Cliente removido"}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {meses[leitura.mes - 1]}/{leitura.ano}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">
                                                            {Number(leitura.leitura_anterior).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                            {Number(leitura.leitura_actual).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-cyan-700 dark:text-cyan-300">
                                                            {consumo.toFixed(2)} m&sup3;
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={leitura.confirmado ? "emerald" : "amber"}>
                                                                {leitura.confirmado ? "Confirmada" : "Pendente"}
                                                            </StatusBadge>
                                                            {leitura.confirmado && leitura.factura && (
                                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                                    {leitura.factura.numero_factura}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {leitura.registado_por?.name ?? "—"}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <IconButton
                                                                    tone="success"
                                                                    onClick={() => confirmarLeitura(leitura)}
                                                                    disabled={leitura.confirmado}
                                                                    title="Confirmar leitura"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton
                                                                    onClick={() => abrirEdicao(leitura)}
                                                                    disabled={leitura.confirmado}
                                                                    title={leitura.confirmado ? "Leitura já confirmada" : "Editar leitura"}
                                                                >
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton
                                                                    tone="danger"
                                                                    onClick={() => setParaEliminar(leitura)}
                                                                    disabled={leitura.confirmado || Boolean(leitura.factura)}
                                                                    title="Eliminar leitura"
                                                                >
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </motion.tbody>
                                    </table>
                                </div>
                            </AnimatedPanel>
                            <Pagination paginador={leituras} />
                        </>
                    )}
                </div>
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editando ? "Editar leitura" : "Nova leitura"}
                maxWidth="lg"
            >
                <form onSubmit={submit} className="space-y-4">
                    {!editando && (
                        <div>
                            <InputLabel htmlFor="cliente_id" value="Cliente" />
                            <select
                                id="cliente_id"
                                value={form.data.cliente_id}
                                onChange={(event) => form.setData("cliente_id", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {clientes.map((cliente) => (
                                    <option key={cliente.id} value={cliente.id}>
                                        {cliente.nome}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.cliente_id} className="mt-1" />
                        </div>
                    )}

                    {!editando && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="mes" value="Mês" />
                                <select
                                    id="mes"
                                    value={form.data.mes}
                                    onChange={(event) => form.setData("mes", event.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    {meses.map((nome, index) => (
                                        <option key={nome} value={index + 1}>
                                            {nome}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="ano" value="Ano" />
                                <TextInput
                                    id="ano"
                                    type="number"
                                    value={form.data.ano}
                                    onChange={(event) => form.setData("ano", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <InputLabel htmlFor="leitura_actual" value="Leitura actual do contador" />
                        <TextInput
                            id="leitura_actual"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={form.data.leitura_actual}
                            onChange={(event) => form.setData("leitura_actual", event.target.value)}
                            className="mt-1 block w-full"
                        />
                        <InputError message={form.errors.leitura_actual} className="mt-1" />
                        {editando && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Leitura anterior: {Number(editando.leitura_anterior).toFixed(2)}
                            </p>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        A leitura anterior é preenchida automaticamente a partir do último registo do
                        cliente. Depois de confirmada, a leitura fica bloqueada e disponível para gerar
                        factura.
                    </p>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>
                            {editando ? "Guardar alterações" : "Registar leitura"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar leitura"
                confirmLabel="Eliminar"
                description={
                    paraEliminar
                        ? `Tem a certeza que deseja eliminar a leitura de ${paraEliminar.cliente?.nome ?? "cliente removido"} (${meses[paraEliminar.mes - 1]}/${paraEliminar.ano})?`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(leituraParaFacturar)}
                onClose={() => setLeituraParaFacturar(null)}
                onConfirm={irParaEmitirFactura}
                title="Leitura confirmada"
                tone="primary"
                confirmLabel="Emitir factura"
                cancelLabel="Agora não"
                description={
                    leituraParaFacturar
                        ? `Leitura de ${leituraParaFacturar.cliente?.nome ?? "cliente removido"} (${meses[leituraParaFacturar.mes - 1]}/${leituraParaFacturar.ano}) confirmada. Deseja emitir a factura agora?`
                        : ""
                }
            />
        </AdminLayout>
    );
}
