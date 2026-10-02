import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Banknote,
    Eye,
    Landmark,
    Layers,
    Lock,
    Pencil,
    Plus,
    Printer,
    Receipt,
    RotateCcw,
    Smartphone,
    Trash2,
    Wallet,
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
import PagamentoMultiplo from "@/Components/PagamentoMultiplo";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

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

// O que falta pagar de uma factura (as parciais podem ser pagas várias vezes).
const emFaltaDe = (factura) => Number(factura.em_falta ?? factura.total_pagar);

const formVazio = { factura_id: "", valor_pago: "", metodo_pagamento: "dinheiro", referencia_pagamento: "", data_pagamento: "", usar_credito: false, guardar_excesso: false };

// AAAA-MM-DD na data local (toISOString daria a data em UTC).
const dataLocal = (deslocamentoDias = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - deslocamentoDias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "mes", metodo: "todos", sort: "recibo", dir: "desc" };

const filtrosConfig = [
    {
        chave: "metodo",
        rotulo: "Método",
        tipo: "select",
        padrao: "todos",
        opcoes: [
            { valor: "todos", rotulo: "Todos" },
            ...Object.entries(metodoConfig).map(([valor, { label }]) => ({ valor, rotulo: label })),
        ],
    },
];

function MetodoBadge({ metodo: chave }) {
    const metodo = metodoConfig[chave];
    const MetodoIcon = metodo.icon;

    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", metodo.tone)}>
            <MetodoIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {metodo.label}
        </span>
    );
}

function FacturaLink({ factura }) {
    return (
        <a
            href={`/facturas/${factura.id}/imprimir`}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-medium text-cyan-700 hover:underline dark:text-cyan-300"
        >
            {factura.numero_factura}
        </a>
    );
}

const colunas = [
    {
        chave: "recibo",
        titulo: "Recibo / Data",
        ordenavel: true,
        render: (pagamento) => (
            <>
                <p className="font-semibold text-slate-900 dark:text-white">{pagamento.numero_recibo}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(pagamento.created_at)}</p>
            </>
        ),
    },
    {
        chave: "cliente",
        titulo: "Cliente",
        ordenavel: true,
        render: (pagamento) => pagamento.cliente?.nome ?? "Cliente removido",
    },
    {
        chave: "valor",
        titulo: "Valor",
        ordenavel: true,
        direita: true,
        render: (pagamento) => (
            <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(pagamento.valor_pago)}</span>
        ),
    },
    { chave: "metodo", titulo: "Método", render: (pagamento) => <MetodoBadge metodo={pagamento.metodo_pagamento} /> },
];

const cartaoPagamento = (pagamento) => (
    <div className="space-y-2">
        <div>
            <p className="font-semibold text-slate-900 dark:text-white">{pagamento.numero_recibo}</p>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                {pagamento.cliente?.nome ?? "Cliente removido"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(pagamento.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(pagamento.valor_pago)}</span>
            <MetodoBadge metodo={pagamento.metodo_pagamento} />
        </div>
    </div>
);

// Cartão expandido: o essencial do pagamento; o resto em "Mais detalhes".
const detalhePagamento = {
    titulo: (pagamento) => pagamento.numero_recibo,
    descricao: (pagamento) => pagamento.cliente?.nome ?? "Cliente removido",
    conteudo: (pagamento) => (
        <>
            <Destaques>
                <Destaque rotulo="Valor pago" tom="sucesso">
                    {formatMoney(pagamento.valor_pago)}
                </Destaque>
                <Destaque rotulo="Método">
                    <MetodoBadge metodo={pagamento.metodo_pagamento} />
                </Destaque>
            </Destaques>
            <Campos className="mt-5">
                <Campo rotulo="Factura">{pagamento.factura && <FacturaLink factura={pagamento.factura} />}</Campo>
                <Campo rotulo="Data e hora">{formatDateTime(pagamento.created_at)}</Campo>
            </Campos>
            <MaisDetalhes>
                <Campos>
                    <Campo rotulo="Referência">{pagamento.referencia_pagamento}</Campo>
                    <Campo rotulo="Recebido por">{pagamento.recebido_por?.name}</Campo>
                    {pagamento.lote && <Campo rotulo="Pagamento em lote">Pago em conjunto com outras facturas do cliente</Campo>}
                </Campos>
            </MaisDetalhes>
        </>
    ),
};

export default function Index({ pagamentos, facturasEmAberto, clientes = [], creditos = {}, metricas, resumoMes, mesReferencia, diasRetroactivos = 7, filtros }) {
    const { auth, flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    // Chegou com uma factura escolhida (link "Receber"): mostra só essa, não a lista toda.
    const [facturaFixada, setFacturaFixada] = useState(false);
    const [paraEstornar, setParaEstornar] = useState(null);
    const [multiploAberto, setMultiploAberto] = useState(false);
    const [loteParaEstornar, setLoteParaEstornar] = useState(null);
    const [adiantamentoAberto, setAdiantamentoAberto] = useState(false);
    const adiantamento = useForm({ cliente_id: "", valor: "", metodo_pagamento: "dinheiro", referencia_pagamento: "", nota: "" });
    // Pagar várias facturas só faz sentido se algum cliente tiver 2 ou mais em aberto.
    const podePagarVarias = Object.values(
        facturasEmAberto.reduce((acc, f) => ({ ...acc, [f.cliente_id]: (acc[f.cliente_id] ?? 0) + 1 }), {}),
    ).some((quantidade) => quantidade >= 2);

    const form = useForm(formVazio);
    const ehAdministrador = auth.roles?.includes("administrador") ?? false;

    const metrics = [
        { label: "Pagamentos registados no mês", value: metricas.totalRegistados, icon: Receipt, tone: "emerald" },
        {
            label: "Método mais usado",
            value: metricas.metodoMaisUsado ? metodoConfig[metricas.metodoMaisUsado].label : "Sem dados",
            icon: Smartphone,
            tone: "amber",
        },
    ];

    const abrirNovo = (facturaIdPreseleccionada) => {
        setEditando(null);
        setFacturaFixada(Boolean(facturaIdPreseleccionada));
        // Sem factura de origem não se pré-selecciona nenhuma: a 1.ª da lista seria
        // de um cliente qualquer e um Enter distraído registava o pagamento no cliente errado.
        const preseleccionada = facturaIdPreseleccionada
            ? facturasEmAberto.find((f) => String(f.id) === String(facturaIdPreseleccionada))
            : undefined;
        form.reset();
        form.setData({
            factura_id: preseleccionada?.id ?? "",
            valor_pago: preseleccionada ? emFaltaDe(preseleccionada) : "",
            metodo_pagamento: "dinheiro",
            referencia_pagamento: "",
            usar_credito: false,
            guardar_excesso: false,
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
        form.setData((data) => ({ ...data, factura_id: id, valor_pago: factura ? emFaltaDe(factura) : data.valor_pago }));
    };

    const facturaSeleccionada = facturasEmAberto.find((f) => String(f.id) === String(form.data.factura_id));
    const creditoDoCliente = facturaSeleccionada ? Number(creditos[facturaSeleccionada.cliente_id] ?? 0) : 0;
    const emFaltaAposCredito = facturaSeleccionada
        ? emFaltaDe(facturaSeleccionada) - (form.data.usar_credito ? Math.min(creditoDoCliente, emFaltaDe(facturaSeleccionada)) : 0)
        : 0;
    const excessoPrevisto = facturaSeleccionada ? Number(form.data.valor_pago || 0) - emFaltaAposCredito : 0;

    const submit = (event) => {
        event.preventDefault();

        if (editando) {
            form.put(`/pagamentos/${editando.id}`, { onSuccess: () => setShowModal(false) });
        } else {
            form.post("/pagamentos", { onSuccess: () => setShowModal(false) });
        }
    };

    const confirmarEstornoLote = () => {
        if (!loteParaEstornar) return;
        router.delete(`/pagamentos/lote/${loteParaEstornar.lote}`, { onFinish: () => setLoteParaEstornar(null), preserveScroll: true });
    };

    const confirmarEstorno = () => {
        if (!paraEstornar) return;
        router.delete(`/pagamentos/${paraEstornar.id}`, { onFinish: () => setParaEstornar(null), preserveScroll: true });
    };

    const accoesPagamento = (pagamento) => ({
        principal: {
            icone: Printer,
            curto: "Imprimir", rotulo: "Imprimir recibo",
            href: `/pagamentos/${pagamento.id}/imprimir`,
            target: "_blank",
        },
        menu: [
            { icone: Eye, rotulo: "Ver detalhe", expandir: true },
            { icone: Pencil, rotulo: "Editar", onClick: () => abrirEdicao(pagamento) },
            ...(pagamento.lote_total > 1
                ? [
                      {
                          icone: Layers,
                          rotulo: `Estornar pagamento completo (${pagamento.lote_total} recibos)`,
                          tone: "danger",
                          disabled: !ehAdministrador,
                          motivo: "Apenas administradores podem estornar pagamentos.",
                          onClick: () => setLoteParaEstornar(pagamento),
                      },
                  ]
                : []),
            {
                icone: RotateCcw,
                rotulo: pagamento.lote_total > 1 ? "Estornar só este recibo" : "Estornar",
                tone: "danger",
                separadorAntes: true,
                disabled: !ehAdministrador,
                motivo: "Apenas administradores podem estornar pagamentos.",
                onClick: () => setParaEstornar(pagamento),
            },
        ],
    });

    const selecao = {
        acoes: [
            {
                rotulo: "Imprimir",
                icone: Printer,
                href: (ids) => `/pagamentos/imprimir-lote?ids=${ids.join(",")}`,
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
                        <AnimatedButton as={Link} href="/pagamentos/fecho-caixa" variant="secondary">
                            <Lock className="h-4 w-4" aria-hidden="true" />
                            Fecho de caixa
                        </AnimatedButton>
                        {ehAdministrador && (
                            <AnimatedButton as={Link} href="/lixeira?tipo=pagamentos" variant="secondary">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Lixeira
                            </AnimatedButton>
                        )}
                        <AnimatedButton variant="secondary" onClick={() => setAdiantamentoAberto(true)} title="Dinheiro entregue antes de haver factura — fica como crédito do cliente">
                            <Wallet className="h-4 w-4" aria-hidden="true" />
                            Receber adiantamento
                        </AnimatedButton>
                        <AnimatedButton
                            variant="secondary"
                            onClick={() => setMultiploAberto(true)}
                            disabled={!podePagarVarias}
                            title={podePagarVarias ? undefined : "Nenhum cliente tem 2 ou mais facturas em aberto"}
                        >
                            <Layers className="h-4 w-4" aria-hidden="true" />
                            Pagar várias facturas
                        </AnimatedButton>
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

                    <ResumoMes rota="/pagamentos" mesReferencia={mesReferencia} resumo={resumoMes} filtros={filtros} />

                    <section className="grid gap-4 sm:grid-cols-2">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <DataTable
                        rota="/pagamentos"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={pagamentos}
                        colunas={colunas}
                        cartao={cartaoPagamento}
                        detalhe={detalhePagamento}
                        placeholder="Pesquisar cliente, recibo ou factura"
                        periodo
                        filtrosConfig={filtrosConfig}
                        accoes={accoesPagamento}
                        rotuloAccoes={(pagamento) => `Mais acções sobre ${pagamento.numero_recibo}`}
                        selecao={selecao}
                        vazio={{
                            mensagem: "Ainda não há pagamentos registados.",
                            mensagemFiltrada: "Nenhum pagamento encontrado para os filtros seleccionados.",
                            accao: {
                                rotulo: "Registar pagamento",
                                icone: Plus,
                                onClick: () => abrirNovo(),
                                disabled: facturasEmAberto.length === 0,
                            },
                        }}
                    />
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
                                    facturaFixada && facturaSeleccionada ? (
                                        <div className="mt-1 rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                                            <p className="text-lg font-semibold text-slate-950 dark:text-white">
                                                {facturaSeleccionada.cliente?.nome ?? "Cliente removido"}
                                            </p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                                Factura {facturaSeleccionada.numero_factura} · {meses[facturaSeleccionada.mes - 1]}/{facturaSeleccionada.ano}
                                            </p>
                                            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <dt className="text-slate-500 dark:text-slate-400">Total</dt>
                                                    <dd className="font-semibold text-slate-900 dark:text-white">{formatMoney(facturaSeleccionada.total_pagar)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-slate-500 dark:text-slate-400">Já pago</dt>
                                                    <dd className="font-semibold text-slate-900 dark:text-white">{formatMoney(facturaSeleccionada.total_pago ?? 0)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-slate-500 dark:text-slate-400">Em falta</dt>
                                                    <dd className="font-bold text-cyan-800 dark:text-cyan-300">{formatMoney(emFaltaDe(facturaSeleccionada))}</dd>
                                                </div>
                                            </dl>
                                            <button
                                                type="button"
                                                onClick={() => setFacturaFixada(false)}
                                                className="mt-3 text-sm font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
                                            >
                                                Escolher outra factura
                                            </button>
                                        </div>
                                    ) : (
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
                                                            {formatMoney(emFaltaDe(factura))}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {factura.estado === "parcial" ? "em falta" : "a pagar"}
                                                        </span>
                                                        <StatusBadge tone={factura.estado === "parcial" ? "cyan" : "amber"}>
                                                            {factura.estado === "parcial" ? "Parcial" : "Pendente"}
                                                        </StatusBadge>
                                                    </div>
                                                </>
                                            )}
                                        />
                                    </div>
                                    )
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
                                    required={!form.data.usar_credito}
                                    value={form.data.valor_pago}
                                    onChange={(event) => form.setData("valor_pago", event.target.value)}
                                    className="mt-1 block w-full"
                                />
                                {facturaSeleccionada && (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        Em falta: {formatMoney(emFaltaDe(facturaSeleccionada))}. Pode pagar só uma parte — o resto fica em
                                        aberto para um próximo pagamento.
                                    </p>
                                )}
                                <InputError message={form.errors.valor_pago} className="mt-1" />

                                {facturaSeleccionada && creditoDoCliente > 0 && (
                                    <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={form.data.usar_credito}
                                            onChange={(event) => form.setData("usar_credito", event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                        <span>
                                            Usar o crédito do cliente (<strong>{formatMoney(creditoDoCliente)}</strong>) primeiro — abate{" "}
                                            {formatMoney(Math.min(creditoDoCliente, emFaltaDe(facturaSeleccionada)))} sem receber dinheiro.
                                        </span>
                                    </label>
                                )}
                                {facturaSeleccionada && excessoPrevisto > 0.005 && (
                                    <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                                        <input
                                            type="checkbox"
                                            checked={form.data.guardar_excesso}
                                            onChange={(event) => form.setData("guardar_excesso", event.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-amber-400 text-cyan-600 focus:ring-cyan-500"
                                        />
                                        <span>
                                            O cliente entrega mais {formatMoney(excessoPrevisto)} do que deve. Guardar este excesso como crédito para as próximas facturas.
                                        </span>
                                    </label>
                                )}
                            </div>
                        </>
                    )}

                    {!editando && (
                        <div>
                            <InputLabel htmlFor="data_pagamento" value="Data do pagamento" />
                            <TextInput
                                id="data_pagamento"
                                type="date"
                                value={form.data.data_pagamento || dataLocal()}
                                min={dataLocal(diasRetroactivos)}
                                max={dataLocal()}
                                onChange={(event) => form.setData("data_pagamento", event.target.value)}
                                className="mt-1 block w-full sm:w-56"
                            />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Hoje, salvo se o dinheiro foi pago antes (ex.: transferência confirmada mais tarde) — até {diasRetroactivos} dia(s) atrás.
                            </p>
                            <InputError message={form.errors.data_pagamento} className="mt-1" />
                        </div>
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
                        <PrimaryButton type="submit" disabled={form.processing || (!editando && (facturasEmAberto.length === 0 || !form.data.factura_id))}>
                            {editando ? "Guardar alterações" : "Registar pagamento"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={adiantamentoAberto} onClose={() => setAdiantamentoAberto(false)} title="Receber adiantamento" maxWidth="md">
                <form
                    onSubmit={(evento) => {
                        evento.preventDefault();
                        adiantamento.post("/creditos", { onSuccess: () => { setAdiantamentoAberto(false); adiantamento.reset(); } });
                    }}
                    className="space-y-4"
                >
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Dinheiro que o cliente entrega antes de ter factura (ou para pagar facturas futuras). Fica como crédito dele e só conta como receita quando for usado.
                    </p>
                    <div>
                        <InputLabel htmlFor="cliente_adiantamento" value="Cliente" />
                        <select
                            id="cliente_adiantamento"
                            value={adiantamento.data.cliente_id}
                            onChange={(event) => adiantamento.setData("cliente_id", event.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                            <option value="">Escolha o cliente…</option>
                            {clientes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome} ({c.numero_cliente})</option>
                            ))}
                        </select>
                        <InputError message={adiantamento.errors.cliente_id} className="mt-1" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="valor_adiantamento" value="Valor (MZN)" />
                            <TextInput id="valor_adiantamento" type="number" min="0.01" step="0.01" required value={adiantamento.data.valor} onChange={(event) => adiantamento.setData("valor", event.target.value)} className="mt-1 block w-full" />
                            <InputError message={adiantamento.errors.valor} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="metodo_adiantamento" value="Método" />
                            <select
                                id="metodo_adiantamento"
                                value={adiantamento.data.metodo_pagamento}
                                onChange={(event) => adiantamento.setData("metodo_pagamento", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {Object.entries(metodoConfig).map(([valor, { label }]) => (
                                    <option key={valor} value={valor}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="ref_adiantamento" value="Referência (opcional)" />
                        <TextInput id="ref_adiantamento" value={adiantamento.data.referencia_pagamento} onChange={(event) => adiantamento.setData("referencia_pagamento", event.target.value)} className="mt-1 block w-full" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setAdiantamentoAberto(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={adiantamento.processing}>Registar adiantamento</PrimaryButton>
                    </div>
                </form>
            </Modal>

            <PagamentoMultiplo
                show={multiploAberto}
                onClose={() => setMultiploAberto(false)}
                facturasEmAberto={facturasEmAberto}
                metodos={metodoConfig}
                diasRetroactivos={diasRetroactivos}
            />

            <ConfirmDialog
                show={Boolean(paraEstornar)}
                onClose={() => setParaEstornar(null)}
                onConfirm={confirmarEstorno}
                title="Estornar pagamento"
                confirmLabel="Estornar"
                description={
                    paraEstornar
                        ? `Tem a certeza que deseja estornar o recibo ${paraEstornar.numero_recibo} (${paraEstornar.cliente?.nome ?? "cliente removido"}, ${formatMoney(paraEstornar.valor_pago)})?${paraEstornar.lote_total > 1 ? ` ATENÇÃO: este recibo faz parte de um pagamento de ${paraEstornar.lote_total} facturas — os outros recibos ficam activos. Para desfazer o pagamento todo, use "Estornar pagamento completo".` : ""}`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(loteParaEstornar)}
                onClose={() => setLoteParaEstornar(null)}
                onConfirm={confirmarEstornoLote}
                title="Estornar pagamento completo"
                confirmLabel="Estornar tudo"
                description={
                    loteParaEstornar
                        ? `Vai estornar os ${loteParaEstornar.lote_total} recibos deste pagamento de várias facturas de ${loteParaEstornar.cliente?.nome ?? "cliente removido"}. As facturas voltam ao estado anterior.`
                        : ""
                }
            />
        </AdminLayout>
    );
}
