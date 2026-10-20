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
import Modal from "@/Components/Modal";
import RegistarPagamento from "@/Components/RegistarPagamento";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

const metodoConfig = {
    dinheiro: { label: "Dinheiro", icon: Banknote, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" },
    banco: { label: "Transferência bancária", icon: Landmark, tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300" },
    mpesa: { label: "M-Pesa", icon: Smartphone, tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" },
    "e-mola": { label: "e-Mola", icon: Smartphone, tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" },
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
        <Link
            href={`/facturas/${factura.numero_factura}/imprimir`}
            prefetch="hover"
            cacheFor="5m"
            cacheTags="factura"
            className="whitespace-nowrap font-medium text-cyan-700 hover:underline dark:text-cyan-300"
        >
            {factura.numero_factura}
        </Link>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</p>
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
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</p>
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
                <Campo rotulo="Data do pagamento">{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</Campo>
                {(pagamento.imputacoes ?? []).map(parcela => <Campo key={parcela.id} rotulo={`Aplicado a ${parcela.factura?.numero_factura ?? "factura de origem"}`}>
                    Principal: {formatMoney(parcela.valor_principal)} · Multa: {formatMoney(parcela.valor_multa)}
                </Campo>)}
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

export default function Index({ pagamentos, facturasEmAberto, clientes = [], creditos = {}, dataActual, metricas, resumoMes, mesReferencia, filtros }) {
    const { auth, flash } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [facturaInicial, setFacturaInicial] = useState("");
    const [paraEstornar, setParaEstornar] = useState(null);
    const [clienteInicial, setClienteInicial] = useState("");
    const [loteParaEstornar, setLoteParaEstornar] = useState(null);
    const [adiantamentoAberto, setAdiantamentoAberto] = useState(false);
    const adiantamento = useForm({ cliente_id: "", valor: "", metodo_pagamento: "dinheiro", referencia_pagamento: "", nota: "" });
    const form = useForm({ metodo_pagamento: "dinheiro", referencia_pagamento: "" });
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
        setClienteInicial("");
        setFacturaInicial(facturaIdPreseleccionada ?? "");
        setShowModal(true);
    };

    // Chegou aqui a partir de "Deseja efectuar o pagamento agora?" (Facturas)
    // — pré-selecciona essa factura e abre logo o formulário de pagamento.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const clienteId = params.get("cliente_id");
        if (clienteId && facturasEmAberto.some(f => String(f.cliente_id) === clienteId)) {
            setClienteInicial(clienteId);
            setShowModal(true);
            return;
        }
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

    const submit = (event) => {
        event.preventDefault();

        form.put(`/pagamentos/${editando.numero_recibo}`, { onSuccess: () => setShowModal(false) });
    };

    const confirmarEstornoLote = () => {
        if (!loteParaEstornar) return;
        router.delete(`/pagamentos/lote/${loteParaEstornar.lote}`, { onFinish: () => setLoteParaEstornar(null), preserveScroll: true });
    };

    const confirmarEstorno = () => {
        if (!paraEstornar) return;
        router.delete(`/pagamentos/${paraEstornar.numero_recibo}`, { onFinish: () => setParaEstornar(null), preserveScroll: true });
    };

    const accoesPagamento = (pagamento) => ({
        principal: {
            icone: Printer,
            curto: "Imprimir", rotulo: "Imprimir recibo",
            href: `/pagamentos/${pagamento.numero_recibo}/imprimir`,
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

            {showModal && !editando && <RegistarPagamento
                facturasEmAberto={facturasEmAberto}
                creditos={creditos}
                metodos={metodoConfig}
                facturaInicial={facturaInicial}
                clienteInicial={clienteInicial}
                dataActual={dataActual}
                onClose={() => setShowModal(false)}
            />}

            <Modal
                show={showModal && Boolean(editando)}
                onClose={() => { if (!form.processing) setShowModal(false); }}
                title={`Editar pagamento ${editando?.numero_recibo ?? ""}`}
                maxWidth="lg"
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="metodo_pagamento" value="Método de pagamento" />
                            <select
                                id="metodo_pagamento"
                                value={form.data.metodo_pagamento}
                                onChange={(event) => form.setData("metodo_pagamento", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {Object.entries(metodoConfig).map(([valor, { label }]) => <option key={valor} value={valor}>{label}</option>)}
                            </select>
                            <InputError message={form.errors.metodo_pagamento} className="mt-1" />
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
                            <InputError message={form.errors.referencia_pagamento} className="mt-1" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Por integridade financeira, apenas método e referência podem ser alterados.</p>
                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={() => setShowModal(false)} disabled={form.processing}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>Guardar alterações</PrimaryButton>
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
                            className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
