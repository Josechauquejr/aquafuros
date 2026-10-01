import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Ban,
    CheckCheck,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    Pencil,
    Undo2,
    Plus,
    Trash2,
    Waves,
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
import KpiCard from "@/Components/KpiCard";
import ResumoMes from "@/Components/ResumoMes";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import FuseDanger from "@/Components/FuseDanger";
import Textarea from "@/Components/Textarea";
import TextInput from "@/Components/TextInput";
import { formatDate, formatDateTime, formatNumero, formatVolume } from "@/lib/utils";

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

const consumoDe = (leitura) => Number(leitura.leitura_actual) - Number(leitura.leitura_anterior);

function EstadoLeitura({ leitura }) {
    if (leitura.factura) return <StatusBadge tone="cyan">Facturada</StatusBadge>;
    return (
        <StatusBadge tone={leitura.confirmado ? "emerald" : "amber"}>
            {leitura.confirmado ? "Confirmada" : "Pendente"}
        </StatusBadge>
    );
}

function FacturaLink({ factura }) {
    return (
        <a
            href={`/facturas/${factura.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-medium text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
        >
            {factura.numero_factura}
        </a>
    );
}

const colunas = [
    {
        chave: "cliente",
        titulo: "Cliente",
        ordenavel: true,
        render: (leitura) => (
            <>
                <p className="font-semibold text-slate-900 dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(leitura.created_at)}</p>
            </>
        ),
    },
    {
        chave: "periodo",
        titulo: "Período",
        ordenavel: true,
        render: (leitura) => `${meses[leitura.mes - 1]}/${leitura.ano}`,
    },
    {
        chave: "consumo",
        titulo: "Consumo",
        ordenavel: true,
        direita: true,
        render: (leitura) => (
            <span className="font-semibold text-cyan-700 dark:text-cyan-300">{formatVolume(consumoDe(leitura))}</span>
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
            <p className="font-semibold text-slate-900 dark:text-white">{leitura.cliente?.nome ?? "Cliente removido"}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(leitura.created_at)} · {meses[leitura.mes - 1]}/{leitura.ano}
            </p>
        </div>
        <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{formatVolume(consumoDe(leitura))}</p>
        <div className="flex flex-wrap items-center gap-2">
            <EstadoLeitura leitura={leitura} />
        </div>
    </div>
);

// Cartão expandido: o essencial da leitura; o resto em "Mais detalhes".
const detalheLeitura = {
    titulo: (leitura) => leitura.cliente?.nome ?? "Cliente removido",
    descricao: (leitura) => `Leitura de ${meses[leitura.mes - 1]}/${leitura.ano}`,
    conteudo: (leitura) => (
        <>
            <Destaques>
                <Destaque rotulo="Consumo" tom="primario">
                    {formatVolume(consumoDe(leitura))}
                </Destaque>
                <Destaque rotulo="Estado">
                    <EstadoLeitura leitura={leitura} />
                </Destaque>
            </Destaques>
            <Campos className="mt-5">
                <Campo rotulo="Contador">
                    {formatNumero(leitura.leitura_anterior)} → {formatNumero(leitura.leitura_actual)}
                </Campo>
                <Campo rotulo="Factura">{leitura.factura && <FacturaLink factura={leitura.factura} />}</Campo>
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

export default function Index({ leituras, clientes, totais, resumoMes, mesReferencia, pendentesTotal = 0, facturarAoConfirmar = false, filtros }) {
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

    // O administrador que acaba de registar uma leitura decide logo se a confirma.
    useEffect(() => {
        if (ehAdministrador && flash?.leituraRegistada) setRecemRegistada(flash.leituraRegistada);
    }, [flash?.leituraRegistada]);

    const form = useForm(formVazio);
    const anularForm = useForm({ motivo_anulacao: "" });
    const corrigirForm = useForm({ leitura_actual: "", motivo: "" });

    const metrics = [
        { label: "Leituras do mês", value: totais.total, icon: Waves, tone: "cyan" },
        { label: "Confirmadas", value: totais.confirmadas, icon: CheckCircle2, tone: "emerald" },
        { label: "Pendentes de confirmação", value: totais.pendentes, icon: Clock, tone: "amber" },
        { label: "Confirmadas sem factura", value: totais.semFactura, icon: FileText, tone: "rose" },
    ];

    const abrirNova = () => {
        setEditando(null);
        form.reset();
        form.setData({ ...formVazio, cliente_id: "" });
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

    const submit = (event) => {
        event.preventDefault();

        if (editando) {
            const guardar = () =>
                form
                    .transform((data) => ({ leitura_actual: data.leitura_actual, confirmado: editando.confirmado }))
                    .put(`/leituras/${editando.id}`, { onSuccess: () => setShowModal(false) });
            comAviso(avisosDaLeitura(editando.cliente_id, editando.leitura_anterior, form.data.leitura_actual), guardar);
        } else {
            const cliente = clientes.find((c) => String(c.id) === String(form.data.cliente_id));
            const guardar = () => form.post("/leituras", { onSuccess: () => setShowModal(false) });
            comAviso(avisosDaLeitura(form.data.cliente_id, cliente?.leitura_anterior ?? 0, form.data.leitura_actual), guardar);
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
        corrigirForm.setData({ leitura_actual: leitura.leitura_actual, motivo: "" });
        corrigirForm.clearErrors();
        setCorrigindo(leitura);
    };

    const submeterCorreccao = (event) => {
        event.preventDefault();
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

                    <ResumoMes rota="/leituras" mesReferencia={mesReferencia} resumo={resumoMes} filtros={filtros} />

                    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <DataTable
                        rota="/leituras"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={leituras}
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
                        <div>
                            <InputLabel htmlFor="correccao_leitura" value="Leitura actual correcta" />
                            <TextInput
                                id="correccao_leitura"
                                type="number"
                                min={corrigindo.leitura_anterior}
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
