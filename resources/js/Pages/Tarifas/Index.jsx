import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    Lock,
    Unlock,
    CalendarOff,
    Check,
    ChevronRight,
    Clock,
    Pencil,
    Percent,
    Plus,
    PlugZap,
    RefreshCcw,
    RotateCcw,
    ShieldAlert,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import CabecalhoLista from "@/Components/CabecalhoLista";
import Ilustracao from "@/Components/Ilustracao";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import Textarea from "@/Components/Textarea";
import TextInput from "@/Components/TextInput";
import { Campo, Campos, Destaque, Destaques, SeccaoDetalhe } from "@/Components/DataTable/Detalhe";
import { ExpandableCard } from "@/Components/ui/expandable-card";
import SeletorMesGrelha from "@/Components/SeletorMesGrelha";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

const regrasGerais = [
    {
        titulo: "Prazo de pagamento",
        descricao: "A factura vence no dia 10 do mês seguinte à emissão. As emitidas entre os dias 20 e 29 vencem no dia 10 imediatamente seguinte.",
        icon: Clock,
    },
    {
        titulo: "Multa por atraso",
        descricao: "Depois do vencimento, é calculada uma vez sobre o principal em atraso, segundo a percentagem da tarifa. No pagamento, o caixa pode recebê-la ou deixá-la em aberto para ser transferida para a factura seguinte.",
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

const NOMES_MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function nomeMes(referencia) {
    if (!referencia) return "";
    const [ano, mes] = referencia.split("-").map(Number);

    return `${NOMES_MESES[mes - 1] ?? referencia} ${ano}`;
}

export default function Index({ tarifas, taxaLigacao, regrasConfig, mesesMulta, detalheMulta, mesAtual }) {
    const { flash } = usePage().props;
    const [editandoId, setEditandoId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [editandoTaxaLigacao, setEditandoTaxaLigacao] = useState(false);
    const [taxaLigacaoEditada, setTaxaLigacaoEditada] = useState(String(taxaLigacao));
    const regrasForm = useForm({
        leituras_dia_limite: regrasConfig.leituras_dia_limite,
        pagamento_dias_retroactivos: regrasConfig.pagamento_dias_retroactivos,
    });
    const isencaoForm = useForm({ mes: mesAtual, motivo: "" });
    const [m3Simulado, setM3Simulado] = useState(14);
    const [tarifaSimulada, setTarifaSimulada] = useState(() => tarifas.find((t) => t.is_active)?.id ?? tarifas[0]?.id);
    const [prazosAbertos, setPrazosAbertos] = useState(false);
    const [formIsencaoAberto, setFormIsencaoAberto] = useState(false);
    const [mesAberto, setMesAberto] = useState(null);
    const [detalheAberto, setDetalheAberto] = useState(false);
    const [acaoMulta, setAcaoMulta] = useState(null);
    const [aGravarMulta, setAGravarMulta] = useState(false);
    const mesesBloqueados = Object.fromEntries(
        mesesMulta.filter((item) => item.isenta).map((item) => [item.referencia, "já sem multa"]),
    );
    const mesJaIsento = Boolean(mesesBloqueados[isencaoForm.data.mes]);
    const mesesIsentos = mesesMulta.filter((item) => item.isenta).length;
    const totalPerdido = mesesMulta.reduce((soma, item) => soma + Number(item.valor_dispensado), 0);
    const detalheCarregado = detalheMulta?.referencia === mesAberto?.referencia ? detalheMulta : null;

    const podeDesactivar = Boolean(isencaoForm.data.mes) && isencaoForm.data.motivo.trim().length >= 5 && !mesJaIsento;

    const abrirFormIsencao = (aberto) => {
        setFormIsencaoAberto(aberto);
        if (!aberto) isencaoForm.clearErrors();
    };

    const desactivarMes = (event) => {
        event.preventDefault();
        if (!podeDesactivar || isencaoForm.processing) return;
        isencaoForm.transform((data) => ({ ...data, isenta: true }));
        isencaoForm.put("/tarifas/multas-mensais", {
            preserveScroll: true,
            onSuccess: () => {
                isencaoForm.reset("motivo");
                setFormIsencaoAberto(false);
            },
        });
    };

    const abrirMes = (item) => {
        setMesAberto(item);
        setDetalheAberto(true);
        router.reload({ only: ["detalheMulta"], data: { detalhe: item.referencia }, preserveScroll: true, preserveState: true });
    };

    const executarAcaoMulta = () => {
        if (!acaoMulta) return;
        const { tipo, item } = acaoMulta;
        setAcaoMulta(null);
        setAGravarMulta(true);
        router.put(
            "/tarifas/multas-mensais",
            tipo === "repor" ? { mes: item.referencia, isenta: false, repor: true } : { mes: item.referencia, isenta: false },
            { preserveScroll: true, onFinish: () => setAGravarMulta(false) },
        );
    };

    const form = useForm(formVazio);


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

    const n = (v) => Number(v ?? 0);
    const dinheiro = (v) => formatCurrency(v);
    const simulada = tarifas.find((t) => t.id === tarifaSimulada) ?? tarifas[0];
    const m3 = Math.max(0, n(m3Simulado));
    const noMinimo = simulada ? m3 <= n(simulada.consumo_minimo_m3) : false;
    const paga = simulada ? (noMinimo ? n(simulada.taxa_minima) : m3 * n(simulada.preco_m3)) : 0;
    const multa = simulada ? paga * n(simulada.percentagem_multa) : 0;

    const linhasDaTarifa = (t) => [
        [dinheiro(t.preco_m3), "por cada m³ gasto acima do mínimo"],
        [dinheiro(t.taxa_minima), `é o mínimo do mês (quem gasta até ${n(t.consumo_minimo_m3)} m³ paga isto)`],
        [`${(n(t.percentagem_multa) * 100).toFixed(0)}%`, "de multa se pagar depois do dia 10"],
        [dinheiro(t.limiar_corte), "em atraso: o cliente entra em risco de corte"],
    ];

    return (
        <AdminLayout>
            <Head title="Tarifas e regras" />

            <div className="mx-auto mb-6 flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CabecalhoLista contexto="Configuração" titulo="Tarifas e regras" resumo="As mudanças só valem para facturas novas. As já emitidas não mudam.">
                    <SecondaryButton type="button" onClick={abrirModal} className="min-h-[48px]">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Nova tarifa
                    </SecondaryButton>
                </CabecalhoLista>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="flex flex-col gap-4">
                        {tarifas.map((tarifa) => (
                            <AnimatedPanel key={tarifa.id} className="overflow-hidden">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                                    <div className="flex flex-col gap-0.5">
                                        <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Tarifa {tarifa.nome.toLowerCase()}</h2>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">
                                            {tarifa.is_active ? "Activa" : "Inactiva"} · {tarifa.clientes_count ?? 0} {(tarifa.clientes_count ?? 0) === 1 ? "cliente" : "clientes"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <SecondaryButton type="button" onClick={() => abrirEdicao(tarifa)} className="min-h-[40px]">
                                            <Pencil className="h-4 w-4" aria-hidden="true" />
                                            Editar
                                        </SecondaryButton>
                                        {(tarifa.clientes_count ?? 0) === 0 && (
                                            <IconButton tone="danger" onClick={() => setParaEliminar(tarifa)} title="Eliminar tarifa">
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </IconButton>
                                        )}
                                    </div>
                                </div>
                                <ul className="grid gap-3 p-6 sm:grid-cols-2">
                                    {linhasDaTarifa(tarifa).map(([valor, texto]) => (
                                        <li key={texto} className="flex flex-col gap-1 rounded-[14px] bg-slate-50 px-4 py-3.5 dark:bg-[#1E232D]">
                                            <strong className="text-xl tabular-nums text-ink dark:text-[#F2F5FB]">{valor}</strong>
                                            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{texto}</span>
                                        </li>
                                    ))}
                                </ul>
                            </AnimatedPanel>
                        ))}

                        <AnimatedPanel className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
                            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                <strong className="text-ink dark:text-[#F2F5FB]">Taxa de ligação</strong> · cobrada uma vez, numa factura à parte, nos contratos novos
                            </span>
                            {editandoTaxaLigacao ? (
                                <span className="flex items-center gap-2">
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
                                        aria-label="Taxa de ligação"
                                        className="min-h-[44px] w-36 rounded-md border-[#DDE2EE] text-right tabular-nums dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                    />
                                    <IconButton tone="success" onClick={guardarTaxaLigacao} title="Guardar">
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    </IconButton>
                                    <IconButton onClick={() => setEditandoTaxaLigacao(false)} title="Cancelar">
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </IconButton>
                                </span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    <strong className="text-lg tabular-nums text-ink dark:text-[#F2F5FB]">{dinheiro(taxaLigacao)}</strong>
                                    <button type="button" onClick={iniciarEdicaoTaxaLigacao} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                        Editar
                                    </button>
                                </span>
                            )}
                        </AnimatedPanel>
                    </div>

                    {simulada && (
                        <section aria-labelledby="simular" className="flex flex-col gap-4 rounded-lg bg-brand p-6 text-white shadow-sm dark:bg-[#161A22] dark:ring-1 dark:ring-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="dark">
                                    <Ilustracao nome="factura" largura={72} />
                                </span>
                                <h2 id="simular" className="text-lg font-bold">Experimente a tarifa</h2>
                            </div>
                            {tarifas.length > 1 && (
                                <select
                                    value={tarifaSimulada}
                                    onChange={(e) => setTarifaSimulada(Number(e.target.value))}
                                    aria-label="Tarifa"
                                    className="min-h-[44px] rounded-md border-white/20 bg-white/10 text-sm text-white [&>option]:text-ink"
                                >
                                    {tarifas.map((t) => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            )}
                            <label className="flex flex-col gap-2 text-sm text-[#C9D6EA]">
                                Um cliente que gastou este mês
                                <span className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={m3Simulado}
                                        onChange={(e) => setM3Simulado(e.target.value)}
                                        aria-label="Metros cúbicos"
                                        className="min-h-[48px] w-28 rounded-md border-white/20 bg-white/10 text-right text-xl font-bold tabular-nums text-white"
                                    />
                                    <span className="text-base font-semibold text-white">m³</span>
                                </span>
                            </label>
                            <div className="flex flex-col gap-1 rounded-[14px] bg-white/10 p-4">
                                <span className="text-sm text-[#C9D6EA]">paga</span>
                                <strong className="text-[32px] font-extrabold tabular-nums">{dinheiro(paga)}</strong>
                                <span className="text-[13px] text-[#C9D6EA]">
                                    {noMinimo ? `Até ${n(simulada.consumo_minimo_m3)} m³ paga o mínimo do mês.` : `${m3} m³ × ${dinheiro(simulada.preco_m3)}`}
                                </span>
                            </div>
                            <span className="text-sm text-[#C9D6EA]">
                                Se pagar depois do dia 10: <strong className="text-white">+{dinheiro(multa)}</strong> de multa.
                            </span>
                        </section>
                    )}
                </div>

                <AnimatedPanel className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Prazos do mês</h2>
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                                {prazosAbertos ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                                {prazosAbertos ? "A editar" : "Bloqueados"}
                            </span>
                        </div>
                        {!prazosAbertos && (
                            <SecondaryButton type="button" onClick={() => setPrazosAbertos(true)} className="min-h-[44px]">
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Editar prazos
                            </SecondaryButton>
                        )}
                    </div>
                    <form
                        onSubmit={(evento) => {
                            evento.preventDefault();
                            regrasForm.put("/tarifas/regras", { preserveScroll: true, onSuccess: () => setPrazosAbertos(false) });
                        }}
                        className="flex flex-col gap-5 p-6"
                    >
                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">Leituras feitas até ao dia</span>
                                <input type="number" min="1" max="28" disabled={!prazosAbertos} value={regrasForm.data.leituras_dia_limite} onChange={(e) => regrasForm.setData("leituras_dia_limite", e.target.value)} className="min-h-[48px] w-28 rounded-md border-[#DDE2EE] tabular-nums disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]" />
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">Depois deste dia, quem não foi lido aparece no Painel.</span>
                                <InputError message={regrasForm.errors.leituras_dia_limite} />
                            </label>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">Facturas vencem no dia</span>
                                <span className="flex min-h-[48px] items-center gap-2 text-[15px] text-ink dark:text-[#F2F5FB]">
                                    <strong className="text-xl">10</strong> do mês seguinte
                                </span>
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">Regra fixa. Emitidas de 20 a 29 vencem no dia 10 seguinte.</span>
                            </div>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">O caixa pode datar um pagamento até</span>
                                <span className="flex items-center gap-2">
                                    <input type="number" min="0" max="60" disabled={!prazosAbertos} value={regrasForm.data.pagamento_dias_retroactivos} onChange={(e) => regrasForm.setData("pagamento_dias_retroactivos", e.target.value)} className="min-h-[48px] w-28 rounded-md border-[#DDE2EE] tabular-nums disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]" />
                                    <span className="text-[15px] text-slate-600 dark:text-slate-300">dias atrás</span>
                                </span>
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">Para pagamentos recebidos e registados mais tarde.</span>
                                <InputError message={regrasForm.errors.pagamento_dias_retroactivos} />
                            </label>
                        </div>
                        {prazosAbertos && (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-amber-50 px-4 py-3 dark:bg-[rgba(243,199,122,0.14)]">
                                <span className="text-sm text-amber-700 dark:text-amber-300">
                                    Os novos prazos valem a partir do próximo ciclo. As facturas já emitidas mantêm o prazo com que foram emitidas.
                                </span>
                                <span className="flex gap-2">
                                    <SecondaryButton type="button" onClick={() => { regrasForm.reset(); setPrazosAbertos(false); }}>
                                        Cancelar
                                    </SecondaryButton>
                                    <PrimaryButton disabled={regrasForm.processing || !regrasForm.isDirty}>Guardar prazos</PrimaryButton>
                                </span>
                            </div>
                        )}
                    </form>
                </AnimatedPanel>
            </div>

            <div>
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel delay={0.27}>
                        <div className="flex flex-col gap-4 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Multas por mês</h3>
                                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                                    {mesesIsentos} {mesesIsentos === 1 ? "mês sem multa" : "meses sem multa"} ·{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(totalPerdido)}</span> em multas dispensadas.
                                    Clique num mês para ver o detalhe.
                                </p>
                            </div>

                            <ExpandableCard
                                open={formIsencaoAberto}
                                onOpenChange={abrirFormIsencao}
                                title="Desactivar multas de um mês"
                                description="Multas por mês"
                                className="self-start rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                                classNameExpanded="max-w-lg"
                                trigger={
                                    <span className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-xs font-semibold uppercase text-white shadow-sm transition hover:bg-brand-hover dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400">
                                        <CalendarOff className="h-4 w-4" aria-hidden="true" />
                                        Desactivar mês
                                    </span>
                                }
                                footer={
                                    <div className="flex flex-wrap justify-end gap-3">
                                        <SecondaryButton type="button" onClick={() => abrirFormIsencao(false)}>
                                            Cancelar
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" form="form-isencao-multa" disabled={!podeDesactivar || isencaoForm.processing}>
                                            {isencaoForm.processing ? "A guardar…" : "Desactivar multas"}
                                        </PrimaryButton>
                                    </div>
                                }
                            >
                                <form id="form-isencao-multa" onSubmit={desactivarMes} className="space-y-5">
                                    <div>
                                        <InputLabel htmlFor="isencao_mes" value="Mês" />
                                        <div className="mt-1">
                                            <SeletorMesGrelha
                                                id="isencao_mes"
                                                valor={isencaoForm.data.mes}
                                                onChange={(mes) => isencaoForm.setData("mes", mes)}
                                                mesActual={mesAtual}
                                                bloqueados={mesesBloqueados}
                                                rotuloBloqueado="Já sem multa"
                                                layoutId="isencao-mes-pill"
                                            />
                                        </div>
                                        {mesJaIsento ? (
                                            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                                                {nomeMes(isencaoForm.data.mes)} já está sem multas.
                                            </p>
                                        ) : (
                                            <InputError message={isencaoForm.errors.mes} className="mt-1" />
                                        )}
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="isencao_motivo" value="Porquê?" />
                                        <Textarea
                                            id="isencao_motivo"
                                            required
                                            rows={4}
                                            maxLength={500}
                                            value={isencaoForm.data.motivo}
                                            onChange={(event) => isencaoForm.setData("motivo", event.target.value)}
                                            placeholder="Ex.: avaria no furo durante 2 semanas, facturas entregues com atraso…"
                                            className="mt-1 block w-full text-sm"
                                        />
                                        <InputError message={isencaoForm.errors.motivo} className="mt-1" />
                                    </div>

                                    <InlineNotice show tone="info">
                                        As multas de {nomeMes(isencaoForm.data.mes) || "este mês"} deixam de ser cobradas e as que estão em aberto nas facturas desse mês são dispensadas. Pode repô-las mais tarde.
                                    </InlineNotice>
                                </form>
                            </ExpandableCard>
                        </div>

                        <div>
                            <div>

                                {mesesMulta.length === 0 ? (
                                    <div className="m-6 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        Nenhum mês com multas desactivadas.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {mesesMulta.map((item) => (
                                            <li key={item.referencia}>
                                                <button
                                                    type="button"
                                                    onClick={() => abrirMes(item)}
                                                    className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold text-ink dark:text-white">{nomeMes(item.referencia)}</span>
                                                            <StatusBadge tone={item.isenta ? "emerald" : "slate"}>
                                                                {item.isenta ? "Sem multa" : "Reactivado"}
                                                            </StatusBadge>
                                                        </div>
                                                        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                                                            {item.motivo ?? "Sem motivo registado"}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className={cn(
                                                            "text-sm font-semibold tabular-nums",
                                                            item.valor_dispensado > 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-400 dark:text-slate-500",
                                                        )}>
                                                            {formatCurrency(item.valor_dispensado)}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {item.facturas_dispensadas} {item.facturas_dispensadas === 1 ? "factura" : "facturas"}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </AnimatedPanel>

                    <AnimatedPanel delay={0.28}>
                        <div className="border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">
                                Regras gerais de cobrança
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Aplicadas a todas as tarifas, salvo indicação em contrário.
                            </p>
                        </div>
                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            {regrasGerais.map((regra) => {
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
                                            <p className="font-semibold text-ink dark:text-white">
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
                description="Só vale para facturas emitidas depois de guardar."
                variante={editandoId ? "painel" : "centro"}
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

            {mesAberto && (
                <ExpandableCard
                    open={detalheAberto}
                    onOpenChange={setDetalheAberto}
                    title={nomeMes(mesAberto.referencia)}
                    description={mesAberto.isenta ? "Multas desactivadas" : "Multas reactivadas"}
                    classNameExpanded="max-w-xl"
                    footer={mesAberto.isenta || mesAberto.valor_dispensado > 0 ? (
                        <div className="flex flex-wrap justify-end gap-3">
                            {mesAberto.isenta && (
                                <SecondaryButton
                                    type="button"
                                    disabled={aGravarMulta}
                                    onClick={() => { setDetalheAberto(false); setAcaoMulta({ tipo: "reactivar", item: mesAberto }); }}
                                >
                                    Reactivar multas
                                </SecondaryButton>
                            )}
                            {mesAberto.valor_dispensado > 0 && (
                                <PrimaryButton
                                    type="button"
                                    disabled={aGravarMulta}
                                    onClick={() => { setDetalheAberto(false); setAcaoMulta({ tipo: "repor", item: mesAberto }); }}
                                >
                                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                    Repor multas
                                </PrimaryButton>
                            )}
                        </div>
                    ) : undefined}
                >
                    <Destaques>
                        <Destaque
                            rotulo="Multas perdidas"
                            tom={mesAberto.valor_dispensado > 0 ? "perigo" : "neutro"}
                            sub={`${mesAberto.facturas_dispensadas} ${mesAberto.facturas_dispensadas === 1 ? "factura" : "facturas"}`}
                        >
                            {formatCurrency(mesAberto.valor_dispensado)}
                        </Destaque>
                        <Destaque rotulo="Estado" tom={mesAberto.isenta ? "sucesso" : "neutro"}>
                            {mesAberto.isenta ? "Sem multa" : "Reactivado"}
                        </Destaque>
                    </Destaques>

                    <Campos className="mt-5">
                        <Campo rotulo="Porquê" largo>
                            <span className="whitespace-pre-line">{mesAberto.motivo ?? "Sem motivo registado."}</span>
                        </Campo>
                        {mesAberto.desactivada_em && (
                            <Campo rotulo="Desactivado">
                                {formatDateTime(mesAberto.desactivada_em)}{mesAberto.desactivada_por ? ` por ${mesAberto.desactivada_por}` : ""}
                            </Campo>
                        )}
                        {!mesAberto.isenta && mesAberto.reactivada_em && (
                            <Campo rotulo="Reactivado">
                                {formatDateTime(mesAberto.reactivada_em)}{mesAberto.reactivada_por ? ` por ${mesAberto.reactivada_por}` : ""}
                            </Campo>
                        )}
                    </Campos>

                    <SeccaoDetalhe titulo="Facturas afectadas">
                        {!detalheCarregado ? (
                            <div className="space-y-2" aria-busy="true">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
                                ))}
                            </div>
                        ) : detalheCarregado.facturas.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma factura deste mês tem multas dispensadas.
                            </p>
                        ) : (
                            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                                {detalheCarregado.facturas.map((factura) => (
                                    <li key={factura.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-ink dark:text-white">{factura.cliente ?? "—"}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {factura.numero}{factura.numero_cliente ? ` · ${factura.numero_cliente}` : ""}
                                            </p>
                                        </div>
                                        <span className="shrink-0 font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                                            {formatCurrency(factura.valor)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Só contam multas que já estavam lançadas quando o mês foi desactivado; enquanto estiver sem multa, não são geradas novas.
                        </p>
                    </SeccaoDetalhe>
                </ExpandableCard>
            )}

            <ConfirmDialog
                show={Boolean(acaoMulta)}
                onClose={() => setAcaoMulta(null)}
                onConfirm={executarAcaoMulta}
                title={acaoMulta?.tipo === "repor" ? "Repor multas dispensadas?" : "Reactivar multas neste mês?"}
                confirmLabel={acaoMulta?.tipo === "repor" ? "Sim, repor multas" : "Sim, reactivar"}
                cancelLabel="Não, cancelar"
                tone="primary"
                description={acaoMulta?.tipo === "repor"
                    ? `Confirma repor ${formatCurrency(acaoMulta.item.valor_dispensado)} em ${nomeMes(acaoMulta.item.referencia)}? O total em aberto e o estado das facturas serão actualizados, e as multas do mês serão reactivadas.`
                    : `Confirma reactivar as multas de ${nomeMes(acaoMulta?.item.referencia)}? Os valores dispensados continuam disponíveis em Repor multas.`}
            />

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
