import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Ban,
    CheckCheck,
    CheckCircle2,
    Eye,
    Pencil,
    Undo2,
    Plus,
    Trash2,
    Search,
    MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AbasEstado from "@/Components/AbasEstado";
import AnimatedPanel from "@/Components/AnimatedPanel";
import CabecalhoLista, { AvisoMesFechado } from "@/Components/CabecalhoLista";
import EstadoVazio from "@/Components/EstadoVazio";
import Ilustracao from "@/Components/Ilustracao";
import SeletorMes from "@/Components/SeletorMes";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, MaisDetalhes } from "@/Components/DataTable/Detalhe";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import FuseDanger from "@/Components/FuseDanger";
import Textarea from "@/Components/Textarea";
import TextInput from "@/Components/TextInput";
import { formatDate, formatDateTime, formatMoney, formatNumero, formatVolume } from "@/lib/utils";
import { consumoLeitura } from "@/lib/consumoLeitura";
import { previewPost } from "@/lib/previewPost";
import useAbrirNovo from "@/hooks/useAbrirNovo";
import { mesReferenciaActual } from "@/lib/mesReferencia";
import BarraProgresso from "@/Components/BarraProgresso";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const hoje = mesReferenciaActual();

const formVazio = {
    cliente_id: "",
    mes: hoje.mes,
    ano: hoje.ano,
    leitura_actual: "",
};

// Consumo acima de N × a média do cliente dispara o aviso ao registar/confirmar.
// Como no design: acima de 150% da média do cliente é anormal.
const FACTOR_ACIMA_DA_MEDIA = 1.5;

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "todos", estado: "todos", sort: "periodo", dir: "desc" };

const filtrosConfig = [];

const consumoDe = consumoLeitura;

function EstadoLeitura({ leitura }) {
    if (leitura.abertura) return <StatusBadge tone="slate">Abertura · não faturável</StatusBadge>;
    if (leitura.factura) return <StatusBadge tone="cyan">Facturada</StatusBadge>;
    return (
        <StatusBadge tone={leitura.confirmado ? "emerald" : "amber"}>
            {leitura.confirmado ? "Confirmada" : "Pendente"}
        </StatusBadge>
    );
}

function FacturaLink({ factura }) {
    return (
        <Link
            href={`/facturas/${factura.numero_factura}/imprimir`}
            prefetch="hover"
            cacheFor="5m"
            cacheTags="factura"
            className="whitespace-nowrap font-medium text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
        >
            {factura.numero_factura}
        </Link>
    );
}

const colunas = [
    {
        chave: "cliente",
        titulo: "Cliente",
        ordenavel: true,
        render: (leitura) => leitura.__linhaAgrupada ? null : (
            <>
                <p className="font-semibold text-ink dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{leitura.abertura ? "Valor inicial do contador" : formatDate(leitura.created_at)}</p>
            </>
        ),
    },
    {
        chave: "periodo",
        titulo: "Período",
        ordenavel: true,
        render: (leitura) => (
            leitura.abertura ? <p className="font-semibold">Abertura</p> : <>
                <p>{meses[leitura.mes - 1]}/{leitura.ano}</p>
                <p className="text-xs text-slate-500">{leitura.numero_leitura}</p>
            </>
        ),
    },
    {
        chave: "consumo",
        titulo: "Consumo",
        ordenavel: true,
        direita: true,
        render: (leitura) => (
            <span className="font-semibold text-cyan-700 dark:text-cyan-300">{leitura.abertura ? `${formatNumero(leitura.leitura_actual)} m³` : formatVolume(consumoDe(leitura))}</span>
        ),
    },
    {
        chave: "estado",
        titulo: "Estado",
        ordenavel: true,
        render: (leitura) => (
            <>
                <EstadoLeitura leitura={leitura} />
                {leitura.factura && (
                    <p className="mt-1 text-xs">
                        <FacturaLink factura={leitura.factura} />
                    </p>
                )}
            </>
        ),
    },
];

const cartaoLeitura = (leitura) => (
    <div className="space-y-2">
        <div>
            {!leitura.__linhaAgrupada && <p className="font-semibold text-ink dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {leitura.abertura ? "Valor inicial do contador" : `${formatDate(leitura.created_at)} · ${meses[leitura.mes - 1]}/${leitura.ano} · ${leitura.numero_leitura}`}
                </p>
        </div>
        <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{leitura.abertura ? `Contador: ${formatNumero(leitura.leitura_actual)} m³` : formatVolume(consumoDe(leitura))}</p>
        <div className="flex flex-wrap items-center gap-2">
            <EstadoLeitura leitura={leitura} />
        </div>
    </div>
);

// Cartão expandido: o essencial da leitura; o resto em "Mais detalhes".
const detalheLeitura = {
    titulo: (leitura) => leitura.cliente?.nome ?? "Cliente removido",
    descricao: (leitura) => leitura.abertura ? "Abertura do contador · não faturável" : `Leitura de ${meses[leitura.mes - 1]}/${leitura.ano}`,
    conteudo: (leitura) => (
        <>
            <Destaques>
                <Destaque rotulo={leitura.abertura ? "Leitura de abertura" : "Consumo"} tom="primario">
                    {leitura.abertura ? `${formatNumero(leitura.leitura_actual)} m³` : formatVolume(consumoDe(leitura))}
                </Destaque>
                <Destaque rotulo="Estado">
                    <EstadoLeitura leitura={leitura} />
                </Destaque>
            </Destaques>
            <Campos className="mt-5">
                <Campo rotulo="Contador">
                    {leitura.abertura ? `Contador inicial: ${formatNumero(leitura.leitura_actual)}` : `${formatNumero(leitura.leitura_anterior)} → ${formatNumero(leitura.leitura_actual)}`}
                </Campo>
                <Campo rotulo="Factura">{leitura.abertura ? "Não aplicável" : leitura.factura && <FacturaLink factura={leitura.factura} />}</Campo>
                {leitura.correccao_activa && (
                    <Campo rotulo="Corrigida">
                        {formatNumero(leitura.correccao_activa.leitura_antes)} → {formatNumero(leitura.correccao_activa.leitura_depois)} por{" "}
                        {leitura.correccao_activa.user?.name} em {formatDateTime(leitura.correccao_activa.created_at)} ({leitura.correccao_activa.motivo})
                    </Campo>
                )}
            </Campos>
            <MaisDetalhes>
                <Campos>
                    <Campo rotulo="Registada em">{formatDateTime(leitura.created_at)}</Campo>
                    <Campo rotulo="Registada por">{leitura.registado_por?.name}</Campo>
                </Campos>
            </MaisDetalhes>
        </>
    ),
};

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** "0 de 264 clientes lidos": barra geral e uma meta pequena por zona. */
function ProgressoLeituras({ contagens, zonas, ciclo, zonaActiva, onZona }) {
    const lidos = contagens.clientes - contagens.porLer;
    const pct = contagens.clientes > 0 ? Math.round((lidos / contagens.clientes) * 100) : 0;
    const dias = ciclo?.diasParaLimite ?? 0;
    const ritmo = contagens.porLer > 0 ? Math.ceil(contagens.porLer / Math.max(dias, 1)) : 0;

    return (
        <AnimatedPanel className="flex flex-col gap-3.5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-3.5 text-lg text-ink dark:text-[#F2F5FB]">
                    <Ilustracao nome="contador" largura={88} className="hidden sm:block" />
                    <span>
                        <strong className="text-[28px] tabular-nums">{lidos}</strong> de {plural(contagens.clientes, "cliente lido", "clientes lidos")}
                    </span>
                </span>
                {contagens.porLer > 0 ? (
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        {dias >= 0 ? `Faltam ${plural(dias, "dia", "dias")} · ${ritmo} por dia` : `Limite (${ciclo?.leiturasAte}) ultrapassado`}
                    </span>
                ) : (
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Todos lidos</span>
                )}
            </div>
            <BarraProgresso pct={Math.max(pct, lidos > 0 ? 2 : 1)} className="h-2.5" />
            {zonas.length > 1 && (
                <div className="mt-1.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                    {zonas.map((zona) => {
                        const on = zonaActiva === zona.nome;
                        return (
                            <button
                                key={zona.nome}
                                type="button"
                                onClick={() => onZona(on ? "" : zona.nome)}
                                aria-pressed={on}
                                className={`flex flex-col gap-1.5 rounded-md border px-3.5 py-3 text-left transition-colors ${on ? "border-[#B9CCFF] bg-[#F7F9FF] dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(0,89,255,0.10)]" : "border-[#E3E8F2] hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-white/[0.03]"}`}
                            >
                                <span className="flex justify-between gap-2 text-sm">
                                    <strong className="truncate text-ink dark:text-[#F2F5FB]">{zona.nome}</strong>
                                    <span className="tabular-nums text-slate-600 dark:text-slate-300">{zona.lidos}/{zona.total}</span>
                                </span>
                                <BarraProgresso pct={zona.total ? (zona.lidos / zona.total) * 100 : 0} className="h-[5px]" />
                            </button>
                        );
                    })}
                </div>
            )}
        </AnimatedPanel>
    );
}

/** Resumo de um mês já fechado. */
function ResumoMesFechado({ totais, contagens }) {
    const item = (rotulo, valor) => (
        <div className="flex flex-col gap-1">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">{rotulo}</span>
            <span className="text-2xl font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{valor}</span>
        </div>
    );
    const fechado = totais.pendentes === 0 && totais.semFactura === 0 && totais.total > 0;

    return (
        <AnimatedPanel className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 p-6">
            {item("Lidos", <>{totais.total} <span className="text-sm font-medium text-slate-500">de {contagens.clientes}</span></>)}
            {item("Estimados", contagens.estimadas)}
            {item("Consumo total", formatVolume(totais.consumoM3))}
            <div className="flex flex-col gap-1">
                <span className="text-[13px] text-slate-500 dark:text-slate-400">Estado do ciclo</span>
                {fechado ? (
                    <StatusBadge tone="emerald" className="self-start text-[13px]">Fechado e facturado</StatusBadge>
                ) : (
                    <StatusBadge tone="amber" className="self-start text-[13px]">
                        {totais.pendentes > 0 ? plural(totais.pendentes, "leitura por confirmar", "leituras por confirmar") : `${totais.semFactura} por facturar`}
                    </StatusBadge>
                )}
            </div>
        </AnimatedPanel>
    );
}

/** Separador "Por ler": quem falta ler este mês, com Registar em cada linha. */
function ListaPorLer({ porLer, abas, zona, onZona, onRegistar }) {
    const [texto, setTexto] = useState("");
    const [quantos, setQuantos] = useState(15);
    const zonasLista = [...new Set(porLer.map((c) => c.zona).filter(Boolean))].sort();
    const termo = texto.trim().toLowerCase();
    const filtrados = porLer.filter(
        (c) => (!zona || c.zona === zona) && (!termo || `${c.nome} ${c.numero_cliente}`.toLowerCase().includes(termo)),
    );

    return (
        <AnimatedPanel className="overflow-hidden">
            {abas}
            {porLer.length === 0 ? (
                <EstadoVazio ilustracao="sucesso" titulo="Todos os contadores lidos">
                    Não falta ninguém este mês. As leituras seguem para "Por confirmar".
                </EstadoVazio>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2.5 border-b border-[#E8ECF4] px-[18px] py-3.5 dark:border-slate-800">
                        <label className="flex min-h-[44px] flex-[1_1_260px] items-center gap-2.5 rounded-[10px] border border-[#DDE2EE] px-3 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:border-slate-800 dark:bg-[#1E232D]">
                            <Search className="h-[18px] w-[18px] text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            <input
                                type="search"
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                placeholder="Procurar cliente"
                                aria-label="Procurar cliente"
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]"
                            />
                        </label>
                        {zonasLista.length > 1 && (
                            <span className="relative inline-flex items-center text-slate-500">
                                <MapPin className="pointer-events-none absolute left-3.5 h-4 w-4" aria-hidden="true" />
                                <select
                                    aria-label="Zona"
                                    value={zona}
                                    onChange={(e) => onZona(e.target.value)}
                                    className="min-h-[44px] rounded-[10px] border-[#DDE2EE] bg-white pl-10 text-sm text-ink dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                >
                                    <option value="">Todas as zonas</option>
                                    {zonasLista.map((z) => (
                                        <option key={z}>{z}</option>
                                    ))}
                                </select>
                            </span>
                        )}
                    </div>
                    {filtrados.length === 0 ? (
                        <EstadoVazio ilustracao="pesquisa" titulo="Nada encontrado">Ninguém por ler com esta pesquisa.</EstadoVazio>
                    ) : (
                        <ul className="divide-y divide-[#EEF1F7] dark:divide-slate-800">
                            {filtrados.slice(0, quantos).map((cliente) => (
                                <li key={cliente.id} className="flex flex-wrap items-center gap-4 px-[18px] py-3">
                                    <div className="flex min-w-[180px] flex-1 flex-col">
                                        <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{cliente.nome}</strong>
                                        <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                            {cliente.numero_cliente}
                                            {cliente.zona ? ` · ${cliente.zona}` : ""}
                                        </span>
                                    </div>
                                    <StatusBadge tone="amber">Por ler</StatusBadge>
                                    <button
                                        type="button"
                                        onClick={() => onRegistar(cliente)}
                                        className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#DDE2EE] px-3.5 text-sm font-semibold text-cyan-700 hover:bg-slate-50 dark:border-slate-800 dark:text-cyan-400 dark:hover:bg-[#1E232D]"
                                    >
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                        Registar
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="border-t border-[#E8ECF4] px-[18px] py-3.5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        A mostrar {Math.min(quantos, filtrados.length)} de {filtrados.length}
                        {quantos < filtrados.length && (
                            <>
                                {" · "}
                                <button type="button" onClick={() => setQuantos((n) => n + 30)} className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    ver mais
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </AnimatedPanel>
    );
}

export default function Index({ leituras, clientes, totais, mesReferencia, pendentesTotal = 0, facturarAoConfirmar = false, filtros, porLer = [], zonas = [], contagens }) {
    const { flash, auth, ciclo } = usePage().props;
    const [zona, setZona] = useState("");
    const ehAdministrador = auth.roles?.includes("administrador");
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraAnular, setParaAnular] = useState(null);
    const [leituraParaFacturar, setLeituraParaFacturar] = useState(null);
    const [confirmarTodasAberto, setConfirmarTodasAberto] = useState(false);
    const [confirmandoTodas, setConfirmandoTodas] = useState(false);
    const [avisoLeitura, setAvisoLeitura] = useState(null);
    const [confirmarSeleccao, setConfirmarSeleccao] = useState(null);
    const [recemRegistada, setRecemRegistada] = useState(null);
    const [corrigindo, setCorrigindo] = useState(null);
    const [paraDesfazer, setParaDesfazer] = useState(null);
    const [previewAjuste, setPreviewAjuste] = useState(null);
    const [motivoAjuste, setMotivoAjuste] = useState("");
    const [aberturaEditando, setAberturaEditando] = useState(null);
    const [previewAbertura, setPreviewAbertura] = useState(null);
    const [confirmandoAbertura, setConfirmandoAbertura] = useState(false);
    const aberturaForm = useForm({ leitura_inicial: "" });
    const [motivoAbertura, setMotivoAbertura] = useState("");

    // O administrador que acaba de registar uma leitura decide logo se a confirma.
    useEffect(() => {
        if (ehAdministrador && flash?.leituraRegistada) setRecemRegistada(flash.leituraRegistada);
    }, [flash?.leituraRegistada]);

    const form = useForm(formVazio);
    const anularForm = useForm({ motivo_anulacao: "" });
    const corrigirForm = useForm({ leitura_actual: "", motivo: "" });

    const clienteSemInicial = Boolean(clientes.find((c) => String(c.id) === String(form.data.cliente_id))?.sem_leitura_inicial);

    const abrirNova = () => {
        setEditando(null);
        form.reset();
        form.setData({ ...formVazio, cliente_id: "" });
        form.clearErrors();
        setShowModal(true);
    };
    useAbrirNovo(abrirNova);

    const registarPara = (cliente) => {
        setEditando(null);
        form.reset();
        form.setData({ ...formVazio, cliente_id: cliente.id });
        form.clearErrors();
        setShowModal(true);
    };

    // Chegou do Painel do Técnico ("Clientes sem leitura"): abre logo o formulário
    // com esse cliente escolhido, em vez de o obrigar a procurá-lo outra vez.
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("cliente");
        if (!id) return;
        window.history.replaceState(null, "", window.location.pathname);
        if (!clientes.some((c) => String(c.id) === id)) return;
        setEditando(null);
        form.setData({ ...formVazio, cliente_id: Number(id) });
        form.clearErrors();
        setShowModal(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const abrirEdicaoAbertura = (leitura) => {
        setAberturaEditando(leitura);
        aberturaForm.setData("leitura_inicial", leitura.leitura_actual);
        aberturaForm.clearErrors();
        setMotivoAbertura("");
    };

    const previsualizarAbertura = async (event) => {
        event.preventDefault();
        try {
            const plano = await previewPost(
                `/clientes/${aberturaEditando.cliente.numero_cliente}/previsualizar-leitura-inicial`,
                aberturaForm.data,
            );
            setPreviewAbertura(plano);
        } catch (error) {
            aberturaForm.setError("leitura_inicial", error.message);
        }
    };

    const confirmarAbertura = () => {
        if (!previewAbertura?.pode_aplicar || motivoAbertura.trim().length < 5) return;
        aberturaForm.clearErrors();
        router.put(`/clientes/${aberturaEditando.cliente.numero_cliente}/leitura-inicial`, {
            leitura_inicial: aberturaForm.data.leitura_inicial,
            confirmar_leitura_inicial: true,
            motivo_leitura_inicial: motivoAbertura.trim(),
        }, {
            preserveScroll: true,
            onStart: () => setConfirmandoAbertura(true),
            onSuccess: () => {
                setPreviewAbertura(null);
                setAberturaEditando(null);
            },
            onError: (errors) => {
                Object.entries(errors).forEach(([campo, mensagem]) => aberturaForm.setError(campo, mensagem));
            },
            onFinish: () => setConfirmandoAbertura(false),
        });
    };

    // Leituras suspeitas: "anterior = 0" (o consumo seria calculado desde o
    // início do contador) ou consumo muito acima da média do cliente.
    // Só avisa — quem regista decide se prossegue.
    const avisosDaLeitura = (clienteId, anterior, actual) => {
        const media = clientes.find((c) => String(c.id) === String(clienteId))?.consumo_medio;
        const consumo = Number(actual) - Number(anterior);
        const avisos = [];

        if (Number(anterior) === 0) {
            avisos.push(
                "A leitura anterior é 0,00: o consumo será calculado desde o início do contador (pode dar uma factura muito alta). Confirme a leitura inicial do cliente.",
            );
        }
        if (media > 0 && consumo > media * FACTOR_ACIMA_DA_MEDIA) {
            avisos.push(
                `O consumo (${formatVolume(consumo)}) está acima de 150% da média deste cliente (${formatVolume(media)}).`,
            );
        }

        return avisos;
    };

    const comAviso = (avisos, prosseguir) => {
        if (avisos.length === 0) {
            prosseguir();
            return;
        }
        setAvisoLeitura({ avisos, prosseguir });
    };

    const submit = async (event) => {
        event.preventDefault();

        if (editando) {
            try {
                const plano = await previewPost(`/leituras/${editando.id}/previsualizar`, form.data);
                setPreviewAjuste({ tipo: "actualizar", plano });
                setMotivoAjuste("");
            } catch (error) {
                form.setError("leitura_actual", error.message);
            }
        } else {
            try {
                const plano = await previewPost("/leituras/previsualizar", form.data);
                if (plano.retroactiva) {
                    setPreviewAjuste({ tipo: "inserir", plano });
                    setMotivoAjuste("");
                    return;
                }
                const guardar = () => form.post("/leituras", { onSuccess: () => setShowModal(false) });
                comAviso(avisosDaLeitura(form.data.cliente_id, plano.leitura_anterior, form.data.leitura_actual), guardar);
            } catch (error) {
                form.setError("leitura_actual", error.message);
            }
        }
    };

    const confirmarAjuste = () => {
        if (!previewAjuste?.plano?.pode_aplicar) return;
        const precisaMotivo = previewAjuste.tipo === "inserir" || previewAjuste.plano.requer_motivo;
        if (precisaMotivo && motivoAjuste.trim().length < 5) return;
        const extras = { confirmar_impacto: true, motivo: motivoAjuste };
        if (previewAjuste.tipo === "inserir") {
            form.transform((data) => ({ ...data, ...extras })).post("/leituras", { onSuccess: () => { setPreviewAjuste(null); setShowModal(false); }, onFinish: () => form.transform((data) => data) });
        } else if (previewAjuste.tipo === "actualizar") {
            form.transform((data) => ({ ...data, ...extras })).put(`/leituras/${editando.id}`, { onSuccess: () => { setPreviewAjuste(null); setShowModal(false); }, onFinish: () => form.transform((data) => data) });
        } else {
            corrigirForm.transform((data) => ({ ...data, motivo: motivoAjuste })).put(`/leituras/${corrigindo.id}/corrigir`, { onSuccess: () => { setPreviewAjuste(null); setCorrigindo(null); }, onFinish: () => corrigirForm.transform((data) => data) });
        }
    };

    const confirmarLeitura = (leitura) => {
        const confirmar = () =>
            router.put(
                `/leituras/${leitura.id}`,
                { leitura_actual: leitura.leitura_actual, confirmado: true },
                // Se a factura sai sozinha ao confirmar, não há nada a perguntar.
                { preserveScroll: true, onSuccess: () => !facturarAoConfirmar && setLeituraParaFacturar(leitura) },
            );
        comAviso(avisosDaLeitura(leitura.cliente_id, leitura.leitura_anterior, leitura.leitura_actual), confirmar);
    };

    const confirmarRecemRegistada = () => {
        const leitura = recemRegistada;
        setRecemRegistada(null);
        confirmarLeitura(leitura);
    };

    const irParaEmitirFactura = () => {
        if (!leituraParaFacturar) return;
        router.visit(`/facturas?leitura_id=${leituraParaFacturar.id}`);
    };

    // Só o administrador corrige uma leitura confirmada; a factura (se houver) é recalculada.
    const abrirCorreccao = (leitura) => {
        corrigirForm.setData({ leitura_actual: leitura.leitura_actual, mes: leitura.mes, ano: leitura.ano, motivo: "" });
        corrigirForm.clearErrors();
        setCorrigindo(leitura);
    };

    const submeterCorreccao = async (event) => {
        event.preventDefault();
        if (Number(corrigirForm.data.mes) !== Number(corrigindo.mes) || Number(corrigirForm.data.ano) !== Number(corrigindo.ano)) {
            try {
                const plano = await previewPost(`/leituras/${corrigindo.id}/previsualizar`, corrigirForm.data);
                setPreviewAjuste({ tipo: "corrigir", plano });
                setMotivoAjuste(corrigirForm.data.motivo);
            } catch (error) {
                corrigirForm.setError("mes", error.message);
            }
            return;
        }
        corrigirForm.put(`/leituras/${corrigindo.id}/corrigir`, { preserveScroll: true, onSuccess: () => setCorrigindo(null) });
    };

    const desfazerCorreccao = () => {
        const correccao = paraDesfazer.correccao_activa;
        setParaDesfazer(null);
        router.post(`/leituras/correccoes/${correccao.id}/desfazer`, {}, { preserveScroll: true });
    };

    const abrirAnulacao = (leitura) => {
        anularForm.reset();
        anularForm.clearErrors();
        setParaAnular(leitura);
    };

    const confirmarAnulacao = (event) => {
        event?.preventDefault();
        if (!paraAnular) return;
        anularForm.delete(`/leituras/${paraAnular.id}`, {
            preserveScroll: true,
            onSuccess: () => setParaAnular(null),
        });
    };

    const confirmarTodas = () => {
        setConfirmandoTodas(true);
        router.put(
            "/leituras/confirmar-todas",
            { search: filtros.search || undefined },
            {
                preserveScroll: true,
                onFinish: () => {
                    setConfirmandoTodas(false);
                    setConfirmarTodasAberto(false);
                },
            },
        );
    };

    const confirmarSelecionadas = () => {
        if (!confirmarSeleccao) return;
        setConfirmandoTodas(true);
        router.put(
            "/leituras/confirmar-todas",
            { ids: confirmarSeleccao.ids },
            {
                preserveScroll: true,
                onSuccess: () => confirmarSeleccao.limpar(),
                onFinish: () => {
                    setConfirmandoTodas(false);
                    setConfirmarSeleccao(null);
                },
            },
        );
    };

    const accoesLeitura = (leitura) => {
        if (leitura.abertura) {
            if (!ehAdministrador) return undefined;
            return { menu: [
                { icone: Eye, rotulo: "Ver detalhe", expandir: true },
                { icone: Pencil, rotulo: "Editar leitura de abertura", onClick: () => abrirEdicaoAbertura(leitura) },
            ] };
        }
        const nome = leitura.cliente?.nome ?? "cliente removido";

        return {
            principal: leitura.confirmado
                ? undefined
                : { icone: CheckCircle2, rotulo: `Confirmar leitura de ${nome}`, curto: "Confirmar", destaque: true, onClick: () => confirmarLeitura(leitura) },
            menu: [
                { icone: Eye, rotulo: "Ver leitura explicada", href: `/leituras/${leitura.id}` },
                leitura.confirmado
                    ? {
                          icone: Pencil,
                          rotulo: "Corrigir leitura",
                          disabled: !ehAdministrador,
                          motivo: "Só o administrador pode corrigir uma leitura confirmada.",
                          onClick: () => abrirCorreccao(leitura),
                      }
                    : { icone: Pencil, rotulo: "Editar", onClick: () => abrirEdicao(leitura) },
                ...(ehAdministrador && leitura.correccao_activa
                    ? [{ icone: Undo2, rotulo: "Desfazer correcção", onClick: () => setParaDesfazer(leitura) }]
                    : []),
                {
                    icone: Ban,
                    rotulo: "Anular",
                    tone: "danger",
                    separadorAntes: true,
                    onClick: () => abrirAnulacao(leitura),
                },
            ],
        };
    };

    const selecao = {
        podeSeleccionar: (leitura) => !leitura.abertura,
        acoes: [
            {
                rotulo: "Confirmar",
                icone: CheckCheck,
                onClick: (ids, limpar) => setConfirmarSeleccao({ ids, limpar }),
            },
        ],
    };

    const eActual = mesReferencia.eActual;
    const nomeMes = mesReferencia.rotulo;
    const mesCiclo = ciclo?.mes ?? "";
    const comMes = (extra) => ({ ...(filtros.mes ? { mes: filtros.mes } : {}), ...extra });
    const separador =
        filtros.estado === "pendente"
            ? "pendente"
            : ["confirmadas", "confirmada", "facturada"].includes(filtros.estado)
              ? "confirmadas"
              : eActual
                ? "porler"
                : "todos";
    const abasLista = eActual
        ? [
              { chave: "porler", rotulo: "Por ler", contagem: contagens.porLer },
              { chave: "pendente", rotulo: "Por confirmar", contagem: contagens.porConfirmar },
              { chave: "confirmadas", rotulo: "Confirmadas", contagem: contagens.confirmadas },
              { chave: "estimadas", rotulo: "Estimadas", contagem: contagens.estimadas },
          ]
        : [
              { chave: "todos", rotulo: "Leituras do mês", contagem: totais.total },
              { chave: "estimadas", rotulo: "Estimadas", contagem: contagens.estimadas },
          ];
    const escolherSeparador = (aba) => {
        if (aba.chave === "estimadas") return router.visit("/leituras-estimadas");
        router.get("/leituras", comMes(aba.chave === "porler" || aba.chave === "todos" ? {} : { estado: aba.chave }), { preserveScroll: true, preserveState: false });
    };
    const abas = <AbasEstado abas={abasLista} activa={separador} onEscolher={escolherSeparador} rotulo="Estado das leituras" />;

    const vazios = {
        pendente: { ilustracao: "confirmar", titulo: "Nada por confirmar", mensagem: "As leituras aparecem aqui assim que forem registadas. Pode confirmá-las uma a uma ou todas de uma vez." },
        confirmadas: { ilustracao: "contador", titulo: "Ainda sem leituras confirmadas", mensagem: "Depois de confirmadas, ficam prontas para facturar no fim do mês." },
        todos: { ilustracao: "contador", titulo: `Sem leituras em ${nomeMes}`, mensagem: "Não há leituras registadas neste mês." },
    };

    return (
        <AdminLayout>
            <Head title="Leituras" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CabecalhoLista
                    contexto={eActual ? `Ciclo de ${mesCiclo} · dia ${ciclo?.dia ?? ""} de ${ciclo?.dias ?? ""}` : `Ciclo de ${nomeMes} · fechado`}
                    titulo="Leituras"
                >
                    <SeletorMes rota="/leituras" mesReferencia={mesReferencia} semVoltar />
                    {eActual && (
                        <PrimaryButton type="button" onClick={abrirNova} disabled={clientes.length === 0} className="min-h-[48px] px-[22px]">
                            <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                            Registar leitura
                        </PrimaryButton>
                    )}
                </CabecalhoLista>

                {!eActual && (
                    <AvisoMesFechado href="/leituras" rotuloVoltar={`Voltar a ${mesCiclo}`}>
                        A ver <strong>{nomeMes}</strong>, um mês já fechado. Pode consultar, mas não registar leituras novas.
                    </AvisoMesFechado>
                )}

                {eActual ? (
                    <ProgressoLeituras
                        contagens={contagens}
                        zonas={zonas}
                        ciclo={ciclo}
                        zonaActiva={zona}
                        onZona={(nome) => {
                            setZona(nome);
                            if (separador !== "porler") router.get("/leituras", {}, { preserveScroll: true });
                        }}
                    />
                ) : (
                    <ResumoMesFechado totais={totais} contagens={contagens} />
                )}

                {separador === "porler" ? (
                    <ListaPorLer porLer={porLer} abas={abas} zona={zona} onZona={setZona} onRegistar={registarPara} />
                ) : (
                    <DataTable
                        rota="/leituras"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={leituras}
                        agruparPor={(leitura) => ({ id: `cliente-${leitura.cliente_id}`, label: leitura.cliente?.nome ?? "Cliente removido" })}
                        colunas={colunas}
                        cartao={cartaoLeitura}
                        detalhe={detalheLeitura}
                        placeholder="Procurar cliente"
                        filtrosConfig={filtrosConfig}
                        accoes={accoesLeitura}
                        rotuloAccoes={(leitura) => `Mais acções sobre a leitura de ${leitura.cliente?.nome ?? "cliente removido"}`}
                        selecao={selecao}
                        abas={
                            <>
                                {abas}
                                {separador === "pendente" && pendentesTotal > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] bg-[#F7F9FF] px-[18px] py-3 dark:border-slate-800 dark:bg-[rgba(0,89,255,0.08)]">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            {plural(pendentesTotal, "leitura espera", "leituras esperam")} confirmação.
                                        </span>
                                        <SecondaryButton type="button" onClick={() => setConfirmarTodasAberto(true)} className="min-h-[40px]">
                                            <CheckCheck className="h-4 w-4" aria-hidden="true" />
                                            Confirmar todas
                                        </SecondaryButton>
                                    </div>
                                )}
                            </>
                        }
                        rodape={
                            ehAdministrador && (
                                <Link href="/lixeira?tipo=leituras" className="inline-flex items-center gap-1.5 font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Leituras anuladas
                                </Link>
                            )
                        }
                        vazio={vazios[separador]}
                    />
                )}
            </div>

            <Modal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editando ? "Corrigir leitura" : "Registar leitura"}
                description={editando ? `${editando.cliente?.nome ?? ""} · ainda por confirmar` : "Escolha o cliente e escreva o que o contador marca."}
                variante={editando ? "painel" : "centro"}
                maxWidth="lg"
            >
                <form onSubmit={submit} className="space-y-4">
                    {!editando && (
                        <div>
                            <InputLabel htmlFor="cliente_id" value="Cliente" />
                            <div className="mt-1">
                                <ListaPesquisavel
                                    itens={clientes}
                                    valorSeleccionado={form.data.cliente_id}
                                    onSeleccionar={(cliente) => form.setData("cliente_id", cliente.id)}
                                    obterId={(cliente) => cliente.id}
                                    obterOrdenacao={(cliente) => cliente.nome}
                                    obterTexto={(cliente) => cliente.nome}
                                    placeholder="Pesquisar cliente..."
                                    vazioTexto="Nenhum cliente encontrado."
                                    renderItem={(cliente) => (
                                        <span className="font-medium text-ink dark:text-white">{cliente.nome}</span>
                                    )}
                                />
                            </div>
                            <InputError message={form.errors.cliente_id} className="mt-1" />
                            {clienteSemInicial && (
                                <div className="mt-2">
                                    <InlineNotice show tone="error">
                                        Este cliente ainda não tem a leitura inicial do contador. Um administrador deve registá-la na ficha do cliente antes da primeira leitura.
                                    </InlineNotice>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="mes" value="Mês" />
                                <select
                                    id="mes"
                                    value={form.data.mes}
                                    onChange={(event) => form.setData("mes", event.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                                Leitura anterior: {formatNumero(editando.leitura_anterior)}
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
                        <PrimaryButton type="submit" disabled={form.processing || (!editando && (!form.data.cliente_id || clienteSemInicial))}>
                            {editando ? "Guardar alterações" : "Registar leitura"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={Boolean(corrigindo)} onClose={() => setCorrigindo(null)} title="Corrigir leitura" description={corrigindo ? `${corrigindo.cliente?.nome ?? ""} · motivo obrigatório, fica no histórico` : undefined} etiqueta="SÓ ADMINISTRADOR" variante="painel">
                {corrigindo && (
                    <form onSubmit={submeterCorreccao} className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Leitura de <strong>{corrigindo.cliente?.nome ?? "cliente removido"}</strong> ({meses[corrigindo.mes - 1]}/{corrigindo.ano}).
                            Leitura anterior: {formatNumero(corrigindo.leitura_anterior)}.
                        </p>
                        {corrigindo.factura && corrigindo.factura.estado !== "anulada" && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                A factura <strong>{corrigindo.factura.numero_factura}</strong> será recalculada com o novo consumo. Se já foi enviada ao cliente, reenvie-a depois.
                            </div>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><InputLabel htmlFor="correccao_mes" value="Mês" /><select id="correccao_mes" value={corrigirForm.data.mes} onChange={(event) => corrigirForm.setData("mes", event.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink sm:text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{meses.map((nome, index) => <option key={nome} value={index + 1}>{nome}</option>)}</select><InputError message={corrigirForm.errors.mes} className="mt-1" /></div>
                            <div><InputLabel htmlFor="correccao_ano" value="Ano" /><TextInput id="correccao_ano" type="number" min="2000" max="2100" value={corrigirForm.data.ano} onChange={(event) => corrigirForm.setData("ano", event.target.value)} className="mt-1 block w-full" /><InputError message={corrigirForm.errors.ano} className="mt-1" /></div>
                        </div>
                        <div>
                            <InputLabel htmlFor="correccao_leitura" value="Leitura actual correcta" />
                            <TextInput
                                id="correccao_leitura"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={corrigirForm.data.leitura_actual}
                                onChange={(event) => corrigirForm.setData("leitura_actual", event.target.value)}
                                className="mt-1 block w-full"
                            />
                            <InputError message={corrigirForm.errors.leitura_actual} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="correccao_motivo" value="Motivo da correcção" />
                            <Textarea
                                id="correccao_motivo"
                                required
                                rows={3}
                                value={corrigirForm.data.motivo}
                                onChange={(event) => corrigirForm.setData("motivo", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex.: número lido mal no contador"
                            />
                            <InputError message={corrigirForm.errors.motivo} className="mt-1" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Fica registado quem corrigiu e porquê. Pode desfazer a correcção depois.</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <SecondaryButton type="button" onClick={() => setCorrigindo(null)}>Cancelar</SecondaryButton>
                            <PrimaryButton type="submit" disabled={corrigirForm.processing || !corrigirForm.data.motivo.trim()}>Guardar correcção</PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal show={Boolean(aberturaEditando && !previewAbertura)} onClose={() => setAberturaEditando(null)} title="Editar leitura de abertura" maxWidth="md">
                {aberturaEditando && !previewAbertura && <form onSubmit={previsualizarAbertura} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{aberturaEditando.cliente?.nome}: este valor é a referência do contador. Não gera factura nem pagamento; a alteração pode recalcular a primeira leitura mensal.</p>
                    <div>
                        <InputLabel htmlFor="leitura-inicial-lista" value="Valor de abertura (m³)" />
                        <TextInput id="leitura-inicial-lista" type="number" min="0" max="99999999" step="0.01" value={aberturaForm.data.leitura_inicial} onChange={(event) => aberturaForm.setData("leitura_inicial", event.target.value)} className="mt-1 block w-full" required />
                        <InputError message={aberturaForm.errors.leitura_inicial} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setAberturaEditando(null)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={aberturaForm.processing}>Pré-visualizar</PrimaryButton></div>
                </form>}
            </Modal>

            <Modal show={Boolean(previewAbertura)} onClose={() => setPreviewAbertura(null)} title="Pré-visualizar leitura de abertura" maxWidth="md">
                {previewAbertura && <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Leitura inicial: <strong>{formatNumero(previewAbertura.leitura_inicial_antes)} → {formatNumero(previewAbertura.leitura_inicial_depois)} m³</strong>.</p>
                    {previewAbertura.primeira ? <div className="rounded-lg border border-border p-4 text-sm"><p>Primeira leitura mensal: <strong>{previewAbertura.primeira.periodo}</strong> · contador {formatNumero(previewAbertura.primeira.contador)} m³</p><p className="mt-1">Consumo: {formatNumero(previewAbertura.primeira.consumo_antes)} → <strong>{formatNumero(previewAbertura.primeira.consumo_depois)} m³</strong></p>{previewAbertura.factura?.factura && <p className="mt-1">Factura {previewAbertura.factura.factura.numero_factura}: {formatMoney(previewAbertura.factura.total_antes)} → <strong>{previewAbertura.factura.total_depois == null ? "—" : formatMoney(previewAbertura.factura.total_depois)}</strong></p>}</div> : <p className="text-sm">Ainda não há leituras mensais; apenas o valor de abertura será actualizado.</p>}
                    {!previewAbertura.pode_aplicar && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">A factura da primeira leitura tem pagamentos ou não está pendente. Regularize-a antes de alterar a abertura.</p>}
                    <div><InputLabel htmlFor="motivo-abertura-lista" value="Motivo da alteração" /><Textarea id="motivo-abertura-lista" rows={3} value={motivoAbertura} onChange={(event) => { setMotivoAbertura(event.target.value); aberturaForm.clearErrors("motivo_leitura_inicial"); }} className="mt-1 block w-full" placeholder="Explique por que o valor de abertura está a ser corrigido" /><InputError message={aberturaForm.errors.motivo_leitura_inicial} className="mt-1" /></div>
                    <InputError message={aberturaForm.errors.leitura_inicial} />
                    <div className="flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setPreviewAbertura(null)}>Voltar</SecondaryButton><PrimaryButton type="button" disabled={!previewAbertura.pode_aplicar || motivoAbertura.trim().length < 5 || confirmandoAbertura} onClick={confirmarAbertura}>{confirmandoAbertura ? "A aplicar…" : "Confirmar correcção"}</PrimaryButton></div>
                </div>}
            </Modal>

            <Modal show={Boolean(previewAjuste)} onClose={() => setPreviewAjuste(null)} title="Pré-visualizar impacto da leitura" maxWidth="lg">
                {previewAjuste && <div className="space-y-4">
                    {previewAjuste.tipo === "inserir" ? <>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Nova leitura de <strong>{previewAjuste.plano.periodo}</strong>: contador anterior {formatNumero(previewAjuste.plano.leitura_anterior)}, consumo {formatNumero(previewAjuste.plano.consumo_novo)} m³.</p>
                        {previewAjuste.plano.seguinte && <div className="rounded-lg border border-border p-4 text-sm">Leitura seguinte ({previewAjuste.plano.seguinte.periodo}): consumo {formatNumero(previewAjuste.plano.seguinte.consumo_antes)} → <strong>{formatNumero(previewAjuste.plano.seguinte.consumo_depois)} m³</strong>.</div>}
                    </> : <div className="space-y-2 text-sm">{previewAjuste.plano.leituras?.map((item) => <div key={item.depois.id} className="rounded-lg border border-border p-3">Leitura {String(item.depois.mes).padStart(2, "0")}/{item.depois.ano}: contador anterior {formatNumero(item.antes.leitura_anterior)} → {formatNumero(item.depois.leitura_anterior)}; contador actual {formatNumero(item.antes.leitura_actual)} → {formatNumero(item.depois.leitura_actual)}.</div>)}</div>}
                    {previewAjuste.plano.facturas?.length > 0 && <div className="space-y-2">{previewAjuste.plano.facturas.map((impacto, index) => <div key={impacto.factura?.id ?? `${impacto.leitura_id}-${index}`} className="rounded-lg border border-border p-3 text-sm">{impacto.factura ? <>Factura <strong>{impacto.factura.numero_factura}</strong> ({impacto.factura.estado}): consumo {formatNumero(impacto.consumo_antes)} → {formatNumero(impacto.consumo_depois)} m³; total {formatMoney(impacto.total_antes)} → {impacto.total_depois == null ? "—" : formatMoney(impacto.total_depois)}.</> : <>Leitura {impacto.leitura_id}: consumo {formatNumero(impacto.consumo_antes)} → {formatNumero(impacto.consumo_depois)} m³; ainda sem factura.</>}</div>)}</div>}
                    {!previewAjuste.plano.pode_aplicar && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Há uma factura afectada com pagamentos ou num estado que não permite recalcular. Estorne/regularize os pagamentos antes de continuar.</p>}
                    {(previewAjuste.tipo === "inserir" || previewAjuste.plano.requer_motivo) && <div><InputLabel htmlFor="motivo-ajuste-leitura" value="Motivo" /><Textarea id="motivo-ajuste-leitura" rows={3} value={motivoAjuste} onChange={(event) => setMotivoAjuste(event.target.value)} className="mt-1 block w-full" placeholder="Explique por que esta leitura ou período está a ser corrigido" /></div>}
                    <div className="flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setPreviewAjuste(null)}>Cancelar</SecondaryButton><PrimaryButton type="button" disabled={!previewAjuste.plano.pode_aplicar || ((previewAjuste.tipo === "inserir" || previewAjuste.plano.requer_motivo) && motivoAjuste.trim().length < 5) || form.processing || corrigirForm.processing} onClick={confirmarAjuste}>Confirmar e aplicar</PrimaryButton></div>
                </div>}
            </Modal>

            <ConfirmDialog
                show={Boolean(recemRegistada)}
                onClose={() => setRecemRegistada(null)}
                onConfirm={confirmarRecemRegistada}
                title="Leitura registada"
                tone="primary"
                confirmLabel="Confirmar leitura"
                cancelLabel="Deixar pendente"
                description={
                    recemRegistada
                        ? `Leitura de ${recemRegistada.cliente?.nome ?? "cliente"} (${meses[recemRegistada.mes - 1]}/${recemRegistada.ano}): ${formatNumero(recemRegistada.leitura_anterior)} → ${formatNumero(recemRegistada.leitura_actual)}, consumo de ${formatVolume(consumoDe(recemRegistada))}. Deseja confirmá-la agora? ${facturarAoConfirmar ? "A factura será emitida e enviada ao cliente." : "Depois de confirmada, fica bloqueada para edição."}`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(paraDesfazer)}
                onClose={() => setParaDesfazer(null)}
                onConfirm={desfazerCorreccao}
                title="Desfazer correcção"
                confirmLabel="Desfazer"
                description={
                    paraDesfazer
                        ? `A leitura volta a ${formatNumero(paraDesfazer.correccao_activa.leitura_antes)}${paraDesfazer.factura ? " e a factura " + paraDesfazer.factura.numero_factura + " volta ao valor anterior" : ""}.`
                        : ""
                }
            />

            <Modal show={Boolean(paraAnular)} onClose={() => setParaAnular(null)} title="Anular leitura" maxWidth="md">
                {paraAnular && (
                    <form onSubmit={confirmarAnulacao} className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Anular a leitura de <strong>{paraAnular.cliente?.nome ?? "cliente removido"}</strong> (
                            {meses[paraAnular.mes - 1]}/{paraAnular.ano})? Vai para a lixeira, não é apagada de vez
                            {paraAnular.factura && (
                                <>
                                    , e a factura <strong>{paraAnular.factura.numero_factura}</strong> também será anulada
                                </>
                            )}
                            .
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
                                placeholder="Ex.: leitura registada por engano, contador mal lido..."
                            />
                            <InputError message={anularForm.errors.motivo_anulacao} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <SecondaryButton type="button" onClick={() => setParaAnular(null)}>
                                Cancelar
                            </SecondaryButton>
                            <FuseDanger label="Anular leitura" doneLabel="A anular…" disabled={anularForm.processing || !anularForm.data.motivo_anulacao.trim()} onCommit={() => confirmarAnulacao()} />
                        </div>
                    </form>
                )}
            </Modal>

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

            <ConfirmDialog
                show={confirmarTodasAberto}
                onClose={() => setConfirmarTodasAberto(false)}
                onConfirm={confirmarTodas}
                title="Confirmar todas as leituras"
                confirmLabel={confirmandoTodas ? "A confirmar..." : "Confirmar todas"}
                description={
                    filtros.search
                        ? `Tem a certeza que deseja confirmar todas as leituras pendentes de clientes que correspondam a "${filtros.search}"? Depois de confirmadas, ficam bloqueadas para edição.`
                        : "Tem a certeza que deseja confirmar todas as leituras pendentes? Depois de confirmadas, ficam bloqueadas para edição."
                }
            />

            <ConfirmDialog
                show={Boolean(avisoLeitura)}
                onClose={() => setAvisoLeitura(null)}
                onConfirm={() => {
                    const { prosseguir } = avisoLeitura;
                    setAvisoLeitura(null);
                    prosseguir();
                }}
                title="Verifique esta leitura"
                confirmLabel="Prosseguir mesmo assim"
                cancelLabel="Voltar"
                description={avisoLeitura?.avisos.join(" ") ?? ""}
            />

            <ConfirmDialog
                show={Boolean(confirmarSeleccao)}
                onClose={() => setConfirmarSeleccao(null)}
                onConfirm={confirmarSelecionadas}
                title="Confirmar leituras seleccionadas"
                confirmLabel={confirmandoTodas ? "A confirmar..." : "Confirmar"}
                description={`Confirmar ${confirmarSeleccao?.ids.length ?? 0} leitura(s) pendente(s)? Depois de confirmadas, ficam bloqueadas para edição. As que já estiverem confirmadas são ignoradas.`}
            />

        </AdminLayout>
    );
}
