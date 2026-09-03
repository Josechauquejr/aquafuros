import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Banknote,
    Landmark,
    Lock,
    Pencil,
    Plus,
    Printer,
    Receipt,
    RotateCcw,
    Search,
    Smartphone,
    Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton, { IconLink } from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PeriodoFiltro from "@/Components/PeriodoFiltro";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const metodoConfig = {
    dinheiro: { label: "Dinheiro", icon: Banknote, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
    banco: { label: "Transferência bancária", icon: Landmark, tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300" },
    mpesa: { label: "M-Pesa", icon: Smartphone, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
    "e-mola": { label: "e-Mola", icon: Smartphone, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
};

const formVazio = { factura_id: "", valor_pago: "", metodo_pagamento: "dinheiro", referencia_pagamento: "" };

export default function Index({ pagamentos, facturasEmAberto, metricas, filtros }) {
    const { auth, flash } = usePage().props;
    const [search, setSearch] = useState(filtros.search ?? "");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraEstornar, setParaEstornar] = useState(null);
    const [selecionados, setSelecionados] = useState([]);

    const form = useForm(formVazio);
    const ehAdministrador = auth.roles?.includes("administrador") ?? false;

    const dados = pagamentos.data;

    const aplicarFiltros = (novosFiltros) => {
        router.get(
            "/pagamentos",
            { ...filtros, ...novosFiltros },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const mudarPeriodo = (periodo) => aplicarFiltros({ periodo, data_inicio: undefined, data_fim: undefined });
    const mudarIntervalo = (data_inicio, data_fim) => aplicarFiltros({ periodo: "personalizado", data_inicio, data_fim });
    const mudarMetodo = (metodo) => aplicarFiltros({ metodo });

    const metrics = [
        { label: "Total recebido", value: formatCurrency(metricas.totalRecebido), icon: Wallet, tone: "cyan" },
        { label: "Pagamentos registados", value: metricas.totalRegistados, icon: Receipt, tone: "emerald" },
        {
            label: "Método mais usado",
            value: metricas.metodoMaisUsado ? metodoConfig[metricas.metodoMaisUsado].label : "—",
            icon: Smartphone,
            tone: "amber",
        },
        { label: "Valor médio por recibo", value: formatCurrency(metricas.valorMedio), icon: Banknote, tone: "rose" },
    ];

    const abrirNovo = (facturaIdPreseleccionada) => {
        setEditando(null);
        const preseleccionada = facturaIdPreseleccionada
            ? facturasEmAberto.find((f) => String(f.id) === String(facturaIdPreseleccionada))
            : facturasEmAberto[0];
        form.reset();
        form.setData({
            factura_id: preseleccionada?.id ?? "",
            valor_pago: preseleccionada?.total_pagar ?? "",
            metodo_pagamento: "dinheiro",
            referencia_pagamento: "",
        });
        form.clearErrors();
        setShowModal(true);
    };

    // Chegou aqui a partir de "Deseja efectuar o pagamento agora?" (Facturas)
    // — pré-selecciona essa factura e abre logo o formulário de pagamento.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const facturaId = params.get("factura_id");
        if (facturaId && facturasEmAberto.some((f) => String(f.id) === facturaId)) {
            abrirNovo(facturaId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const abrirEdicao = (pagamento) => {
        setEditando(pagamento);
        form.setData({
            metodo_pagamento: pagamento.metodo_pagamento,
            referencia_pagamento: pagamento.referencia_pagamento ?? "",
        });
        form.clearErrors();
        setShowModal(true);
    };

    const selecionarFactura = (id) => {
        const factura = facturasEmAberto.find((f) => String(f.id) === String(id));
        form.setData((data) => ({ ...data, factura_id: id, valor_pago: factura?.total_pagar ?? data.valor_pago }));
    };

    const submit = (event) => {
        event.preventDefault();

        if (editando) {
            form.put(`/pagamentos/${editando.id}`, { onSuccess: () => setShowModal(false) });
        } else {
            form.post("/pagamentos", { onSuccess: () => setShowModal(false) });
        }
    };

    const confirmarEstorno = () => {
        if (!paraEstornar) return;
        router.delete(`/pagamentos/${paraEstornar.id}`, { onFinish: () => setParaEstornar(null), preserveScroll: true });
    };

    const toggleSelecao = (id) => {
        setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const todosVisiveisSeleccionados =
        dados.length > 0 && dados.every((p) => selecionados.includes(p.id));

    const toggleSelecaoTodos = () => {
        if (todosVisiveisSeleccionados) {
            setSelecionados((prev) => prev.filter((id) => !dados.some((p) => p.id === id)));
        } else {
            setSelecionados((prev) => [...new Set([...prev, ...dados.map((p) => p.id)])]);
        }
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Tesouraria
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Pagamentos
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Recibos emitidos pela caixa referentes a facturas pagas.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/pagamentos/fecho-caixa"
                            target="_blank"
                            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            <Lock className="h-4 w-4" aria-hidden="true" />
                            Fecho de caixa
                        </Link>
                        <AnimatedButton variant="primary" onClick={() => abrirNovo()} disabled={facturasEmAberto.length === 0}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Registar pagamento
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Pagamentos" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <AnimatedPanel delay={0.2} className="space-y-3 p-4">
                        <PeriodoFiltro
                            periodo={filtros.periodo}
                            onChange={mudarPeriodo}
                            dataInicio={filtros.data_inicio}
                            dataFim={filtros.data_fim}
                            onChangeIntervalo={mudarIntervalo}
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden="true"
                                />
                                <TextInput
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Pesquisar por cliente, recibo ou factura..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.metodo}
                                onChange={(event) => mudarMetodo(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os métodos</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="banco">Transferência bancária</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="e-mola">e-Mola</option>
                            </select>
                            {selecionados.length > 0 && (
                                <Link
                                    href={`/pagamentos/imprimir-lote?ids=${selecionados.join(",")}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-800"
                                >
                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                    Imprimir seleccionados ({selecionados.length})
                                </Link>
                            )}
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum pagamento encontrado para os filtros seleccionados.
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
                                {dados.map((pagamento) => {
                                    const metodo = metodoConfig[pagamento.metodo_pagamento];
                                    const MetodoIcon = metodo.icon;

                                    return (
                                        <motion.div
                                            key={pagamento.id}
                                            variants={itemVariants}
                                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <label className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selecionados.includes(pagamento.id)}
                                                        onChange={() => toggleSelecao(pagamento.id)}
                                                        className="mt-1 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {pagamento.numero_recibo}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {pagamento.cliente?.nome ?? "Cliente removido"}
                                                        </p>
                                                    </div>
                                                </label>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                                        metodo.tone,
                                                    )}
                                                >
                                                    <MetodoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                    {metodo.label}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                                                <span>{pagamento.factura.numero_factura}</span>
                                                <span>{formatDateTime(pagamento.created_at)}</span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(pagamento.valor_pago)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <IconButton onClick={() => abrirEdicao(pagamento)} title="Editar método / referência">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconLink href={`/pagamentos/${pagamento.id}/imprimir`} target="_blank" title="Imprimir recibo">
                                                        <Printer className="h-4 w-4" aria-hidden="true" />
                                                    </IconLink>
                                                    <IconButton
                                                        tone="danger"
                                                        onClick={() => setParaEstornar(pagamento)}
                                                        disabled={!ehAdministrador}
                                                        title={ehAdministrador ? "Estornar pagamento" : "Apenas administradores podem estornar"}
                                                    >
                                                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
                                    <table className="w-full min-w-[940px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="w-10 px-6 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={todosVisiveisSeleccionados}
                                                        onChange={toggleSelecaoTodos}
                                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                        aria-label="Seleccionar todos os pagamentos visíveis"
                                                    />
                                                </th>
                                                <th className="px-6 py-3">Recibo</th>
                                                <th className="px-6 py-3">Cliente</th>
                                                <th className="px-6 py-3">Factura</th>
                                                <th className="px-6 py-3 text-right">Valor</th>
                                                <th className="px-6 py-3">Método</th>
                                                <th className="px-6 py-3">Recebido por</th>
                                                <th className="px-6 py-3 text-right">Acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            variants={listVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="divide-y divide-slate-100 dark:divide-slate-800"
                                        >
                                            {dados.map((pagamento) => {
                                                const metodo = metodoConfig[pagamento.metodo_pagamento];
                                                const MetodoIcon = metodo.icon;

                                                return (
                                                    <motion.tr
                                                        key={pagamento.id}
                                                        variants={itemVariants}
                                                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selecionados.includes(pagamento.id)}
                                                                onChange={() => toggleSelecao(pagamento.id)}
                                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                                aria-label={`Seleccionar recibo ${pagamento.numero_recibo}`}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {pagamento.numero_recibo}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {formatDateTime(pagamento.created_at)}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {pagamento.cliente?.nome ?? "Cliente removido"}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {pagamento.factura.numero_factura}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(pagamento.valor_pago)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                                                    metodo.tone,
                                                                )}
                                                            >
                                                                <MetodoIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                                                {metodo.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {pagamento.recebido_por?.name ?? "—"}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <IconButton onClick={() => abrirEdicao(pagamento)} title="Editar método / referência">
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconLink href={`/pagamentos/${pagamento.id}/imprimir`} target="_blank" title="Imprimir recibo">
                                                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                                                </IconLink>
                                                                <IconButton
                                                                    tone="danger"
                                                                    onClick={() => setParaEstornar(pagamento)}
                                                                    disabled={!ehAdministrador}
                                                                    title={ehAdministrador ? "Estornar pagamento" : "Apenas administradores podem estornar"}
                                                                >
                                                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
                            <Pagination paginador={pagamentos} />
                        </>
                    )}
                </div>
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editando ? `Editar pagamento ${editando.numero_recibo}` : "Registar pagamento"}
                maxWidth="lg"
            >
                <form onSubmit={submit} className="space-y-4">
                    {!editando && (
                        <>
                            <div>
                                <InputLabel htmlFor="busca_factura" value="Factura em aberto" />
                                {facturasEmAberto.length > 0 ? (
                                    <div className="mt-1">
                                        <ListaPesquisavel
                                            itens={facturasEmAberto}
                                            valorSeleccionado={form.data.factura_id}
                                            onSeleccionar={(factura) => selecionarFactura(factura.id)}
                                            obterId={(factura) => factura.id}
                                            obterOrdenacao={(factura) => factura.cliente?.nome ?? "Cliente removido"}
                                            obterTexto={(factura) => `${factura.cliente?.nome ?? ""} ${factura.numero_factura}`}
                                            placeholder="Pesquisar por cliente ou número de factura..."
                                            vazioTexto="Nenhuma factura encontrada."
                                            renderItem={(factura) => (
                                                <>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium text-slate-900 dark:text-white">
                                                            {factura.cliente?.nome ?? "Cliente removido"}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                            {factura.numero_factura} · {meses[factura.mes - 1]}/{factura.ano}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(factura.total_pagar)}
                                                        </span>
                                                        <StatusBadge tone={factura.estado === "parcial" ? "cyan" : "amber"}>
                                                            {factura.estado === "parcial" ? "Parcial" : "Pendente"}
                                                        </StatusBadge>
                                                    </div>
                                                </>
                                            )}
                                        />
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Não há facturas pendentes ou parciais para registar pagamento.
                                    </p>
                                )}
                                <InputError message={form.errors.factura_id} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="valor_pago" value="Valor pago" />
                                <TextInput
                                    id="valor_pago"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={form.data.valor_pago}
                                    onChange={(event) => form.setData("valor_pago", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                                <InputError message={form.errors.valor_pago} className="mt-1" />
                            </div>
                        </>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="metodo_pagamento" value="Método de pagamento" />
                            <select
                                id="metodo_pagamento"
                                value={form.data.metodo_pagamento}
                                onChange={(event) => form.setData("metodo_pagamento", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {Object.entries(metodoConfig).map(([valor, { label }]) => (
                                    <option key={valor} value={valor}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="referencia_pagamento" value="Referência (opcional)" />
                            <TextInput
                                id="referencia_pagamento"
                                value={form.data.referencia_pagamento}
                                onChange={(event) => form.setData("referencia_pagamento", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex: MP-88213"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {editando
                            ? "Por integridade financeira, apenas método e referência podem ser alterados."
                            : `Recebido por ${auth.user?.name ?? "utilizador actual"}.`}
                    </p>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing || (!editando && facturasEmAberto.length === 0)}>
                            {editando ? "Guardar alterações" : "Registar pagamento"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraEstornar)}
                onClose={() => setParaEstornar(null)}
                onConfirm={confirmarEstorno}
                title="Estornar pagamento"
                confirmLabel="Estornar"
                description={
                    paraEstornar
                        ? `Tem a certeza que deseja estornar o recibo ${paraEstornar.numero_recibo} (${paraEstornar.cliente?.nome ?? "cliente removido"}, ${formatCurrency(paraEstornar.valor_pago)})?`
                        : ""
                }
            />
        </AdminLayout>
    );
}
