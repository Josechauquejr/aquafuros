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
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, MaisDetalhes } from "@/Components/DataTable/Detalhe";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ResumoMes from "@/Components/ResumoMes";
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

// Consumo acima de N × a média do cliente dispara o aviso ao registar/confirmar.
const FACTOR_ACIMA_DA_MEDIA = 3;

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "todos", estado: "todos", sort: "periodo", dir: "desc" };

const filtrosConfig = [
    {
        chave: "estado",
        rotulo: "Estado",
        tipo: "select",
        padrao: "todos",
        opcoes: [
            { valor: "todos", rotulo: "Todos" },
            { valor: "pendente", rotulo: "Pendente" },
            { valor: "confirmada", rotulo: "Confirmada" },
            { valor: "facturada", rotulo: "Facturada" },
        ],
    },
];

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
                <p className="font-semibold text-slate-900 dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>
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
            {!leitura.__linhaAgrupada && <p className="font-semibold text-slate-900 dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>}
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

export default function Index({ leituras, clientes, totais, mesReferencia, pendentesTotal = 0, facturarAoConfirmar = false, filtros }) {
    const { flash, auth } = usePage().props;
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

    const abrirNova = () => {
        setEditando(null);
        form.reset();
        form.setData({ ...formVazio, cliente_id: "" });
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
                `O consumo (${formatVolume(consumo)}) é mais de ${FACTOR_ACIMA_DA_MEDIA} vezes a média deste cliente (${formatVolume(media)}).`,
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
                { icone: Eye, rotulo: "Ver detalhe", expandir: true },
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
                    <div className="flex flex-wrap items-center gap-2">
                        {pendentesTotal > 0 && (
                            <AnimatedButton variant="secondary" onClick={() => setConfirmarTodasAberto(true)}>
                                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                                Confirmar todas
                            </AnimatedButton>
                        )}
                        {ehAdministrador && (
                            <AnimatedButton as={Link} href="/lixeira?tipo=leituras" variant="secondary">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Lixeira
                            </AnimatedButton>
                        )}
                        <AnimatedButton variant="primary" onClick={abrirNova} disabled={clientes.length === 0}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Nova leitura
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Leituras" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    <ResumoMes rota="/leituras" tipo="leituras" mesReferencia={mesReferencia} dados={totais} filtros={filtros} />

                    <DataTable
                        rota="/leituras"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={leituras}
                        agruparPor={(leitura) => ({ id: `cliente-${leitura.cliente_id}`, label: leitura.cliente?.nome ?? "Cliente removido" })}
                        colunas={colunas}
                        cartao={cartaoLeitura}
                        detalhe={detalheLeitura}
                        placeholder="Pesquisar cliente"
                        periodo
                        filtrosConfig={filtrosConfig}
                        accoes={accoesLeitura}
                        rotuloAccoes={(leitura) => `Mais acções sobre a leitura de ${leitura.cliente?.nome ?? "cliente removido"}`}
                        selecao={selecao}
                        vazio={{
                            mensagem: "Ainda não há leituras registadas.",
                            mensagemFiltrada: "Nenhuma leitura encontrada para os filtros seleccionados.",
                            accao: { rotulo: "Nova leitura", icone: Plus, onClick: abrirNova, disabled: clientes.length === 0 },
                        }}
                    />
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
                                        <span className="font-medium text-slate-900 dark:text-white">{cliente.nome}</span>
                                    )}
                                />
                            </div>
                            <InputError message={form.errors.cliente_id} className="mt-1" />
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="mes" value="Mês" />
                                <select
                                    id="mes"
                                    value={form.data.mes}
                                    onChange={(event) => form.setData("mes", event.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                        <PrimaryButton type="submit" disabled={form.processing || (!editando && !form.data.cliente_id)}>
                            {editando ? "Guardar alterações" : "Registar leitura"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={Boolean(corrigindo)} onClose={() => setCorrigindo(null)} title="Corrigir leitura confirmada" maxWidth="md">
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
                            <div><InputLabel htmlFor="correccao_mes" value="Mês" /><select id="correccao_mes" value={corrigirForm.data.mes} onChange={(event) => corrigirForm.setData("mes", event.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{meses.map((nome, index) => <option key={nome} value={index + 1}>{nome}</option>)}</select><InputError message={corrigirForm.errors.mes} className="mt-1" /></div>
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
