import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    Ban,
    Banknote,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    Download,
    Eye,
    FileStack,
    FileText,
    GitCompare,
    Loader2,
    Mail,
    Pencil,
    Plus,
    Printer,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import FuseDanger from "@/Components/FuseDanger";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, Explicacao, MaisDetalhes, SeccaoDetalhe } from "@/Components/DataTable/Detalhe";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ResumoMes from "@/Components/ResumoMes";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import Textarea from "@/Components/Textarea";
import TextInput from "@/Components/TextInput";
import FacturaA4 from "@/Components/print/FacturaA4";
import { cn, formatDate, formatDateTime, formatMoney, formatNumero, formatVolume } from "@/lib/utils";
import { baixarElementoComoPdf } from "@/lib/pdf";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const estadoFacturaConfig = {
    paga: { label: "Paga", tone: "emerald" },
    pendente: { label: "Por pagar", tone: "amber" },
    parcial: { label: "Parcial", tone: "cyan" },
    anulada: { label: "Anulada", tone: "slate" },
};

const tipoConfig = {
    consumo: { label: "Consumo", tone: "cyan" },
    ligacao: { label: "Ligação", tone: "amber" },
};

const periodoOrdinal = (p) => Number(p.ano) * 12 + Number(p.mes);

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "todos", estado: "todos", sort: "factura", dir: "desc" };

const consumoDe = (factura) =>
    factura.leitura ? Number(factura.leitura.leitura_actual) - Number(factura.leitura.leitura_anterior) : null;

// "Vencida" não é um estado guardado: pendente/parcial com o prazo ultrapassado.
const estaVencida = (factura) =>
    ["pendente", "parcial"].includes(factura.estado) &&
    Boolean(factura.data_vencimento) &&
    new Date(factura.data_vencimento) < new Date();

function FacturaLink({ factura }) {
    return (
        <a
            href={`/facturas/${factura.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
        >
            {factura.numero_factura}
        </a>
    );
}

// Nas facturas parciais mostra o que ainda falta pagar (não o total).
function EmFalta({ factura }) {
    if (factura.estado !== "parcial" && !(factura.estado === "pendente" && Number(factura.total_pago) > 0)) return null;

    return (
        <span className="block text-xs font-medium text-cyan-700 dark:text-cyan-300">
            Em falta {formatMoney(factura.em_falta)}
        </span>
    );
}

// Quando é que há multa — a regra do cálculo (BillingService): ao emitir a
// factura SEGUINTE de um cliente, se a dívida em aberto dele já chegou ao
// limiar de corte da tarifa, a nova factura inclui a percentagem de multa
// da tarifa sobre essa dívida. Não depende da data de vencimento.
function ExplicacaoMulta({ factura }) {
    const tarifa = factura.cliente?.tarifa;
    if (!tarifa) return null;

    const percentagem = formatNumero(Number(tarifa.percentagem_multa) * 100, 0);

    return (
        <Explicacao tom="info" titulo="Quando há multa?" className="mt-4">
            A multa só é cobrada na próxima factura deste cliente: se nessa altura a dívida em aberto for de{" "}
            {formatMoney(tarifa.limiar_corte)} ou mais, essa factura inclui {percentagem}% dessa dívida como multa.
            Esta factura, por si só, não gera multa por passar do vencimento.
        </Explicacao>
    );
}

// O que cada estado quer dizer, em linguagem simples.
function explicarEstado(factura) {
    const vencimento = formatDate(factura.data_vencimento);
    const falta = formatMoney(factura.em_falta ?? factura.total_pagar);

    switch (factura.estado) {
        case "paga":
            return { tom: "sucesso", titulo: "Paga", texto: "Foi totalmente paga. Não há mais nada a cobrar." };
        case "anulada":
            return {
                tom: "neutro",
                titulo: "Anulada",
                texto: `Foi cancelada por ${factura.anulada_por?.name ?? "—"} em ${formatDate(factura.anulada_em)}${factura.motivo_anulacao ? `. Motivo: ${factura.motivo_anulacao}` : ""}. Já não conta como dívida e não pode receber pagamentos.`,
            };
        case "parcial":
            return factura.esta_vencida
                ? { tom: "perigo", titulo: "Parcial e vencida", texto: `Já foi paga em parte, mas o prazo terminou em ${vencimento} e ainda faltam ${falta}. Pode continuar a ser paga aos poucos até ficar totalmente paga.` }
                : { tom: "info", titulo: "Parcialmente paga", texto: `Já recebeu ${formatMoney(factura.total_pago)}; faltam ${falta}. Pode ser paga em várias vezes, até ${vencimento} ou depois, até ficar totalmente paga.` };
        default:
            return factura.esta_vencida
                ? { tom: "perigo", titulo: "Vencida", texto: `O prazo de pagamento terminou em ${vencimento} e ainda não foi paga (faltam ${falta}). Continua em aberto e conta como dívida do cliente.` }
                : { tom: "aviso", titulo: "Por pagar", texto: `Ainda não recebeu nenhum pagamento. Pode ser paga até ${vencimento} (faltam ${falta}).` };
    }
}

function EstadoFactura({ factura }) {
    const estado = estadoFacturaConfig[factura.estado];

    return (
        <>
            <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={estado.tone} title={explicarEstado(factura).texto}>
                    {estado.label}
                </StatusBadge>
                {estaVencida(factura) && (
                    <StatusBadge tone="rose" title="O prazo de pagamento já terminou e a factura continua por pagar.">
                        Vencida
                    </StatusBadge>
                )}
            </div>
            {factura.estado === "anulada" && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {factura.anulada_por?.name ?? "—"} &middot; {formatDate(factura.anulada_em)}
                </p>
            )}
        </>
    );
}

const colunas = [
    {
        chave: "factura",
        titulo: "Factura / Data",
        ordenavel: true,
        render: (factura) => (
            <>
                <p className="flex items-center gap-1.5">
                    <FacturaLink factura={factura} />
                    {factura.tipo === "ligacao" && <StatusBadge tone={tipoConfig.ligacao.tone}>{tipoConfig.ligacao.label}</StatusBadge>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(factura.created_at)}</p>
            </>
        ),
    },
    {
        chave: "cliente",
        titulo: "Cliente",
        ordenavel: true,
        render: (factura) => factura.cliente?.nome ?? "Cliente removido",
    },
    {
        chave: "periodo",
        titulo: "Período",
        ordenavel: true,
        render: (factura) => `${meses[factura.mes - 1]}/${factura.ano}`,
    },
    {
        chave: "total",
        titulo: "Total",
        ordenavel: true,
        direita: true,
        render: (factura) => (
            <>
                <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(factura.total_pagar)}</span>
                <EmFalta factura={factura} />
            </>
        ),
    },
    { chave: "estado", titulo: "Estado", ordenavel: true, render: (factura) => <EstadoFactura factura={factura} /> },
];

const cartaoFactura = (factura) => (
    <div className="space-y-2">
        <div>
            <p className="flex flex-wrap items-center gap-1.5">
                <FacturaLink factura={factura} />
                {factura.tipo === "ligacao" && <StatusBadge tone={tipoConfig.ligacao.tone}>{tipoConfig.ligacao.label}</StatusBadge>}
            </p>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                {factura.cliente?.nome ?? "Cliente removido"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {meses[factura.mes - 1]}/{factura.ano}
            </p>
        </div>
        <p className="font-semibold text-slate-900 dark:text-white">
            {formatMoney(factura.total_pagar)}
            <EmFalta factura={factura} />
        </p>
        <EstadoFactura factura={factura} />
    </div>
);

// Cartão expandido: o essencial da factura, o que o estado significa e,
// em "Mais detalhes", a composição do valor e quem emitiu.
const detalheFactura = {
    titulo: (factura) => factura.numero_factura,
    descricao: (factura) => factura.cliente?.nome ?? "Cliente removido",
    conteudo: (factura) => {
        const consumo = consumoDe(factura);
        const explicacao = explicarEstado(factura);
        const emAberto = ["pendente", "parcial"].includes(factura.estado);

        return (
            <>
                <Destaques>
                    <Destaque rotulo="Total a pagar">{formatMoney(factura.total_pagar)}</Destaque>
                    {emAberto ? (
                        <Destaque rotulo="Em falta" tom={factura.esta_vencida ? "perigo" : "primario"}>
                            {formatMoney(factura.em_falta)}
                        </Destaque>
                    ) : (
                        <Destaque rotulo="Estado">
                            <EstadoFactura factura={factura} />
                        </Destaque>
                    )}
                </Destaques>

                <Explicacao tom={explicacao.tom} titulo={explicacao.titulo} className="mt-4">
                    {explicacao.texto}
                </Explicacao>

                <Campos className="mt-5">
                    <Campo rotulo="Período">
                        {meses[factura.mes - 1]}/{factura.ano}
                    </Campo>
                    <Campo rotulo="Vencimento">{formatDate(factura.data_vencimento)}</Campo>
                    {Number(factura.multa) > 0 && (
                        <Campo rotulo="Multa incluída" largo>
                            <span className="text-rose-600 dark:text-rose-400">{formatMoney(factura.multa)}</span>
                        </Campo>
                    )}
                </Campos>

                {emAberto && <ExplicacaoMulta factura={factura} />}

                {factura.pagamentos?.length > 0 && (
                    <SeccaoDetalhe titulo="Pagamentos recebidos" icone={Banknote}>
                        <ul className="divide-y divide-border rounded-xl border border-border">
                            {factura.pagamentos.map((pagamento) => (
                                <li key={pagamento.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <span>
                                        <span className="font-medium text-foreground">{pagamento.numero_recibo}</span>
                                        <span className="block text-sm text-muted-foreground">
                                            {formatDateTime(pagamento.created_at)}
                                        </span>
                                    </span>
                                    <span className="font-semibold text-foreground">{formatMoney(pagamento.valor_pago)}</span>
                                </li>
                            ))}
                        </ul>
                    </SeccaoDetalhe>
                )}

                <MaisDetalhes>
                    <Campos>
                        <Campo rotulo="Tipo">{tipoConfig[factura.tipo]?.label ?? tipoConfig.consumo.label}</Campo>
                        <Campo rotulo="Consumo">{consumo !== null ? formatVolume(consumo) : null}</Campo>
                        <Campo rotulo="Valor do consumo">{formatMoney(factura.valor_consumo)}</Campo>
                        <Campo rotulo={factura.divida_anterior_incluida ? "Dívida anterior (incluída)" : "Dívida anterior (informativa)"}>{formatMoney(factura.divida_anterior)}</Campo>
                        <Campo rotulo="Multa">{formatMoney(factura.multa)}</Campo>
                        <Campo rotulo="Emitida em">{formatDateTime(factura.created_at)}</Campo>
                        <Campo rotulo="Emitida por">{factura.gerada_por?.name}</Campo>
                        <Campo rotulo="Email">{factura.cliente?.email}</Campo>
                        <Campo rotulo="Enviada por email">
                            {factura.ultimo_envio
                                ? factura.ultimo_envio.estado === "enviado"
                                    ? `Sim — ${formatDateTime(factura.ultimo_envio.created_at)}`
                                    : `Falhou — ${factura.ultimo_envio.erro ?? ""}`
                                : "Ainda não"}
                        </Campo>
                    </Campos>
                </MaisDetalhes>
            </>
        );
    },
};

export default function Index({
    facturas,
    leiturasDisponiveis,
    primeirasLeituras = {},
    consumosAnteriores = {},
    facturasAnteriores = {},
    qrUrls = {},
    resumoMensal: resumoMensalProp,
    emailAutomatico = false,
    totais,
    mesReferencia,
    filtros,
    facturaAlvo = null,
    accaoAlvo = null,
}) {
    const { flash, auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador") ?? false;
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [comparacao, setComparacao] = useState(null);
    const [paraAnular, setParaAnular] = useState(null);
    const [leituraSelecionada, setLeituraSelecionada] = useState(leiturasDisponiveis[0]?.id ?? "");
    const [resumoAberto, setResumoAberto] = useState(false);
    const [showLoteModal, setShowLoteModal] = useState(false);
    const [periodoLote, setPeriodoLote] = useState("");
    const [pdfAlvo, setPdfAlvo] = useState(null);
    const [aDescarregarId, setADescarregarId] = useState(null);
    const [facturaParaPagar, setFacturaParaPagar] = useState(null);
    const pdfRef = useRef(null);
    const ultimaFacturaTratadaRef = useRef(null);

    const form = useForm({ divida_anterior: "", multa: "", estado: "pendente" });
    const loteForm = useForm({ mes: "", ano: "", enviar_email: emailAutomatico });
    const [paraEnviar, setParaEnviar] = useState(null);
    const anularForm = useForm({ motivo_anulacao: "" });

    // Filtros do painel. "Anulada" só aparece ao administrador; "mes_ano"
    // vem do resumo mensal e só aparece como chip.
    const filtrosConfig = useMemo(
        () => [
            {
                chave: "estado",
                rotulo: "Estado",
                tipo: "select",
                padrao: "todos",
                opcoes: [
                    { valor: "todos", rotulo: "Todos" },
                    { valor: "pendente", rotulo: "Por pagar" },
                    { valor: "parcial", rotulo: "Parcial" },
                    { valor: "paga", rotulo: "Paga" },
                    { valor: "vencida", rotulo: "Vencida" },
                    ...(ehAdministrador ? [{ valor: "anulada", rotulo: "Anulada" }] : []),
                ],
            },
            {
                chave: "mes_ano",
                rotulo: "Mês",
                tipo: "oculto",
                padrao: "",
                opcoes: resumoMensalProp.map((g) => ({ valor: `${g.mes}/${g.ano}`, rotulo: `${meses[g.mes - 1]}/${g.ano}` })),
            },
        ],
        [ehAdministrador, resumoMensalProp],
    );

    // Clicar numa linha do resumo mensal: lista só as facturas desse mês.
    const filtrarPorMes = (mes, ano) =>
        router.get("/facturas", { mes_ano: `${mes}/${ano}` }, { preserveScroll: true, replace: true });

    // Chegou da ficha do cliente (?editar=ID / ?anular=ID): abre logo esse formulário.
    useEffect(() => {
        if (!facturaAlvo || !accaoAlvo) return;

        if (accaoAlvo === "editar" && facturaAlvo.estado === "pendente") abrirEdicao(facturaAlvo);
        if (accaoAlvo === "anular" && facturaAlvo.estado !== "anulada") abrirAnulacao(facturaAlvo);

        // Limpa o pedido do URL para um refresh não reabrir o formulário.
        window.history.replaceState(null, "", window.location.pathname);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const pctRecebido = totais.totalFacturado > 0
        ? Math.min(100, (totais.recebidoNoMes / totais.totalFacturado) * 100)
        : 0;
    const pctAberto = totais.totalFacturado > 0
        ? Math.min(100 - pctRecebido, (totais.emAberto / totais.totalFacturado) * 100)
        : 0;

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

    const abrirAnulacao = (factura) => {
        anularForm.reset();
        anularForm.clearErrors();
        setParaAnular(factura);
    };

    const confirmarAnulacao = (event) => {
        event?.preventDefault();
        if (!paraAnular) return;
        anularForm.delete(`/facturas/${paraAnular.id}`, {
            preserveScroll: true,
            onSuccess: () => setParaAnular(null),
        });
    };

    const abrirComparacao = (factura) => {
        setComparacao({ actual: factura, anterior: facturasAnteriores[factura.id] ?? null });
    };

    const abrirLote = () => {
        const primeiro = periodosParaLote[0];
        const chave = primeiro ? primeiro[0] : "";
        setPeriodoLote(chave);
        if (primeiro) loteForm.setData((d) => ({ ...d, mes: primeiro[1].mes, ano: primeiro[1].ano }));
        loteForm.clearErrors();
        setShowLoteModal(true);
    };

    const selecionarPeriodoLote = (chave) => {
        setPeriodoLote(chave);
        const [mes, ano] = chave.split("/");
        loteForm.setData((d) => ({ ...d, mes, ano }));
    };

    const submitLote = (event) => {
        event.preventDefault();
        loteForm.post("/facturas/emitir-lote", { onSuccess: () => setShowLoteModal(false) });
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

    // "Imprimir filtradas": reaproveita os filtros actuais do URL (sem página nem ordenação).
    const urlImprimirFiltradas = () => {
        const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
        ["page", "sort", "dir"].forEach((chave) => params.delete(chave));
        // O mês do seletor vira o filtro "mes_ano" que a impressão já entende.
        const mes = params.get("mes");
        if (mes) {
            const [ano, m] = mes.split("-");
            params.set("mes_ano", `${Number(m)}/${ano}`);
            params.delete("mes");
            params.delete("periodo");
        }
        return `/facturas/imprimir-lote?${params.toString()}`;
    };

    const semResultados = facturas.total === 0;

    const accoesFactura = (factura) => {
        const numero = factura.numero_factura;
        const emAberto = ["pendente", "parcial"].includes(factura.estado);
        const imprimir = { icone: Printer, rotulo: "Imprimir", href: `/facturas/${factura.id}/imprimir`, target: "_blank" };
        const aDescarregar = aDescarregarId === factura.id;

        return {
            principal: emAberto
                ? { icone: CreditCard, curto: "Receber", destaque: true, rotulo: `Receber pagamento da factura ${numero}`, href: `/pagamentos?factura_id=${factura.id}` }
                : factura.estado === "paga"
                  ? { ...imprimir, curto: "Imprimir", rotulo: `Imprimir factura ${numero}` }
                  : undefined,
            menu: [
                { icone: Eye, rotulo: "Ver detalhe", expandir: true },
                ...(factura.estado === "paga" ? [] : [imprimir]),
                {
                    icone: aDescarregar ? Loader2 : Download,
                    rotulo: aDescarregar ? "A gerar PDF…" : "Descarregar PDF",
                    disabled: aDescarregar,
                    motivo: "Já está a ser gerado um PDF.",
                    onClick: () => iniciarDescarga(factura),
                },
                {
                    icone: Mail,
                    rotulo: factura.ultimo_envio?.estado === "enviado" ? "Reenviar por email" : "Enviar por email",
                    disabled: !factura.cliente?.email || factura.estado === "anulada",
                    motivo: factura.estado === "anulada" ? "Uma factura anulada não se envia." : "O cliente não tem email registado — adicione-o na página de Clientes.",
                    onClick: () => setParaEnviar(factura),
                },
                {
                    icone: GitCompare,
                    rotulo: "Comparar com período anterior",
                    disabled: !facturasAnteriores[factura.id],
                    motivo: "Este cliente não tem factura de um período anterior.",
                    onClick: () => abrirComparacao(factura),
                },
                {
                    icone: Pencil,
                    rotulo: "Editar",
                    disabled: factura.estado !== "pendente",
                    motivo: "Só facturas por pagar, sem pagamentos registados, podem ser editadas.",
                    onClick: () => abrirEdicao(factura),
                },
                {
                    icone: Ban,
                    rotulo: "Anular",
                    tone: "danger",
                    separadorAntes: true,
                    disabled: factura.estado === "anulada",
                    motivo: "Esta factura já está anulada.",
                    onClick: () => abrirAnulacao(factura),
                },
            ],
        };
    };

    const selecao = {
        acoes: [
            {
                rotulo: "Enviar por email",
                icone: Mail,
                onClick: (ids, limpar) => router.post("/facturas/email-lote", { ids }, { preserveScroll: true, onSuccess: limpar }),
            },
            {
                rotulo: "Imprimir / PDF",
                icone: Printer,
                href: (ids) => `/facturas/imprimir-lote?ids=${ids.join(",")}`,
                target: "_blank",
            },
        ],
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
                        {filtros.estado !== "todos" && (
                            <AnimatedButton
                                as={semResultados ? "button" : "a"}
                                href={semResultados ? undefined : urlImprimirFiltradas()}
                                target={semResultados ? undefined : "_blank"}
                                variant="secondary"
                                disabled={semResultados}
                                title={semResultados ? "Os filtros actuais não têm resultados — nada para imprimir" : "Imprimir todas as facturas dos filtros actuais"}
                            >
                                <Printer className="h-4 w-4" aria-hidden="true" />
                                Imprimir filtradas
                            </AnimatedButton>
                        )}
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

                    <ResumoMes rota="/facturas" mesReferencia={mesReferencia} resumo={totais} filtros={filtros} />

                    {totais.totalFacturado > 0 && (
                        <AnimatedPanel delay={0.14} className="px-5 py-4">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>Recebido vs. em aberto do mês</span>
                                <span>
                                    {formatNumero((totais.recebidoNoMes / totais.totalFacturado) * 100, 0)}% recebido
                                </span>
                            </div>
                            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full bg-emerald-500" style={{ width: `${pctRecebido}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${pctAberto}%` }} />
                            </div>
                        </AnimatedPanel>
                    )}

                    <AnimatedPanel delay={0.16} className="overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setResumoAberto((prev) => !prev)}
                            className="flex w-full items-center justify-between gap-3 border-b border-slate-200 px-6 py-5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                            aria-expanded={resumoAberto}
                        >
                            <div>
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white">
                                    <BarChart3 className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                                    Resumo e comparação mensal
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Facturação agrupada por mês — evita confundir clientes com facturas em vários
                                    períodos.
                                </p>
                            </div>
                            <ChevronDown
                                className={cn(
                                    "h-5 w-5 shrink-0 text-slate-400 transition-transform",
                                    resumoAberto && "rotate-180",
                                )}
                                aria-hidden="true"
                            />
                        </button>
                        <AnimatePresence initial={false}>
                            {resumoAberto && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Período</th>
                                        <th className="px-6 py-3 text-right">Facturas</th>
                                        <th className="px-6 py-3 text-right">Total (MZN)</th>
                                        <th className="px-6 py-3 text-right">Recebido (MZN)</th>
                                        <th className="px-6 py-3 text-right">Em aberto (MZN)</th>
                                        <th className="px-6 py-3 text-right">Vs. mês anterior</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {resumoMensal.map((grupo) => (
                                        <tr
                                            key={`${grupo.mes}/${grupo.ano}`}
                                            onClick={() => filtrarPorMes(grupo.mes, grupo.ano)}
                                            title={`Filtrar a lista por ${meses[grupo.mes - 1]}/${grupo.ano}`}
                                            className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                        >
                                            <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">
                                                {meses[grupo.mes - 1]}/{grupo.ano}
                                            </td>
                                            <td className="px-6 py-3 text-right text-slate-700 dark:text-slate-300">
                                                {grupo.quantidade}
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium text-slate-900 dark:text-white">
                                                {formatNumero(grupo.total)}
                                            </td>
                                            <td className="px-6 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                                {formatNumero(grupo.recebido)}
                                            </td>
                                            <td className="px-6 py-3 text-right text-amber-600 dark:text-amber-400">
                                                {formatNumero(grupo.em_aberto)}
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
                                                        {formatNumero(Math.abs(grupo.variacao), 1)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </AnimatedPanel>

                    <DataTable
                        rota="/facturas"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={facturas}
                        colunas={colunas}
                        cartao={cartaoFactura}
                        detalhe={detalheFactura}
                        placeholder="Pesquisar cliente ou nº de factura"
                        periodo
                        filtrosConfig={filtrosConfig}
                        accoes={accoesFactura}
                        rotuloAccoes={(factura) => `Mais acções sobre ${factura.numero_factura}`}
                        selecao={selecao}
                        vazio={{
                            mensagem: "Ainda não há facturas emitidas.",
                            mensagemFiltrada: "Nenhuma factura encontrada para os filtros seleccionados.",
                            accao: { rotulo: "Emitir factura", icone: Plus, onClick: abrirNova, disabled: leiturasDisponiveis.length === 0 },
                        }}
                    />
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
                                                {formatVolume(Number(leitura.leitura_actual) - Number(leitura.leitura_anterior))}
                                            </span>
                                        </>
                                    )}
                                />
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                O valor é calculado automaticamente a partir da tarifa do cliente; a
                                dívida anterior aparece na factura só como informação (não se soma ao total).
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
                            Valor do consumo: <strong>{formatMoney(editando.valor_consumo)}</strong> (calculado
                            a partir da leitura — não editável directamente).
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {editando.divida_anterior_incluida && (
                            <div>
                                <InputLabel htmlFor="divida_anterior" value="Dívida anterior (factura antiga)" />
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
                            )}
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
                            {formatMoney(
                                Number(editando.valor_consumo) +
                                    (editando.divida_anterior_incluida ? Number(form.data.divida_anterior) || 0 : 0) +
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

                    <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                            type="checkbox"
                            checked={loteForm.data.enviar_email}
                            onChange={(event) => loteForm.setData("enviar_email", event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Enviar por email aos clientes que têm email (os outros ficam de fora). {emailAutomatico ? "Está activo por omissão em Administração › Email." : ""}</span>
                    </label>

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

            <Modal show={Boolean(paraAnular)} onClose={() => setParaAnular(null)} title="Anular factura" maxWidth="md">
                {paraAnular && (
                    <form onSubmit={confirmarAnulacao} className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Anular a factura <strong>{paraAnular.numero_factura}</strong> (
                            {paraAnular.cliente?.nome ?? "cliente removido"})? Fica marcada como anulada, não é
                            apagada, e a leitura associada também será anulada para não voltar a ser facturada.
                        </p>
                        <div>
                            <InputLabel htmlFor="motivo_anulacao" value="Motivo da anulação" />
                            <Textarea
                                id="motivo_anulacao"
                                required
                                rows={3}
                                value={anularForm.data.motivo_anulacao}
                                onChange={(event) => anularForm.setData("motivo_anulacao", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex.: factura duplicada, leitura registada por engano..."
                            />
                            <InputError message={anularForm.errors.motivo_anulacao} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <SecondaryButton type="button" onClick={() => setParaAnular(null)}>
                                Cancelar
                            </SecondaryButton>
                            <FuseDanger label="Anular factura" doneLabel="A anular…" disabled={anularForm.processing || !anularForm.data.motivo_anulacao.trim()} onCommit={() => confirmarAnulacao()} />
                        </div>
                    </form>
                )}
            </Modal>

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
                                                        {formatMoney(factura.valor_consumo)}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between">
                                                    <dt className="text-slate-500 dark:text-slate-400">Multa</dt>
                                                    <dd className="font-medium text-slate-800 dark:text-slate-200">
                                                        {formatMoney(factura.multa)}
                                                    </dd>
                                                </div>
                                                <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                                                    <dt className="font-semibold text-slate-700 dark:text-slate-300">
                                                        Total
                                                    </dt>
                                                    <dd className="font-bold text-slate-950 dark:text-white">
                                                        {formatMoney(factura.total_pagar)}
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
                                                {formatNumero(Math.abs(pctTotal), 1)}% ({formatMoney(Math.abs(deltaTotal))})
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
                show={Boolean(paraEnviar)}
                onClose={() => setParaEnviar(null)}
                onConfirm={() => {
                    router.post(`/facturas/${paraEnviar.id}/email`, {}, { preserveScroll: true, onFinish: () => setParaEnviar(null) });
                }}
                tone="primary"
                title="Enviar factura por email"
                confirmLabel="Enviar"
                description={paraEnviar ? `Enviar a factura ${paraEnviar.numero_factura} em PDF para ${paraEnviar.cliente?.email}?` : ""}
            />

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
                        ? `Factura ${facturaParaPagar.numero_factura} emitida (${formatMoney(facturaParaPagar.total_pagar)}). Deseja efectuar o pagamento agora?`
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
