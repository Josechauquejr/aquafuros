import { Head, router, usePage } from "@inertiajs/react";
import { ChevronDown, Eraser, PlusCircle, Search, ScrollText, SquarePen, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import DevLayout from "@/Layouts/DevLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InlineNotice from "@/Components/InlineNotice";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatDateTime } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const eventoConfig = {
    created: { label: "Criado", tone: "emerald", icon: PlusCircle },
    updated: { label: "Actualizado", tone: "cyan", icon: SquarePen },
    deleted: { label: "Eliminado", tone: "rose", icon: Trash2 },
    restored: { label: "Restaurado", tone: "amber", icon: PlusCircle },
};

const rotulosCampos = {
    nome: "Nome", endereco: "Endereço", telefone: "Telefone", bairro: "Bairro",
    tarifa_id: "Tarifa", estado: "Estado", divida_anterior: "Dívida anterior",
    multa: "Multa", total_pagar: "Total a pagar", valor_pago: "Valor pago",
    metodo_pagamento: "Método de pagamento", referencia_pagamento: "Referência",
    leitura_actual: "Leitura actual", confirmado: "Confirmado", preco_m3: "Preço/m³",
    taxa_minima: "Taxa mínima", consumo_minimo_m3: "Consumo mínimo", percentagem_multa: "Multa (%)",
    limiar_corte: "Limiar de corte", is_active: "Activa", valor: "Valor",
};

function Alteracoes({ propriedades }) {
    const depois = propriedades?.attributes ?? {};
    const antes = propriedades?.old ?? {};
    const campos = Object.keys(depois);

    if (campos.length === 0) return null;

    return (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {campos.map((campo) => (
                <div key={campo} className="rounded-md bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800/60">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                        {rotulosCampos[campo] ?? campo}:
                    </span>{" "}
                    {campo in antes && (
                        <span className="text-rose-500 line-through dark:text-rose-400">{String(antes[campo])}</span>
                    )}{" "}
                    {campo in antes && <span className="text-slate-400">→</span>}{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-100">{String(depois[campo])}</span>
                </div>
            ))}
        </div>
    );
}

export default function Logs({ registos, tipos, utilizadores, filtros }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filtros.search ?? "");
    const [expandido, setExpandido] = useState(null);
    const [showLimparModal, setShowLimparModal] = useState(false);
    const [dias, setDias] = useState("180");

    const dados = registos.data;

    const aplicarFiltros = (novosFiltros) => {
        router.get("/dev/actividade", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const confirmarLimpeza = (event) => {
        event.preventDefault();
        router.delete("/dev/actividade", { data: { dias: Number(dias) }, onSuccess: () => setShowLimparModal(false) });
    };

    return (
        <DevLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Auditoria
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Registo de Actividade
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Quem criou, alterou ou eliminou cada registo do sistema, e quando.
                        </p>
                    </div>
                    <AnimatedButton variant="secondary" onClick={() => setShowLimparModal(true)}>
                        <Eraser className="h-4 w-4" aria-hidden="true" />
                        Limpar registos antigos
                    </AnimatedButton>
                </div>
            }
        >
            <Head title="Registo de Actividade" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>

                    <AnimatedPanel delay={0.1} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden="true"
                                />
                                <TextInput
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Pesquisar na descrição..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.tipo}
                                onChange={(event) => aplicarFiltros({ tipo: event.target.value })}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os tipos</option>
                                {Object.entries(tipos).map(([valor, label]) => (
                                    <option key={valor} value={valor}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filtros.evento}
                                onChange={(event) => aplicarFiltros({ evento: event.target.value })}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todas as acções</option>
                                <option value="created">Criado</option>
                                <option value="updated">Actualizado</option>
                                <option value="deleted">Eliminado</option>
                            </select>
                            <select
                                value={filtros.utilizador_id}
                                onChange={(event) => aplicarFiltros({ utilizador_id: event.target.value })}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os utilizadores</option>
                                {utilizadores.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.16}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhum registo de actividade encontrado para os filtros seleccionados.
                            </p>
                        </AnimatedPanel>
                    ) : (
                        <>
                            <AnimatedPanel delay={0.16} className="overflow-hidden">
                                <motion.div
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {dados.map((registo) => {
                                        const evento = eventoConfig[registo.event] ?? {
                                            label: registo.event,
                                            tone: "slate",
                                            icon: ScrollText,
                                        };
                                        const Icon = evento.icon;
                                        const aberto = expandido === registo.id;
                                        const temAlteracoes = Object.keys(registo.properties?.attributes ?? {}).length > 0;

                                        return (
                                            <motion.div key={registo.id} variants={itemVariants} className="p-4 sm:px-6">
                                                <button
                                                    type="button"
                                                    onClick={() => temAlteracoes && setExpandido(aberto ? null : registo.id)}
                                                    className={cn(
                                                        "flex w-full items-start justify-between gap-3 text-left",
                                                        temAlteracoes && "cursor-pointer",
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                {registo.description}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                {registo.causer?.name ?? "Sistema"} &middot;{" "}
                                                                {formatDateTime(registo.created_at)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <StatusBadge tone={evento.tone}>{evento.label}</StatusBadge>
                                                        {temAlteracoes && (
                                                            <ChevronDown
                                                                className={cn(
                                                                    "h-4 w-4 text-slate-400 transition-transform",
                                                                    aberto && "rotate-180",
                                                                )}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </div>
                                                </button>
                                                {aberto && <Alteracoes propriedades={registo.properties} />}
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            </AnimatedPanel>
                            <Pagination paginador={registos} />
                        </>
                    )}
                </div>
            </div>

            <Modal show={showLimparModal} onClose={() => setShowLimparModal(false)} title="Limpar registos antigos" maxWidth="sm">
                <form onSubmit={confirmarLimpeza} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Elimina permanentemente os registos de actividade mais antigos do que o número de dias
                        indicado. Esta acção não pode ser revertida.
                    </p>
                    <div>
                        <InputLabel htmlFor="dias" value="Eliminar registos com mais de (dias)" />
                        <TextInput
                            id="dias"
                            type="number"
                            min="30"
                            max="1825"
                            required
                            value={dias}
                            onChange={(event) => setDias(event.target.value)}
                            className="mt-1 block w-full"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowLimparModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit">Eliminar registos</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </DevLayout>
    );
}
