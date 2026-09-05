import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Banknote,
    Droplets,
    Eye,
    FileText,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Printer,
    Receipt,
    Search,
    Sparkles,
    Trash2,
    UserPlus,
    UserX,
    Users,
    Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton, { IconLink } from "@/Components/IconButton";
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
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const estadoConfig = {
    ativo: { label: "Activo", tone: "emerald" },
    inativo: { label: "Inactivo", tone: "slate" },
    cortado: { label: "Cortado", tone: "rose" },
};

const estadoFacturaConfig = {
    paga: { label: "Paga", tone: "emerald" },
    pendente: { label: "Pendente", tone: "amber" },
    parcial: { label: "Parcial", tone: "cyan" },
    anulada: { label: "Anulada", tone: "slate" },
};

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const colunas = [
    { key: "nome", label: "Cliente" },
    { key: "divida", label: "Dívida" },
    { key: "estado", label: "Estado" },
];

const formVazio = { nome: "", endereco: "", bairro: "", telefone: "", tarifa_id: "", estado: "ativo", novo_contrato: false };

export default function Index({ clientes, tarifas, totais, filtros, taxaLigacao }) {
    const { flash, auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador");
    const [search, setSearch] = useState(filtros.search ?? "");
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const [etapaNovo, setEtapaNovo] = useState(null); // null | "escolha" | "formulario"
    const [novoContrato, setNovoContrato] = useState(false);
    const [editando, setEditando] = useState(null);
    const [detalhe, setDetalhe] = useState(null);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [facturaParaPagar, setFacturaParaPagar] = useState(null);
    const ultimaFacturaTratadaRef = useRef(null);

    const form = useForm(formVazio);

    const aplicarFiltros = (novosFiltros) => {
        router.get("/clientes", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Depois de criar um "novo contrato" (que gera a factura da taxa de
    // ligação), propõe o mesmo próximo passo natural que a emissão de uma
    // factura avulsa em Facturas: registar o pagamento agora. Usa
    // `flash.novaFactura` e desduplica pelo id, tal como em Facturas/Index.
    useEffect(() => {
        const nova = flash.novaFactura;
        if (nova && nova.id !== ultimaFacturaTratadaRef.current) {
            ultimaFacturaTratadaRef.current = nova.id;
            setFacturaParaPagar(nova);
        }
    }, [flash.novaFactura]);

    const irParaRegistarPagamento = () => {
        if (!facturaParaPagar) return;
        router.visit(`/pagamentos?factura_id=${facturaParaPagar.id}`);
    };

    const mudarEstadoFiltro = (estado) => aplicarFiltros({ estado });

    const toggleSort = (key) => {
        setSort((prev) =>
            prev.key === key
                ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
                : { key, direction: "asc" },
        );
    };

    const dados = useMemo(() => {
        const comDivida = clientes.data.map((c) => ({ ...c, dividaValor: Number(c.divida?.valor_divida ?? 0) }));

        if (!sort.key) return comDivida;

        return [...comDivida].sort((a, b) => {
            const va = sort.key === "divida" ? a.dividaValor : a[sort.key];
            const vb = sort.key === "divida" ? b.dividaValor : b[sort.key];
            const comparacao = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "pt");
            return sort.direction === "asc" ? comparacao : -comparacao;
        });
    }, [clientes.data, sort]);

    const metrics = [
        { label: "Total de clientes", value: totais.total, icon: Users, tone: "cyan" },
        { label: "Clientes activos", value: totais.activos, icon: Droplets, tone: "emerald" },
        { label: "Clientes cortados", value: totais.cortados, icon: UserX, tone: "rose" },
        { label: "Dívida acumulada", value: formatCurrency(totais.dividaAcumulada), icon: Wallet, tone: "amber" },
    ];

    const abrirNovo = () => {
        setEditando(null);
        setNovoContrato(false);
        setEtapaNovo("escolha");
    };

    const escolherTipoRegisto = (ehNovoContrato) => {
        setNovoContrato(ehNovoContrato);
        form.reset();
        form.setData({ ...formVazio, tarifa_id: tarifas[0]?.id ?? "", novo_contrato: ehNovoContrato });
        form.clearErrors();
        setEtapaNovo("formulario");
    };

    const abrirEdicao = (cliente) => {
        setEditando(cliente);
        setEtapaNovo(null);
        form.setData({
            nome: cliente.nome,
            endereco: cliente.endereco ?? "",
            bairro: cliente.bairro ?? "",
            telefone: cliente.telefone ?? "",
            tarifa_id: cliente.tarifa_id,
            estado: cliente.estado,
        });
        form.clearErrors();
        setEtapaNovo("formulario");
    };

    const fecharModalCliente = () => {
        setEtapaNovo(null);
        setEditando(null);
    };

    const submitCliente = (event) => {
        event.preventDefault();

        if (editando) {
            form.put(`/clientes/${editando.id}`, { onSuccess: fecharModalCliente });
        } else {
            form.post("/clientes", { onSuccess: fecharModalCliente });
        }
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/clientes/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Gestão de clientes
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Clientes
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Consumidores associados aos furos de água da rede.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {ehAdministrador && (
                            <AnimatedButton as={Link} href="/clientes/lixeira" variant="secondary">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Lixeira
                            </AnimatedButton>
                        )}
                        <AnimatedButton
                            variant="primary"
                            onClick={abrirNovo}
                            disabled={tarifas.length === 0}
                            title={tarifas.length === 0 ? "É preciso configurar pelo menos uma tarifa primeiro." : undefined}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Novo cliente
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Clientes" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>
                    <InlineNotice show={tarifas.length === 0} tone="info">
                        Ainda não há nenhuma tarifa configurada, por isso não é possível adicionar clientes.{" "}
                        {ehAdministrador ? (
                            <>
                                Configure pelo menos uma em{" "}
                                <Link href="/tarifas" className="font-semibold underline underline-offset-2">
                                    Valores e Regras
                                </Link>
                                .
                            </>
                        ) : (
                            "Peça a um administrador para configurar em Valores e Regras."
                        )}
                    </InlineNotice>

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
                                    placeholder="Pesquisar por nome, número ou bairro..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.estado}
                                onChange={(event) => mudarEstadoFiltro(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os estados</option>
                                <option value="ativo">Activo</option>
                                <option value="inativo">Inactivo</option>
                                <option value="cortado">Cortado</option>
                            </select>
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum cliente encontrado para os filtros seleccionados.
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
                                {dados.map((cliente) => {
                                    const estado = estadoConfig[cliente.estado];

                                    return (
                                        <motion.div
                                            key={cliente.id}
                                            variants={itemVariants}
                                            onClick={() => setDetalhe(cliente)}
                                            className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {cliente.nome}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {cliente.numero_cliente}
                                                    </p>
                                                </div>
                                                <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                                            </div>

                                            <div className="mt-3 space-y-1 text-sm">
                                                <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                                    {cliente.telefone || "—"}
                                                </p>
                                                <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                                    {cliente.bairro || "—"} &middot; {cliente.tarifa?.nome ?? "—"}
                                                </p>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <span
                                                    className={cn(
                                                        "font-semibold",
                                                        cliente.dividaValor > 0
                                                            ? "text-rose-600 dark:text-rose-400"
                                                            : "text-slate-400 dark:text-slate-500",
                                                    )}
                                                >
                                                    {formatCurrency(cliente.dividaValor)}
                                                </span>
                                                <div
                                                    className="flex items-center gap-1"
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <IconButton onClick={() => setDetalhe(cliente)} title="Ver histórico">
                                                        <Eye className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton onClick={() => abrirEdicao(cliente)} title="Editar cliente">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton
                                                        tone="danger"
                                                        onClick={() => setParaEliminar(cliente)}
                                                        title="Eliminar cliente"
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
                                    <table className="w-full min-w-[920px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                {colunas.map((coluna) => {
                                                    const activa = sort.key === coluna.key;
                                                    const Icon = activa
                                                        ? sort.direction === "asc"
                                                            ? ArrowUp
                                                            : ArrowDown
                                                        : ArrowUpDown;

                                                    return (
                                                        <th
                                                            key={coluna.key}
                                                            className={cn(
                                                                "px-6 py-3",
                                                                coluna.key === "divida" && "text-right",
                                                            )}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleSort(coluna.key)}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1.5 transition hover:text-slate-950 dark:hover:text-white",
                                                                    coluna.key === "divida" && "flex-row-reverse",
                                                                    activa && "text-cyan-700 dark:text-cyan-300",
                                                                )}
                                                            >
                                                                {coluna.label}
                                                                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                                            </button>
                                                        </th>
                                                    );
                                                })}
                                                <th className="px-6 py-3">Contacto</th>
                                                <th className="px-6 py-3">Tarifa</th>
                                                <th className="px-6 py-3 text-right">Acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody
                                            variants={listVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="divide-y divide-slate-100 dark:divide-slate-800"
                                        >
                                            {dados.map((cliente) => {
                                                const estado = estadoConfig[cliente.estado];

                                                return (
                                                    <motion.tr
                                                        key={cliente.id}
                                                        variants={itemVariants}
                                                        onClick={() => setDetalhe(cliente)}
                                                        className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {cliente.nome}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                {cliente.numero_cliente}
                                                            </p>
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                "px-6 py-4 text-right font-semibold",
                                                                cliente.dividaValor > 0
                                                                    ? "text-rose-600 dark:text-rose-400"
                                                                    : "text-slate-400 dark:text-slate-500",
                                                            )}
                                                        >
                                                            {formatCurrency(cliente.dividaValor)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                                <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                                                {cliente.telefone || "—"}
                                                            </p>
                                                            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                                                {cliente.bairro || "—"}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {cliente.tarifa?.nome ?? "—"}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className="flex items-center justify-end gap-1.5"
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <IconButton onClick={() => setDetalhe(cliente)} title="Ver histórico">
                                                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton onClick={() => abrirEdicao(cliente)} title="Editar cliente">
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton
                                                                    tone="danger"
                                                                    onClick={() => setParaEliminar(cliente)}
                                                                    title="Eliminar cliente"
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
                            <Pagination paginador={clientes} />
                        </>
                    )}
                </div>
            </div>

            <Modal
                show={etapaNovo === "escolha"}
                onClose={() => setEtapaNovo(null)}
                title="Novo cliente"
                maxWidth="lg"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Este registo é para um novo contrato de fornecimento de água ou para um cliente que já
                    existe (a ser adicionado ao sistema)?
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => escolherTipoRegisto(true)}
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                            <Sparkles className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-950 dark:text-white">Novo contrato</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Primeira ligação de água deste cliente. É gerada automaticamente uma factura da
                                taxa de ligação de {formatCurrency(taxaLigacao)}.
                            </p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => escolherTipoRegisto(false)}
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <UserPlus className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-950 dark:text-white">Cliente existente</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Cliente que já tinha ligação de água antes deste sistema — apenas adicionar os
                                dados, sem cobrar taxa de ligação.
                            </p>
                        </div>
                    </button>
                </div>
            </Modal>

            <Modal
                show={etapaNovo === "formulario"}
                onClose={fecharModalCliente}
                title={editando ? "Editar cliente" : novoContrato ? "Novo contrato de água" : "Novo cliente"}
                maxWidth="lg"
            >
                <form onSubmit={submitCliente} className="space-y-4">
                    {!editando && novoContrato && (
                        <InlineNotice show tone="info">
                            Será criada automaticamente uma factura da taxa de ligação de água no valor de{" "}
                            {formatCurrency(taxaLigacao)} após guardar.
                        </InlineNotice>
                    )}

                    <div>
                        <InputLabel htmlFor="nome" value="Nome" />
                        <TextInput
                            id="nome"
                            required
                            value={form.data.nome}
                            onChange={(event) => form.setData("nome", event.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Nome completo ou razão social"
                        />
                        <InputError message={form.errors.nome} className="mt-1" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="bairro" value="Bairro" />
                            <TextInput
                                id="bairro"
                                value={form.data.bairro}
                                onChange={(event) => form.setData("bairro", event.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="telefone" value="Telefone" />
                            <TextInput
                                id="telefone"
                                value={form.data.telefone}
                                onChange={(event) => form.setData("telefone", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="84 000 0000"
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="endereco" value="Endereço" />
                        <TextInput
                            id="endereco"
                            value={form.data.endereco}
                            onChange={(event) => form.setData("endereco", event.target.value)}
                            className="mt-1 block w-full"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="tarifa_id" value="Tipo de consumo" />
                            <select
                                id="tarifa_id"
                                value={form.data.tarifa_id}
                                onChange={(event) => form.setData("tarifa_id", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {tarifas.map((tarifa) => (
                                    <option key={tarifa.id} value={tarifa.id}>
                                        {tarifa.nome}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.tarifa_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="estado" value="Estado" />
                            <select
                                id="estado"
                                value={form.data.estado}
                                onChange={(event) => form.setData("estado", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="ativo">Activo</option>
                                <option value="inativo">Inactivo</option>
                                <option value="cortado">Cortado</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={fecharModalCliente}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>
                            {editando ? "Guardar alterações" : "Adicionar cliente"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar cliente"
                confirmLabel="Eliminar"
                description={
                    paraEliminar
                        ? `Tem a certeza que deseja eliminar "${paraEliminar.nome}"?`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(facturaParaPagar)}
                onClose={() => setFacturaParaPagar(null)}
                onConfirm={irParaRegistarPagamento}
                title="Factura de ligação emitida"
                tone="primary"
                confirmLabel="Registar pagamento"
                cancelLabel="Agora não"
                description={
                    facturaParaPagar
                        ? `Factura ${facturaParaPagar.numero_factura} emitida (${formatCurrency(facturaParaPagar.total_pagar)}). Deseja efectuar o pagamento agora?`
                        : ""
                }
            />

            <Modal
                show={Boolean(detalhe)}
                onClose={() => setDetalhe(null)}
                title={detalhe ? detalhe.nome : ""}
                maxWidth="2xl"
            >
                {detalhe && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <IconLink
                                href={`/clientes/${detalhe.id}/imprimir`}
                                target="_blank"
                                title="Imprimir dados do cliente"
                            >
                                <Printer className="h-4 w-4" aria-hidden="true" />
                            </IconLink>
                        </div>
                        <div className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Número
                                </p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {detalhe.numero_cliente}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Estado
                                </p>
                                <StatusBadge tone={estadoConfig[detalhe.estado].tone}>
                                    {estadoConfig[detalhe.estado].label}
                                </StatusBadge>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Tarifa
                                </p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {detalhe.tarifa?.nome ?? "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Contacto
                                </p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {detalhe.telefone || "—"} &middot; {detalhe.bairro || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Dívida actual
                                </p>
                                <p
                                    className={cn(
                                        "font-semibold",
                                        Number(detalhe.divida?.valor_divida ?? 0) > 0
                                            ? "text-rose-600 dark:text-rose-400"
                                            : "text-slate-900 dark:text-white",
                                    )}
                                >
                                    {formatCurrency(detalhe.divida?.valor_divida ?? 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Cliente registado em
                                </p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {detalhe.created_at
                                        ? formatDateTime(detalhe.created_at)
                                        : formatDate(detalhe.data_adesao)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                                <FileText className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Histórico de facturas
                            </h4>
                            <div className="mt-2 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                                <table className="w-full min-w-[560px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-2">Factura</th>
                                            <th className="px-4 py-2">Período</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                            <th className="px-4 py-2">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {detalhe.facturas.map((f) => (
                                            <tr key={f.id}>
                                                <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                                                    {f.numero_factura}
                                                </td>
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                    {meses[f.mes - 1]}/{f.ano}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">
                                                    {formatCurrency(f.total_pagar)}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <StatusBadge tone={estadoFacturaConfig[f.estado].tone}>
                                                        {estadoFacturaConfig[f.estado].label}
                                                    </StatusBadge>
                                                </td>
                                            </tr>
                                        ))}
                                        {detalhe.facturas.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                                                >
                                                    Sem facturas registadas para este cliente.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                                <Receipt className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Histórico de pagamentos
                            </h4>
                            <div className="mt-2 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
                                <table className="w-full min-w-[560px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-2">Recibo</th>
                                            <th className="px-4 py-2">Registado em</th>
                                            <th className="px-4 py-2 text-right">Valor</th>
                                            <th className="px-4 py-2">Método</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {detalhe.pagamentos.map((p) => (
                                            <tr key={p.id}>
                                                <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                                                    {p.numero_recibo}
                                                </td>
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                    {formatDateTime(p.created_at)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium text-slate-900 dark:text-white">
                                                    {formatCurrency(p.valor_pago)}
                                                </td>
                                                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                                                    {metodoLabels[p.metodo_pagamento] ?? p.metodo_pagamento}
                                                </td>
                                            </tr>
                                        ))}
                                        {detalhe.pagamentos.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400"
                                                >
                                                    Sem pagamentos registados para este cliente.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                            <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Histórico carregado directamente da base de dados.
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
