import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    Check,
    Clock,
    Droplets,
    Gauge,
    Pencil,
    Percent,
    Plus,
    PlugZap,
    RefreshCcw,
    ShieldAlert,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatCurrency } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const regras = [
    {
        titulo: "Prazo de pagamento",
        descricao: "15 dias corridos após a emissão da factura, antes de incorrer em multa.",
        icon: Clock,
    },
    {
        titulo: "Multa por atraso",
        descricao: "Aplicada automaticamente sobre o valor em dívida, segundo a percentagem definida em cada tarifa.",
        icon: Percent,
    },
    {
        titulo: "Corte automático",
        descricao: "Accionado quando a dívida acumulada do cliente ultrapassa o limiar de corte da sua tarifa.",
        icon: ShieldAlert,
    },
    {
        titulo: "Reconexão",
        descricao: "Taxa fixa cobrada após a regularização integral da dívida.",
        icon: RefreshCcw,
    },
];

const toneClasses = {
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

function paraFormulario(tarifa) {
    return {
        nome: tarifa.nome,
        preco_m3: tarifa.preco_m3,
        taxa_minima: tarifa.taxa_minima,
        consumo_minimo_m3: tarifa.consumo_minimo_m3,
        percentagem_multa: (Number(tarifa.percentagem_multa) * 100).toString(),
        limiar_corte: tarifa.limiar_corte,
        is_active: Boolean(tarifa.is_active),
    };
}

const formVazio = {
    nome: "",
    preco_m3: "",
    taxa_minima: "",
    consumo_minimo_m3: "",
    percentagem_multa: "",
    limiar_corte: "",
    is_active: true,
};

export default function Index({ tarifas, taxaLigacao }) {
    const { flash } = usePage().props;
    const [editandoId, setEditandoId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [precoEmEdicao, setPrecoEmEdicao] = useState(null);
    const [precoEditado, setPrecoEditado] = useState("");
    const [editandoTaxaLigacao, setEditandoTaxaLigacao] = useState(false);
    const [taxaLigacaoEditada, setTaxaLigacaoEditada] = useState(String(taxaLigacao));

    const form = useForm(formVazio);

    const activasCount = tarifas.filter((t) => t.is_active).length;
    const precoMedio = tarifas.reduce((soma, t) => soma + Number(t.preco_m3), 0) / (tarifas.length || 1);
    const limiarMedio = tarifas.reduce((soma, t) => soma + Number(t.limiar_corte), 0) / (tarifas.length || 1);

    const metrics = [
        { label: "Tarifas configuradas", value: tarifas.length, icon: SlidersHorizontal, tone: "cyan" },
        { label: "Tarifas activas", value: activasCount, icon: Droplets, tone: "emerald" },
        { label: "Preço médio por m³", value: formatCurrency(precoMedio), icon: Gauge, tone: "amber" },
        { label: "Limiar médio de corte", value: formatCurrency(limiarMedio), icon: ShieldAlert, tone: "rose" },
    ];

    const abrirModal = () => {
        setEditandoId(null);
        form.reset();
        form.clearErrors();
        setShowModal(true);
    };

    const abrirEdicao = (tarifa) => {
        setEditandoId(tarifa.id);
        form.setData(paraFormulario(tarifa));
        form.clearErrors();
        setShowModal(true);
    };

    const submitTarifa = (event) => {
        event.preventDefault();

        // form.transform() só define a transformação (não devolve o form
        // para encadear) — tem de ser chamado à parte do post/put.
        form.transform((data) => ({ ...data, percentagem_multa: Number(data.percentagem_multa) / 100 }));

        if (editandoId) {
            form.put(`/tarifas/${editandoId}`, { onSuccess: () => setShowModal(false) });
        } else {
            form.post("/tarifas", { onSuccess: () => setShowModal(false) });
        }
    };

    const iniciarEdicaoPreco = (tarifa) => {
        setPrecoEmEdicao(tarifa.id);
        setPrecoEditado(String(tarifa.preco_m3));
    };

    const guardarPreco = (tarifa) => {
        const novoPreco = Number(precoEditado);
        if (!novoPreco || novoPreco <= 0) return;

        router.put(
            `/tarifas/${tarifa.id}`,
            { ...paraFormulario(tarifa), percentagem_multa: Number(tarifa.percentagem_multa), preco_m3: novoPreco },
            { onSuccess: () => setPrecoEmEdicao(null), preserveScroll: true },
        );
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/tarifas/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    const iniciarEdicaoTaxaLigacao = () => {
        setTaxaLigacaoEditada(String(taxaLigacao));
        setEditandoTaxaLigacao(true);
    };

    const guardarTaxaLigacao = () => {
        const novoValor = Number(taxaLigacaoEditada);
        if (Number.isNaN(novoValor) || novoValor < 0) return;

        router.put(
            "/tarifas/taxa-ligacao",
            { valor: novoValor },
            { onSuccess: () => setEditandoTaxaLigacao(false), preserveScroll: true },
        );
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Configuração
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Valores e Regras
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Tarifário por m&sup3; e regras de cobrança aplicadas aos furos.
                        </p>
                    </div>
                    <AnimatedButton variant="primary" onClick={abrirModal}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Nova tarifa
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Valores e Regras" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((metric, index) => {
                            const Icon = metric.icon;

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
                                                toneClasses[metric.tone],
                                            )}
                                        >
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                    </div>
                                </AnimatedPanel>
                            );
                        })}
                    </section>

                    <AnimatedPanel delay={0.2} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                                Tarifário
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Preços e limiares aplicados por categoria de cliente. Clique no lápis para
                                ajustar o preço por m&sup3; rapidamente.
                            </p>
                        </div>
                        {/* Cartões — visíveis apenas em telas pequenas (mobile) */}
                        <motion.div
                            variants={listVariants}
                            initial="hidden"
                            animate="show"
                            className="space-y-3 p-4 sm:hidden"
                        >
                            {tarifas.map((tarifa) => {
                                const emEdicao = precoEmEdicao === tarifa.id;

                                return (
                                    <motion.div
                                        key={tarifa.id}
                                        variants={itemVariants}
                                        className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-slate-900 dark:text-white">{tarifa.nome}</p>
                                            <StatusBadge tone={tarifa.is_active ? "emerald" : "slate"}>
                                                {tarifa.is_active ? "Activa" : "Inactiva"}
                                            </StatusBadge>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Preço / m&sup3;</span>
                                            {emEdicao ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    autoFocus
                                                    value={precoEditado}
                                                    onChange={(event) => setPrecoEditado(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") guardarPreco(tarifa);
                                                        if (event.key === "Escape") setPrecoEmEdicao(null);
                                                    }}
                                                    className="w-24 rounded-md border-slate-300 bg-white py-1 text-right text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                />
                                            ) : (
                                                <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                                    {formatCurrency(tarifa.preco_m3)}
                                                </span>
                                            )}
                                        </div>

                                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500 dark:text-slate-400">Taxa mínima</dt>
                                                <dd>{formatCurrency(tarifa.taxa_minima)}</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500 dark:text-slate-400">Consumo mín.</dt>
                                                <dd>{tarifa.consumo_minimo_m3} m&sup3;</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500 dark:text-slate-400">Multa</dt>
                                                <dd>{(Number(tarifa.percentagem_multa) * 100).toFixed(0)}%</dd>
                                            </div>
                                            <div className="flex justify-between">
                                                <dt className="text-slate-500 dark:text-slate-400">Limiar corte</dt>
                                                <dd>{formatCurrency(tarifa.limiar_corte)}</dd>
                                            </div>
                                        </dl>

                                        <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                                            {emEdicao ? (
                                                <>
                                                    <IconButton tone="success" onClick={() => guardarPreco(tarifa)} title="Guardar">
                                                        <Check className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton onClick={() => setPrecoEmEdicao(null)} title="Cancelar">
                                                        <X className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <IconButton onClick={() => iniciarEdicaoPreco(tarifa)} title="Editar preço por m³">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton onClick={() => abrirEdicao(tarifa)} title="Editar todos os campos">
                                                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton tone="danger" onClick={() => setParaEliminar(tarifa)} title="Eliminar tarifa">
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>

                        {/* Tabela — visível a partir de sm (tablet/desktop) */}
                        <div className="hidden overflow-x-auto sm:block">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Tarifa</th>
                                        <th className="px-6 py-3 text-right">Preço / m&sup3;</th>
                                        <th className="px-6 py-3 text-right">Taxa mínima</th>
                                        <th className="px-6 py-3 text-right">Consumo mínimo</th>
                                        <th className="px-6 py-3 text-right">Multa por atraso</th>
                                        <th className="px-6 py-3 text-right">Limiar de corte</th>
                                        <th className="px-6 py-3">Estado</th>
                                        <th className="px-6 py-3 text-right">Acções</th>
                                    </tr>
                                </thead>
                                <motion.tbody
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {tarifas.map((tarifa) => {
                                        const emEdicao = precoEmEdicao === tarifa.id;

                                        return (
                                            <motion.tr
                                                key={tarifa.id}
                                                variants={itemVariants}
                                                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                    {tarifa.nome}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {emEdicao ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            autoFocus
                                                            value={precoEditado}
                                                            onChange={(event) => setPrecoEditado(event.target.value)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter") guardarPreco(tarifa);
                                                                if (event.key === "Escape") setPrecoEmEdicao(null);
                                                            }}
                                                            className="w-28 rounded-md border-slate-300 bg-white py-1 text-right text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                                        />
                                                    ) : (
                                                        <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                                            {formatCurrency(tarifa.preco_m3)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(tarifa.taxa_minima)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {tarifa.consumo_minimo_m3} m&sup3;
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {(Number(tarifa.percentagem_multa) * 100).toFixed(0)}%
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(tarifa.limiar_corte)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge tone={tarifa.is_active ? "emerald" : "slate"}>
                                                        {tarifa.is_active ? "Activa" : "Inactiva"}
                                                    </StatusBadge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {emEdicao ? (
                                                            <>
                                                                <IconButton tone="success" onClick={() => guardarPreco(tarifa)} title="Guardar">
                                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton onClick={() => setPrecoEmEdicao(null)} title="Cancelar">
                                                                    <X className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <IconButton onClick={() => iniciarEdicaoPreco(tarifa)} title="Editar preço por m³">
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton onClick={() => abrirEdicao(tarifa)} title="Editar todos os campos">
                                                                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton tone="danger" onClick={() => setParaEliminar(tarifa)} title="Eliminar tarifa">
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                            </>
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

                    <AnimatedPanel delay={0.24}>
                        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                    <PlugZap className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        Taxa de ligação de novo contrato
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        Cobrada automaticamente, numa factura à parte, quando um cliente é criado
                                        como &ldquo;novo contrato&rdquo;.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:pl-4">
                                {editandoTaxaLigacao ? (
                                    <>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            autoFocus
                                            value={taxaLigacaoEditada}
                                            onChange={(event) => setTaxaLigacaoEditada(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") guardarTaxaLigacao();
                                                if (event.key === "Escape") setEditandoTaxaLigacao(false);
                                            }}
                                            className="w-32 rounded-md border-slate-300 bg-white py-1.5 text-right text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                        />
                                        <IconButton tone="success" onClick={guardarTaxaLigacao} title="Guardar">
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                        </IconButton>
                                        <IconButton onClick={() => setEditandoTaxaLigacao(false)} title="Cancelar">
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xl font-bold text-slate-950 dark:text-white">
                                            {formatCurrency(taxaLigacao)}
                                        </span>
                                        <IconButton onClick={iniciarEdicaoTaxaLigacao} title="Editar taxa de ligação">
                                            <Pencil className="h-4 w-4" aria-hidden="true" />
                                        </IconButton>
                                    </>
                                )}
                            </div>
                        </div>
                    </AnimatedPanel>

                    <AnimatedPanel delay={0.28}>
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                                Regras gerais de cobrança
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Aplicadas a todas as tarifas, salvo indicação em contrário.
                            </p>
                        </div>
                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            {regras.map((regra) => {
                                const Icon = regra.icon;

                                return (
                                    <div
                                        key={regra.titulo}
                                        className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {regra.titulo}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                {regra.descricao}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </AnimatedPanel>
                </div>
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editandoId ? "Editar tarifa" : "Nova tarifa"}
                maxWidth="lg"
            >
                <form onSubmit={submitTarifa} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="nome" value="Nome da tarifa" />
                        <TextInput
                            id="nome"
                            required
                            value={form.data.nome}
                            onChange={(event) => form.setData("nome", event.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Ex: Rural"
                        />
                        <InputError message={form.errors.nome} className="mt-1" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="preco_m3" value="Preço por m³" />
                            <TextInput
                                id="preco_m3"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={form.data.preco_m3}
                                onChange={(event) => form.setData("preco_m3", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={form.errors.preco_m3} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="taxa_minima" value="Taxa mínima" />
                            <TextInput
                                id="taxa_minima"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={form.data.taxa_minima}
                                onChange={(event) => form.setData("taxa_minima", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={form.errors.taxa_minima} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="consumo_minimo_m3" value="Consumo mínimo (m³)" />
                            <TextInput
                                id="consumo_minimo_m3"
                                type="number"
                                min="0"
                                required
                                value={form.data.consumo_minimo_m3}
                                onChange={(event) => form.setData("consumo_minimo_m3", event.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="percentagem_multa" value="Multa por atraso (%)" />
                            <TextInput
                                id="percentagem_multa"
                                type="number"
                                min="0"
                                max="100"
                                required
                                value={form.data.percentagem_multa}
                                onChange={(event) => form.setData("percentagem_multa", event.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="limiar_corte" value="Limiar de corte" />
                            <TextInput
                                id="limiar_corte"
                                type="number"
                                min="0"
                                required
                                value={form.data.limiar_corte}
                                onChange={(event) => form.setData("limiar_corte", event.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData("is_active", event.target.checked)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                        />
                        Tarifa activa
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>
                            {editandoId ? "Guardar alterações" : "Adicionar tarifa"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar tarifa"
                confirmLabel="Eliminar"
                description={
                    paraEliminar
                        ? `Tem a certeza que deseja eliminar a tarifa "${paraEliminar.nome}"? Isto falha se houver clientes associados.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
