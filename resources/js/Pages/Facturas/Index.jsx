import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    Ban,
    Banknote,
    BarChart3,
    CheckCircle2,
    Download,
    FileStack,
    FileText,
    GitCompare,
    Loader2,
    Pencil,
    Plus,
    Printer,
    Search,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import IconButton, { IconLink } from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputLabel from "@/Components/InputLabel";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import Pagination from "@/Components/Pagination";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import FacturaA4 from "@/Components/print/FacturaA4";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { baixarElementoComoPdf } from "@/lib/pdf";
import { itemVariants, listVariants } from "@/lib/motion";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const estadoFacturaConfig = {
    paga: { label: "Paga", tone: "emerald" },
    pendente: { label: "Pendente", tone: "amber" },
    parcial: { label: "Parcial", tone: "cyan" },
    anulada: { label: "Anulada", tone: "slate" },
};

const tipoConfig = {
    consumo: { label: "Consumo", tone: "cyan" },
    ligacao: { label: "Ligação", tone: "amber" },
};

const periodoOrdinal = (p) => Number(p.ano) * 12 + Number(p.mes);

export default function Index({
    facturas,
    leiturasDisponiveis,
    primeirasLeituras = {},
    consumosAnteriores = {},
    facturasAnteriores = {},
    qrUrls = {},
    resumoMensal: resumoMensalProp,
    periodosDisponiveis,
    totais,
    filtros,
}) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filtros.search ?? "");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [comparacao, setComparacao] = useState(null);
    const [paraAnular, setParaAnular] = useState(null);
    const [leituraSelecionada, setLeituraSelecionada] = useState(leiturasDisponiveis[0]?.id ?? "");
    const [selecionadas, setSelecionadas] = useState([]);
    const [showLoteModal, setShowLoteModal] = useState(false);
    const [periodoLote, setPeriodoLote] = useState("");
    const [pdfAlvo, setPdfAlvo] = useState(null);
    const [aDescarregarId, setADescarregarId] = useState(null);
    const [facturaParaPagar, setFacturaParaPagar] = useState(null);
    const pdfRef = useRef(null);
    const ultimaFacturaTratadaRef = useRef(null);

    const form = useForm({ divida_anterior: "", multa: "", estado: "pendente" });
    const loteForm = useForm({ mes: "", ano: "" });

    const dados = facturas.data;

    const aplicarFiltros = (novosFiltros) => {
        router.get("/facturas", { ...filtros, ...novosFiltros }, { preserveState: true, preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => aplicarFiltros({ search }), 350);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const mudarEstado = (estado) => aplicarFiltros({ estado });
    const mudarPeriodo = (periodo) => aplicarFiltros({ periodo });

    // Chegou aqui a partir de "Deseja emitir a factura agora?" (Leituras) —
    // pré-selecciona a leitura e abre logo o formulário de emissão.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const leituraId = params.get("leitura_id");
        if (leituraId && leiturasDisponiveis.some((l) => String(l.id) === leituraId)) {
            setEditando(null);
            setLeituraSelecionada(leituraId);
            setShowModal(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Depois de emitir uma factura, propõe o próximo passo natural: registar
    // o pagamento agora. Usa `flash.novaFactura` (disponível só no pedido
    // seguinte à criação) e desduplica pelo id para nunca reabrir o diálogo
    // numa navegação posterior não relacionada.
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

    const periodosParaLote = useMemo(() => {
        const contagem = new Map();
        leiturasDisponiveis.forEach((l) => {
            const chave = `${l.mes}/${l.ano}`;
            const actual = contagem.get(chave) ?? { mes: l.mes, ano: l.ano, quantidade: 0 };
            actual.quantidade += 1;
            contagem.set(chave, actual);
        });
        return [...contagem.entries()].sort((a, b) => periodoOrdinal(b[1]) - periodoOrdinal(a[1]));
    }, [leiturasDisponiveis]);

    const resumoMensal = useMemo(() => {
        return resumoMensalProp.map((grupo, index) => {
            const anterior = resumoMensalProp[index + 1];
            const variacao = anterior && Number(anterior.total) > 0
                ? ((Number(grupo.total) - Number(anterior.total)) / Number(anterior.total)) * 100
                : null;
            return { ...grupo, variacao };
        });
    }, [resumoMensalProp]);

    const metrics = [
        { label: "Total facturado", value: formatCurrency(totais.totalFacturado), icon: FileText, tone: "cyan" },
        { label: "Recebido (pagas)", value: formatCurrency(totais.totalPago), icon: CheckCircle2, tone: "emerald" },
        { label: "Em aberto", value: formatCurrency(totais.totalEmAberto), icon: Banknote, tone: "amber" },
        { label: "Facturas pendentes", value: totais.pendentesCount, icon: AlertTriangle, tone: "rose" },
    ];

    const abrirNova = () => {
        setEditando(null);
        setLeituraSelecionada(leiturasDisponiveis[0]?.id ?? "");
        setShowModal(true);
    };

    const abrirEdicao = (factura) => {
        setEditando(factura);
        form.setData({
            divida_anterior: factura.divida_anterior,
            multa: factura.multa,
            estado: factura.estado,
        });
        form.clearErrors();
        setShowModal(true);
    };

    const submitNovaFactura = (event) => {
        event.preventDefault();
        if (!leituraSelecionada) return;

        router.post(
            "/facturas",
            { leitura_id: leituraSelecionada },
            { onSuccess: () => setShowModal(false) },
        );
    };

    const submitEdicao = (event) => {
        event.preventDefault();
        form.put(`/facturas/${editando.id}`, { onSuccess: () => setShowModal(false) });
    };

    const confirmarAnulacao = () => {
        if (!paraAnular) return;
        router.delete(`/facturas/${paraAnular.id}`, { onFinish: () => setParaAnular(null), preserveScroll: true });
    };

    const abrirComparacao = (factura) => {
        setComparacao({ actual: factura, anterior: facturasAnteriores[factura.id] ?? null });
    };

    const abrirLote = () => {
        const primeiro = periodosParaLote[0];
        const chave = primeiro ? primeiro[0] : "";
        setPeriodoLote(chave);
        if (primeiro) loteForm.setData({ mes: primeiro[1].mes, ano: primeiro[1].ano });
        loteForm.clearErrors();
        setShowLoteModal(true);
    };

    const selecionarPeriodoLote = (chave) => {
        setPeriodoLote(chave);
        const [mes, ano] = chave.split("/");
        loteForm.setData({ mes, ano });
    };

    const submitLote = (event) => {
        event.preventDefault();
        loteForm.post("/facturas/emitir-lote", { onSuccess: () => setShowLoteModal(false) });
    };

    const toggleSelecao = (id) => {
        setSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const todasVisiveisSeleccionadas =
        dados.length > 0 && dados.every((f) => selecionadas.includes(f.id));

    const toggleSelecaoTodas = () => {
        if (todasVisiveisSeleccionadas) {
            setSelecionadas((prev) => prev.filter((id) => !dados.some((f) => f.id === id)));
        } else {
            setSelecionadas((prev) => [...new Set([...prev, ...dados.map((f) => f.id)])]);
        }
    };

    const iniciarDescarga = (factura) => {
        if (aDescarregarId) return;
        setADescarregarId(factura.id);
        setPdfAlvo({
            factura,
            primeiraLeitura: primeirasLeituras[factura.id] ?? false,
            consumoAnterior: consumosAnteriores[factura.id] ?? null,
            qrUrl: qrUrls[factura.id],
        });
    };

    useEffect(() => {
        if (!pdfAlvo || !pdfRef.current) return;
        let cancelado = false;

        (async () => {
            try {
                await baixarElementoComoPdf(pdfRef.current, `factura-${pdfAlvo.factura.numero_factura}.pdf`, "a4");
            } catch (erro) {
                console.error("Falha ao gerar o PDF:", erro);
            } finally {
                if (!cancelado) {
                    setPdfAlvo(null);
                    setADescarregarId(null);
                }
            }
        })();

        return () => {
            cancelado = true;
        };
    }, [pdfAlvo]);

    const urlImprimirPeriodo = () => {
        const params = new URLSearchParams();
        if (filtros.periodo !== "todos") {
            const [mes, ano] = filtros.periodo.split("/");
            params.set("mes", mes);
            params.set("ano", ano);
        }
        if (filtros.estado !== "todos") params.set("estado", filtros.estado);
        return `/facturas/imprimir-lote?${params.toString()}`;
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Facturação
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Facturas
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Ciclo de facturação do consumo registado nos furos.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <AnimatedButton
                            variant="secondary"
                            onClick={abrirLote}
                            disabled={periodosParaLote.length === 0}
                            title={periodosParaLote.length === 0 ? "Sem leituras confirmadas por facturar" : undefined}
                        >
                            <FileStack className="h-4 w-4" aria-hidden="true" />
                            Facturar mês
                        </AnimatedButton>
                        <AnimatedButton
                            variant="primary"
                            onClick={abrirNova}
                            disabled={leiturasDisponiveis.length === 0}
                            title={leiturasDisponiveis.length === 0 ? "Sem leituras confirmadas por facturar" : undefined}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Emitir factura
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Facturas" />

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

                    <AnimatedPanel delay={0.16} className="overflow-hidden">
                        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                                <BarChart3 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                Resumo e comparação mensal
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Facturação agrupada por mês — evita confundir clientes com facturas em vários
                                períodos.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Período</th>
                                        <th className="px-6 py-3 text-right">Nº facturas</th>
                                        <th className="px-6 py-3 text-right">Total facturado</th>
                                        <th className="px-6 py-3 text-right">Recebido</th>
                                        <th className="px-6 py-3 text-right">Em aberto</th>
                                        <th className="px-6 py-3 text-right">Vs. mês anterior</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {resumoMensal.map((grupo) => (
                                        <tr key={`${grupo.mes}/${grupo.ano}`}>
                                            <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">
                                                {meses[grupo.mes - 1]}/{grupo.ano}
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700 dark:text-slate-300">
                                                {grupo.quantidade}
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium text-slate-900 dark:text-white">
                                                {formatCurrency(grupo.total)}
                                            </td>
                                            <td className="px-6 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(grupo.recebido)}
                                            </td>
                                            <td className="px-6 py-3 text-right text-amber-600 dark:text-amber-400">
                                                {formatCurrency(grupo.em_aberto)}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                {grupo.variacao === null ? (
                                                    <span className="text-slate-400 dark:text-slate-500">—</span>
                                                ) : (
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center gap-1 font-medium",
                                                            grupo.variacao >= 0
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : "text-rose-600 dark:text-rose-400",
                                                        )}
                                                    >
                                                        {grupo.variacao >= 0 ? (
                                                            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                                                        ) : (
                                                            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                        )}
                                                        {Math.abs(grupo.variacao).toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </AnimatedPanel>

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
                                    placeholder="Pesquisar por cliente ou número de factura..."
                                    className="w-full pl-9"
                                />
                            </div>
                            <select
                                value={filtros.periodo}
                                onChange={(event) => mudarPeriodo(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os períodos</option>
                                {periodosDisponiveis.map((periodo) => (
                                    <option key={`${periodo.mes}/${periodo.ano}`} value={`${periodo.mes}/${periodo.ano}`}>
                                        {meses[periodo.mes - 1]}/{periodo.ano}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filtros.estado}
                                onChange={(event) => mudarEstado(event.target.value)}
                                className="rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="todos">Todos os estados</option>
                                <option value="pendente">Pendente</option>
                                <option value="parcial">Parcial</option>
                                <option value="paga">Paga</option>
                                <option value="anulada">Anulada</option>
                            </select>
                            <Link
                                href={urlImprimirPeriodo()}
                                target="_blank"
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                title="Imprimir todas as facturas dos filtros actuais"
                            >
                                <Printer className="h-4 w-4" aria-hidden="true" />
                                Imprimir filtradas
                            </Link>
                            {selecionadas.length > 0 && (
                                <Link
                                    href={`/facturas/imprimir-lote?ids=${selecionadas.join(",")}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-cyan-800"
                                >
                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                    Imprimir seleccionadas ({selecionadas.length})
                                </Link>
                            )}
                        </div>
                    </AnimatedPanel>

                    {dados.length === 0 ? (
                        <AnimatedPanel delay={0.28}>
                            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Nenhuma factura encontrada para os filtros seleccionados.
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
                                {dados.map((factura) => {
                                    const estado = estadoFacturaConfig[factura.estado];
                                    const tipo = tipoConfig[factura.tipo] ?? tipoConfig.consumo;
                                    const temAnterior = Boolean(facturasAnteriores[factura.id]);
                                    const consumo = factura.leitura
                                        ? Number(factura.leitura.leitura_actual) - Number(factura.leitura.leitura_anterior)
                                        : null;

                                    return (
                                        <motion.div
                                            key={factura.id}
                                            variants={itemVariants}
                                            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <label className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selecionadas.includes(factura.id)}
                                                        onChange={() => toggleSelecao(factura.id)}
                                                        className="mt-1 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">
                                                            {factura.numero_factura}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {factura.cliente?.nome ?? "Cliente removido"}
                                                        </p>
                                                    </div>
                                                </label>
                                                <div className="flex flex-col items-end gap-1">
                                                    <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                                                    {factura.tipo === "ligacao" && (
                                                        <StatusBadge tone={tipo.tone}>{tipo.label}</StatusBadge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                                                <span>{meses[factura.mes - 1]}/{factura.ano}</span>
                                                <span>{consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}</span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(factura.total_pagar)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <IconButton
                                                        onClick={() => abrirComparacao(factura)}
                                                        disabled={!temAnterior}
                                                        title={temAnterior ? "Comparar com o período anterior" : "Sem período anterior"}
                                                    >
                                                        <GitCompare className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconLink href={`/facturas/${factura.id}/imprimir`} target="_blank" title="Imprimir factura">
                                                        <Printer className="h-4 w-4" aria-hidden="true" />
                                                    </IconLink>
                                                    <IconButton
                                                        onClick={() => iniciarDescarga(factura)}
                                                        disabled={aDescarregarId === factura.id}
                                                        title="Descarregar PDF"
                                                    >
                                                        {aDescarregarId === factura.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                        ) : (
                                                            <Download className="h-4 w-4" aria-hidden="true" />
                                                        )}
                                                    </IconButton>
                                                    <IconButton onClick={() => abrirEdicao(factura)} title="Editar factura">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </IconButton>
                                                    <IconButton
                                                        tone="danger"
                                                        onClick={() => setParaAnular(factura)}
                                                        disabled={factura.estado === "anulada"}
                                                        title="Anular factura"
                                                    >
                                                        <Ban className="h-4 w-4" aria-hidden="true" />
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
                                    <table className="w-full min-w-[1080px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="w-10 px-6 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={todasVisiveisSeleccionadas}
                                                        onChange={toggleSelecaoTodas}
                                                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                        aria-label="Seleccionar todas as facturas visíveis"
                                                    />
                                                </th>
                                                <th className="px-6 py-3">Factura</th>
                                                <th className="px-6 py-3">Cliente</th>
                                                <th className="px-6 py-3">Período</th>
                                                <th className="px-6 py-3 text-right">Consumo</th>
                                                <th className="px-6 py-3 text-right">Total a pagar</th>
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
                                            {dados.map((factura) => {
                                                const estado = estadoFacturaConfig[factura.estado];
                                                const tipo = tipoConfig[factura.tipo] ?? tipoConfig.consumo;
                                                const temAnterior = Boolean(facturasAnteriores[factura.id]);
                                                const consumo = factura.leitura
                                                    ? Number(factura.leitura.leitura_actual) - Number(factura.leitura.leitura_anterior)
                                                    : null;

                                                return (
                                                    <motion.tr
                                                        key={factura.id}
                                                        variants={itemVariants}
                                                        whileHover={{ backgroundColor: "rgba(148, 163, 184, 0.08)" }}
                                                        className="transition"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selecionadas.includes(factura.id)}
                                                                onChange={() => toggleSelecao(factura.id)}
                                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                                                aria-label={`Seleccionar factura ${factura.numero_factura}`}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                                {factura.numero_factura}
                                                            </p>
                                                            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                                Emitida {formatDateTime(factura.created_at)}
                                                                {factura.tipo === "ligacao" && (
                                                                    <StatusBadge tone={tipo.tone}>{tipo.label}</StatusBadge>
                                                                )}
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {factura.cliente?.nome ?? "Cliente removido"}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                            {meses[factura.mes - 1]}/{factura.ano}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">
                                                            {consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white">
                                                            {formatCurrency(factura.total_pagar)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge tone={estado.tone}>{estado.label}</StatusBadge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <IconButton
                                                                    onClick={() => abrirComparacao(factura)}
                                                                    disabled={!temAnterior}
                                                                    title={temAnterior ? "Comparar com o período anterior" : "Sem período anterior"}
                                                                >
                                                                    <GitCompare className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconLink href={`/facturas/${factura.id}/imprimir`} target="_blank" title="Imprimir factura">
                                                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                                                </IconLink>
                                                                <IconButton
                                                                    onClick={() => iniciarDescarga(factura)}
                                                                    disabled={aDescarregarId === factura.id}
                                                                    title="Descarregar PDF"
                                                                >
                                                                    {aDescarregarId === factura.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                                                    ) : (
                                                                        <Download className="h-4 w-4" aria-hidden="true" />
                                                                    )}
                                                                </IconButton>
                                                                <IconButton onClick={() => abrirEdicao(factura)} title="Editar factura">
                                                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                                                </IconButton>
                                                                <IconButton
                                                                    tone="danger"
                                                                    onClick={() => setParaAnular(factura)}
                                                                    disabled={factura.estado === "anulada"}
                                                                    title="Anular factura"
                                                                >
                                                                    <Ban className="h-4 w-4" aria-hidden="true" />
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
                            <Pagination paginador={facturas} />
                        </>
                    )}
                </div>
            </div>

            <Modal
                show={showModal && !editando}
                onClose={() => setShowModal(false)}
                title="Emitir factura"
                maxWidth="lg"
            >
                <form onSubmit={submitNovaFactura} className="space-y-4">
                    {leiturasDisponiveis.length > 0 ? (
                        <div>
                            <InputLabel htmlFor="leitura_id" value="Leitura confirmada por facturar" />
                            <div className="mt-1">
                                <ListaPesquisavel
                                    itens={leiturasDisponiveis}
                                    valorSeleccionado={leituraSelecionada}
                                    onSeleccionar={(leitura) => setLeituraSelecionada(leitura.id)}
                                    obterId={(leitura) => leitura.id}
                                    obterOrdenacao={(leitura) => leitura.cliente?.nome ?? "Cliente removido"}
                                    obterTexto={(leitura) => leitura.cliente?.nome ?? "Cliente removido"}
                                    placeholder="Pesquisar cliente..."
                                    vazioTexto="Nenhuma leitura encontrada."
                                    renderItem={(leitura) => (
                                        <>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-900 dark:text-white">
                                                    {leitura.cliente?.nome ?? "Cliente removido"}
                                                </p>
                                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                                    {meses[leitura.mes - 1]}/{leitura.ano}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                                {(Number(leitura.leitura_actual) - Number(leitura.leitura_anterior)).toFixed(2)} m³
                                            </span>
                                        </>
                                    )}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                O valor é calculado automaticamente a partir da tarifa do cliente e da sua
                                dívida anterior.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Não há leituras confirmadas por facturar. Confirme uma leitura na página de
                            Leituras primeiro.
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={leiturasDisponiveis.length === 0}>
                            Emitir factura
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal
                show={showModal && Boolean(editando)}
                onClose={() => setShowModal(false)}
                title={editando ? `Editar factura ${editando.numero_factura}` : ""}
                maxWidth="lg"
            >
                {editando && (
                    <form onSubmit={submitEdicao} className="space-y-4">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                            Valor do consumo: <strong>{formatCurrency(editando.valor_consumo)}</strong> (calculado
                            a partir da leitura — não editável directamente).
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="divida_anterior" value="Dívida anterior" />
                                <TextInput
                                    id="divida_anterior"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.divida_anterior}
                                    onChange={(event) => form.setData("divida_anterior", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                            <div>
                                <InputLabel htmlFor="multa" value="Multa" />
                                <TextInput
                                    id="multa"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.data.multa}
                                    onChange={(event) => form.setData("multa", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="estado" value="Estado" />
                            <select
                                id="estado"
                                value={form.data.estado}
                                onChange={(event) => form.setData("estado", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="pendente">Pendente</option>
                                <option value="parcial">Parcial</option>
                                <option value="paga">Paga</option>
                                <option value="anulada">Anulada</option>
                            </select>
                        </div>

                        <div className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">
                            Novo total a pagar:{" "}
                            {formatCurrency(
                                Number(editando.valor_consumo) +
                                    (Number(form.data.divida_anterior) || 0) +
                                    (Number(form.data.multa) || 0),
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <SecondaryButton type="button" onClick={() => setShowModal(false)}>
                                Cancelar
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={form.processing}>
                                Guardar alterações
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal show={showLoteModal} onClose={() => setShowLoteModal(false)} title="Facturar mês" maxWidth="md">
                <form onSubmit={submitLote} className="space-y-4">
                    {periodosParaLote.length > 0 ? (
                        <div>
                            <InputLabel htmlFor="periodoLote" value="Período a facturar" />
                            <select
                                id="periodoLote"
                                value={periodoLote}
                                onChange={(event) => selecionarPeriodoLote(event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {periodosParaLote.map(([chave, periodo]) => (
                                    <option key={chave} value={chave}>
                                        {meses[periodo.mes - 1]}/{periodo.ano} — {periodo.quantidade} leitura(s)
                                        confirmada(s)
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                Gera uma factura para cada leitura confirmada e ainda por facturar desse
                                período, de uma só vez.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Não há leituras confirmadas por facturar em nenhum período.
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowLoteModal(false)}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={loteForm.processing || periodosParaLote.length === 0}>
                            Emitir facturas do mês
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraAnular)}
                onClose={() => setParaAnular(null)}
                onConfirm={confirmarAnulacao}
                title="Anular factura"
                confirmLabel="Anular"
                description={
                    paraAnular
                        ? `Tem a certeza que deseja anular a factura ${paraAnular.numero_factura} (${paraAnular.cliente?.nome ?? "cliente removido"})? A factura fica marcada como anulada, não é apagada.`
                        : ""
                }
            />

            <Modal
                show={Boolean(comparacao)}
                onClose={() => setComparacao(null)}
                title="Comparação de facturas"
                maxWidth="xl"
            >
                {comparacao && (
                    <div className="space-y-5">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {comparacao.actual.cliente?.nome ?? "Cliente removido"}
                        </p>

                        {comparacao.anterior ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { titulo: "Período anterior", factura: comparacao.anterior },
                                        { titulo: "Período actual", factura: comparacao.actual },
                                    ].map(({ titulo, factura }) => (
                                        <div
                                            key={titulo}
                                            className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                {titulo}
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                                {meses[factura.mes - 1]}/{factura.ano}
                                            </p>
                                            <dl className="mt-3 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <dt className="text-slate-500 dark:text-slate-400">Valor consumo</dt>
                                                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(factura.valor_consumo)}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-slate-500 dark:text-slate-400">Multa</dt>
                                                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                                                        {formatCurrency(factura.multa)}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                                                    <dt className="font-semibold text-slate-700 dark:text-slate-300">
                                                        Total
                                                    </dt>
                                                    <dd className="font-bold text-slate-950 dark:text-white">
                                                        {formatCurrency(factura.total_pagar)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ))}
                                </div>

                                {(() => {
                                    const deltaTotal = Number(comparacao.actual.total_pagar) - Number(comparacao.anterior.total_pagar);
                                    const pctTotal =
                                        Number(comparacao.anterior.total_pagar) > 0
                                            ? (deltaTotal / Number(comparacao.anterior.total_pagar)) * 100
                                            : 0;
                                    const subiu = deltaTotal > 0;

                                    return (
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 rounded-md border p-4",
                                                subiu
                                                    ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                                                    : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
                                            )}
                                        >
                                            {subiu ? (
                                                <TrendingUp
                                                    className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <TrendingDown
                                                    className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <p
                                                className={cn(
                                                    "text-sm font-medium",
                                                    subiu
                                                        ? "text-rose-800 dark:text-rose-200"
                                                        : "text-emerald-800 dark:text-emerald-200",
                                                )}
                                            >
                                                O total a pagar {subiu ? "subiu" : "desceu"}{" "}
                                                {Math.abs(pctTotal).toFixed(1)}% ({formatCurrency(Math.abs(deltaTotal))})
                                                face ao período anterior.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Este cliente ainda não tem uma factura anterior para comparação.
                            </p>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                show={Boolean(facturaParaPagar)}
                onClose={() => setFacturaParaPagar(null)}
                onConfirm={irParaRegistarPagamento}
                title="Factura emitida"
                tone="primary"
                confirmLabel="Registar pagamento"
                cancelLabel="Agora não"
                description={
                    facturaParaPagar
                        ? `Factura ${facturaParaPagar.numero_factura} emitida (${formatCurrency(facturaParaPagar.total_pagar)}). Deseja efectuar o pagamento agora?`
                        : ""
                }
            />

            {pdfAlvo && (
                <div style={{ position: "fixed", top: 0, left: "-10000px", zIndex: -1 }} aria-hidden="true">
                    <div ref={pdfRef}>
                        <FacturaA4
                            factura={pdfAlvo.factura}
                            primeiraLeitura={pdfAlvo.primeiraLeitura}
                            consumoAnterior={pdfAlvo.consumoAnterior}
                            qrUrl={pdfAlvo.qrUrl}
                        />
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
