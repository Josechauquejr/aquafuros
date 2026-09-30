import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Droplets,
    Eye,
    Pencil,
    Phone,
    Plus,
    Receipt,
    Sparkles,
    Trash2,
    UserPlus,
    UserX,
    Users,
    Wallet,
    FileText,
    Banknote,
    Printer,
    MapPin,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedButton from "@/Components/AnimatedButton";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, MaisDetalhes, SeccaoDetalhe } from "@/Components/DataTable/Detalhe";
import { IconLink } from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import KpiCard from "@/Components/KpiCard";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatNumero, formatDate, formatDateTime, formatMoney, formatPhone, formatVolume, phoneDigits } from "@/lib/utils";

const estadoConfig = {
    ativo: { label: "Activo", tone: "emerald" },
    inativo: { label: "Inactivo", tone: "slate" },
    cortado: { label: "Cortado", tone: "rose" },
};

const estadoFacturaConfig = {
    paga: { label: "Paga", tone: "emerald" },
    pendente: { label: "Pendente", tone: "amber" },
    parcial: { label: "Parcial", tone: "cyan" },
    anulada: { label: "Anulada", tone: "slate" },
};

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { estado: "todos", bairro: "todos", tarifa: "todos", sort: "nome", dir: "asc" };

const dividaDe = (cliente) => Number(cliente.saldo_em_aberto ?? 0);

function TelefoneLink({ telefone }) {
    if (!telefone) return <span className="text-slate-400 dark:text-slate-600">—</span>;

    return (
        <a
            href={`tel:${phoneDigits(telefone)}`}
            className="inline-flex items-center gap-1.5 hover:text-cyan-700 dark:hover:text-cyan-300"
        >
            <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {formatPhone(telefone)}
        </a>
    );
}

// Cinzento quando não há dívida, vermelho quando há.
function Divida({ cliente }) {
    return (
        <span
            className={cn(
                "font-semibold",
                dividaDe(cliente) > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500",
            )}
        >
            {formatMoney(dividaDe(cliente))}
        </span>
    );
}

const botaoPagar =
    "inline-flex h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400";
const ligacao =
    "text-sm font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300";

// Uma factura por pagar na ficha do cliente: o que falta, e o que se pode
// fazer com ela — Pagar em destaque, o resto como ligações de texto.
function FacturaPorPagar({ factura }) {
    const parcial = factura.estado === "parcial";

    return (
        <li className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">{factura.numero_factura}</p>
                    <p className="text-sm text-muted-foreground">
                        {meses[factura.mes - 1]}/{factura.ano}
                        {factura.data_vencimento && <> · vence {formatDate(factura.data_vencimento)}</>}
                    </p>
                    {factura.esta_vencida && (
                        <StatusBadge tone="rose" className="mt-1.5">
                            Vencida
                        </StatusBadge>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-foreground">{formatMoney(factura.em_falta)}</p>
                    <p className="text-sm text-muted-foreground">
                        {parcial ? `em falta de ${formatMoney(factura.total_pagar)}` : "em falta"}
                    </p>
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link href={`/pagamentos?factura_id=${factura.id}`} className={botaoPagar}>
                    Pagar
                </Link>
                <a href={`/facturas/${factura.id}/imprimir`} target="_blank" rel="noopener noreferrer" className={ligacao}>
                    Ver factura
                </a>
                {factura.estado === "pendente" && (
                    <Link href={`/facturas?editar=${factura.id}`} className={ligacao}>
                        Editar
                    </Link>
                )}
                <Link
                    href={`/facturas?anular=${factura.id}`}
                    className="text-sm font-semibold text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
                >
                    Anular
                </Link>
            </div>
        </li>
    );
}

// Cartão expandido do cliente: a dívida, contacto e as facturas por pagar
// (com as suas acções); o histórico completo fica em "Mais detalhes".
const detalheCliente = {
    titulo: (cliente) => cliente.nome,
    descricao: (cliente) => cliente.numero_cliente,
    conteudo: (cliente) => {
        const facturas = cliente.facturas ?? [];
        const porPagar = facturas.filter((f) => ["pendente", "parcial"].includes(f.estado));
        const divida = Number(cliente.saldo_em_aberto ?? 0);
        const vencido = Number(cliente.divida_em_atraso ?? 0);

        return (
            <>
                <Destaques>
                    <Destaque
                        rotulo="Dívida em aberto"
                        tom={divida > 0 ? "perigo" : "neutro"}
                        sub={vencido > 0 ? `${formatMoney(vencido)} já vencido` : undefined}
                    >
                        {formatMoney(divida)}
                    </Destaque>
                    <Destaque rotulo="Estado">
                        <StatusBadge tone={estadoConfig[cliente.estado].tone}>{estadoConfig[cliente.estado].label}</StatusBadge>
                    </Destaque>
                </Destaques>

                <Campos className="mt-5">
                    <Campo rotulo="Telefone">
                        {cliente.telefone ? (
                            <a href={`tel:${phoneDigits(cliente.telefone)}`} className="hover:text-primary">
                                {formatPhone(cliente.telefone)}
                            </a>
                        ) : null}
                    </Campo>
                    <Campo rotulo="Bairro">{cliente.bairro}</Campo>
                    <Campo rotulo="Tarifa">{cliente.tarifa?.nome}</Campo>
                    <Campo rotulo="Endereço">{cliente.endereco}</Campo>
                </Campos>

                <SeccaoDetalhe titulo={porPagar.length > 0 ? `Facturas por pagar (${porPagar.length})` : "Facturas por pagar"} icone={FileText}>
                    {porPagar.length === 0 ? (
                        <p className="text-muted-foreground">Este cliente não tem facturas por pagar.</p>
                    ) : (
                        <ul className="space-y-3">
                            {porPagar.map((factura) => (
                                <FacturaPorPagar key={factura.id} factura={factura} />
                            ))}
                        </ul>
                    )}
                </SeccaoDetalhe>

                <MaisDetalhes titulo="Histórico e mais dados">
                    <Campos>
                        <Campo rotulo="Leitura inicial do contador">
                            {cliente.leitura_inicial !== null && cliente.leitura_inicial !== undefined ? formatNumero(cliente.leitura_inicial) : null}
                        </Campo>
                        <Campo rotulo="Cliente desde">
                            {cliente.created_at ? formatDateTime(cliente.created_at) : formatDate(cliente.data_adesao)}
                        </Campo>
                    </Campos>

                    <SeccaoDetalhe titulo="Todas as facturas" icone={FileText}>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full min-w-[480px] text-left text-sm">
                                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">Factura</th>
                                        <th className="px-3 py-2">Período</th>
                                        <th className="px-3 py-2 text-right">Total</th>
                                        <th className="px-3 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {facturas.map((f) => (
                                        <tr key={f.id}>
                                            <td className="px-3 py-2 font-medium">
                                                <a
                                                    href={`/facturas/${f.id}/imprimir`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="whitespace-nowrap text-primary hover:underline"
                                                >
                                                    {f.numero_factura}
                                                </a>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {meses[f.mes - 1]}/{f.ano}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">{formatMoney(f.total_pagar)}</td>
                                            <td className="px-3 py-2">
                                                <StatusBadge tone={estadoFacturaConfig[f.estado].tone}>{estadoFacturaConfig[f.estado].label}</StatusBadge>
                                            </td>
                                        </tr>
                                    ))}
                                    {facturas.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">
                                                Sem facturas registadas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SeccaoDetalhe>

                    <SeccaoDetalhe titulo="Pagamentos" icone={Receipt}>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full min-w-[480px] text-left text-sm">
                                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">Recibo</th>
                                        <th className="px-3 py-2">Data</th>
                                        <th className="px-3 py-2 text-right">Valor</th>
                                        <th className="px-3 py-2">Método</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(cliente.pagamentos ?? []).map((pagamento) => (
                                        <tr key={pagamento.id}>
                                            <td className="px-3 py-2 font-medium">{pagamento.numero_recibo}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{formatDateTime(pagamento.created_at)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{formatMoney(pagamento.valor_pago)}</td>
                                            <td className="px-3 py-2 text-muted-foreground">
                                                {metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}
                                            </td>
                                        </tr>
                                    ))}
                                    {(cliente.pagamentos ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">
                                                Sem pagamentos registados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </SeccaoDetalhe>
                </MaisDetalhes>
            </>
        );
    },
};

const colunas = [
    {
        chave: "nome",
        titulo: "Cliente",
        ordenavel: true,
        render: (cliente) => (
            <>
                <p className="font-semibold text-slate-900 dark:text-white">{cliente.nome}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{cliente.numero_cliente}</p>
            </>
        ),
    },
    { chave: "divida", titulo: "Dívida", ordenavel: true, direita: true, render: (cliente) => <Divida cliente={cliente} /> },
    {
        chave: "estado",
        titulo: "Estado",
        ordenavel: true,
        render: (cliente) => <StatusBadge tone={estadoConfig[cliente.estado].tone}>{estadoConfig[cliente.estado].label}</StatusBadge>,
    },
];

const cartaoCliente = (cliente) => (
    <div className="space-y-2">
        <div>
            <p className="font-semibold text-slate-900 dark:text-white">{cliente.nome}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{cliente.numero_cliente}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Divida cliente={cliente} />
            <StatusBadge tone={estadoConfig[cliente.estado].tone}>{estadoConfig[cliente.estado].label}</StatusBadge>
        </div>
    </div>
);

const formVazio = { nome: "", endereco: "", bairro: "", telefone: "", tarifa_id: "", estado: "ativo", novo_contrato: false, leitura_inicial: "" };

export default function Index({ clientes, tarifas, todasTarifas, bairros, totais, filtros, taxaLigacao }) {
    const { flash, auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador");
    const [etapaNovo, setEtapaNovo] = useState(null); // null | "escolha" | "formulario"
    const [novoContrato, setNovoContrato] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [facturaParaPagar, setFacturaParaPagar] = useState(null);
    const ultimaFacturaTratadaRef = useRef(null);

    const form = useForm(formVazio);

    // Depois de criar um "novo contrato" (que gera a factura da taxa de
    // ligação), propõe o mesmo próximo passo natural que a emissão de uma
    // factura avulsa em Facturas: registar o pagamento agora. Usa
    // `flash.novaFactura` e desduplica pelo id, tal como em Facturas/Index.
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

    const filtrosConfig = useMemo(
        () => [
            {
                chave: "estado",
                rotulo: "Estado",
                tipo: "select",
                padrao: "todos",
                opcoes: [
                    { valor: "todos", rotulo: "Todos" },
                    ...Object.entries(estadoConfig).map(([valor, { label }]) => ({ valor, rotulo: label })),
                ],
            },
            {
                chave: "bairro",
                rotulo: "Bairro",
                tipo: "select",
                padrao: "todos",
                opcoes: [{ valor: "todos", rotulo: "Todos" }, ...bairros.map((bairro) => ({ valor: bairro, rotulo: bairro }))],
            },
            {
                chave: "tarifa",
                rotulo: "Tarifa",
                tipo: "select",
                padrao: "todos",
                opcoes: [
                    { valor: "todos", rotulo: "Todas" },
                    ...todasTarifas.map((tarifa) => ({ valor: String(tarifa.id), rotulo: tarifa.nome })),
                ],
            },
            { chave: "so_divida", rotulo: "Só com dívida", tipo: "checkbox", padrao: false },
        ],
        [bairros, todasTarifas],
    );

    const metrics = [
        { label: "Total de clientes", value: totais.total, icon: Users, tone: "cyan" },
        { label: "Clientes activos", value: totais.activos, icon: Droplets, tone: "emerald" },
        { label: "Clientes cortados", value: totais.cortados, icon: UserX, tone: "rose" },
        { label: "Dívida acumulada", value: formatMoney(totais.dividaAcumulada), icon: Wallet, tone: "amber" },
    ];

    const abrirNovo = () => {
        setEditando(null);
        setNovoContrato(false);
        setEtapaNovo("escolha");
    };

    const escolherTipoRegisto = (ehNovoContrato) => {
        setNovoContrato(ehNovoContrato);
        form.reset();
        form.setData({ ...formVazio, tarifa_id: tarifas[0]?.id ?? "", novo_contrato: ehNovoContrato });
        form.clearErrors();
        setEtapaNovo("formulario");
    };

    const abrirEdicao = (cliente) => {
        setEditando(cliente);
        setEtapaNovo(null);
        form.setData({
            nome: cliente.nome,
            endereco: cliente.endereco ?? "",
            bairro: cliente.bairro ?? "",
            telefone: cliente.telefone ?? "",
            tarifa_id: cliente.tarifa_id,
            estado: cliente.estado,
        });
        form.clearErrors();
        setEtapaNovo("formulario");
    };

    const fecharModalCliente = () => {
        setEtapaNovo(null);
        setEditando(null);
    };

    const submitCliente = (event) => {
        event.preventDefault();

        if (editando) {
            form.put(`/clientes/${editando.id}`, { onSuccess: fecharModalCliente });
        } else {
            form.post("/clientes", { onSuccess: fecharModalCliente });
        }
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/clientes/${paraEliminar.id}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    const accoesCliente = (cliente) => ({
        principal: { icone: Eye, rotulo: `Ver dados de ${cliente.nome}`, curto: "Ver dados", expandir: true },
        menu: [
            { icone: Pencil, rotulo: "Editar", onClick: () => abrirEdicao(cliente) },
            {
                icone: Trash2,
                rotulo: "Mover para a lixeira",
                tone: "danger",
                separadorAntes: true,
                onClick: () => setParaEliminar(cliente),
            },
        ],
    });

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">
                            Gestão de clientes
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">
                            Clientes
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Consumidores associados aos furos de água da rede.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {ehAdministrador && (
                            <AnimatedButton as={Link} href="/lixeira?tipo=clientes" variant="secondary">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Lixeira
                            </AnimatedButton>
                        )}
                        <AnimatedButton
                            variant="primary"
                            onClick={abrirNovo}
                            disabled={tarifas.length === 0}
                            title={tarifas.length === 0 ? "É preciso configurar pelo menos uma tarifa primeiro." : undefined}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Novo cliente
                        </AnimatedButton>
                    </div>
                </div>
            }
        >
            <Head title="Clientes" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <InlineNotice show={Boolean(flash.status)}>{flash.status}</InlineNotice>
                    <InlineNotice show={Boolean(flash.error)} tone="error">{flash.error}</InlineNotice>
                    <InlineNotice show={tarifas.length === 0} tone="info">
                        Ainda não há nenhuma tarifa configurada, por isso não é possível adicionar clientes.{" "}
                        {ehAdministrador ? (
                            <>
                                Configure pelo menos uma em{" "}
                                <Link href="/tarifas" className="font-semibold underline underline-offset-2">
                                    Valores e Regras
                                </Link>
                                .
                            </>
                        ) : (
                            "Peça a um administrador para configurar em Valores e Regras."
                        )}
                    </InlineNotice>

                    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        {metrics.map((metric, index) => (
                            <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                        ))}
                    </section>

                    <DataTable
                        rota="/clientes"
                        filtros={filtros}
                        padroes={padroes}
                        paginador={clientes}
                        colunas={colunas}
                        cartao={cartaoCliente}
                        detalhe={detalheCliente}
                        placeholder="Pesquisar nome, nº ou bairro"
                        filtrosConfig={filtrosConfig}
                        accoes={accoesCliente}
                        rotuloAccoes={(cliente) => `Mais acções sobre ${cliente.nome}`}
                        vazio={{
                            mensagem: "Ainda não há clientes registados.",
                            mensagemFiltrada: "Nenhum cliente encontrado para os filtros seleccionados.",
                            accao: { rotulo: "Novo cliente", icone: Plus, onClick: abrirNovo, disabled: tarifas.length === 0 },
                        }}
                    />
                </div>
            </div>

            <Modal
                show={etapaNovo === "escolha"}
                onClose={() => setEtapaNovo(null)}
                title="Novo cliente"
                maxWidth="lg"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Este registo é para um novo contrato de fornecimento de água ou para um cliente que já
                    existe (a ser adicionado ao sistema)?
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => escolherTipoRegisto(true)}
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                            <Sparkles className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-950 dark:text-white">Novo contrato</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Primeira ligação de água deste cliente. É gerada automaticamente uma factura da
                                taxa de ligação de {formatMoney(taxaLigacao)}.
                            </p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => escolherTipoRegisto(false)}
                        className="flex flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-600"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <UserPlus className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-950 dark:text-white">Cliente existente</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Cliente que já tinha ligação de água antes deste sistema — apenas adicionar os
                                dados, sem cobrar taxa de ligação.
                            </p>
                        </div>
                    </button>
                </div>
            </Modal>

            <Modal
                show={etapaNovo === "formulario"}
                onClose={fecharModalCliente}
                title={editando ? "Editar cliente" : novoContrato ? "Novo contrato de água" : "Novo cliente"}
                maxWidth="lg"
            >
                <form onSubmit={submitCliente} className="space-y-4">
                    {!editando && novoContrato && (
                        <InlineNotice show tone="info">
                            Será criada automaticamente uma factura da taxa de ligação de água no valor de{" "}
                            {formatMoney(taxaLigacao)} após guardar.
                        </InlineNotice>
                    )}

                    <div>
                        <InputLabel htmlFor="nome" value="Nome" />
                        <TextInput
                            id="nome"
                            required
                            value={form.data.nome}
                            onChange={(event) => form.setData("nome", event.target.value)}
                            className="mt-1 block w-full"
                            placeholder="Nome completo ou razão social"
                        />
                        <InputError message={form.errors.nome} className="mt-1" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="bairro" value="Bairro" />
                            <TextInput
                                id="bairro"
                                value={form.data.bairro}
                                onChange={(event) => form.setData("bairro", event.target.value)}
                                className="mt-1 block w-full"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="telefone" value="Telefone" />
                            <TextInput
                                id="telefone"
                                value={form.data.telefone}
                                onChange={(event) => form.setData("telefone", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="84 562 6156"
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="endereco" value="Endereço" />
                        <TextInput
                            id="endereco"
                            value={form.data.endereco}
                            onChange={(event) => form.setData("endereco", event.target.value)}
                            className="mt-1 block w-full"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="tarifa_id" value="Tipo de consumo" />
                            <select
                                id="tarifa_id"
                                value={form.data.tarifa_id}
                                onChange={(event) => form.setData("tarifa_id", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {tarifas.map((tarifa) => (
                                    <option key={tarifa.id} value={tarifa.id}>
                                        {tarifa.nome}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.tarifa_id} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="estado" value="Estado" />
                            <select
                                id="estado"
                                value={form.data.estado}
                                onChange={(event) => form.setData("estado", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                <option value="ativo">Activo</option>
                                <option value="inativo">Inactivo</option>
                                <option value="cortado">Cortado</option>
                            </select>
                        </div>
                    </div>

                    {!editando && (
                        <div>
                            <InputLabel htmlFor="leitura_inicial" value="Leitura inicial do contador" />
                            <TextInput
                                id="leitura_inicial"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={form.data.leitura_inicial}
                                onChange={(event) => form.setData("leitura_inicial", event.target.value)}
                                className="mt-1 block w-full"
                                placeholder="Ex.: 430,00"
                            />
                            <InputError message={form.errors.leitura_inicial} className="mt-1" />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                O que o contador marca hoje. A primeira leitura mensal parte deste valor, para o cliente
                                não pagar o consumo anterior à ligação. Use 0 só num contador novo.
                            </p>
                        </div>
                    )}
                    <InputError message={form.errors.telefone} className="-mt-2" />

                    <div className="flex justify-end gap-3 pt-2">
                        <SecondaryButton type="button" onClick={fecharModalCliente}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing}>
                            {editando ? "Guardar alterações" : "Adicionar cliente"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                show={Boolean(paraEliminar)}
                onClose={() => setParaEliminar(null)}
                onConfirm={confirmarEliminacao}
                title="Eliminar cliente"
                confirmLabel="Eliminar"
                description={
                    paraEliminar
                        ? `Tem a certeza que deseja eliminar "${paraEliminar.nome}"?`
                        : ""
                }
            />

            <ConfirmDialog
                show={Boolean(facturaParaPagar)}
                onClose={() => setFacturaParaPagar(null)}
                onConfirm={irParaRegistarPagamento}
                title="Factura de ligação emitida"
                tone="primary"
                confirmLabel="Registar pagamento"
                cancelLabel="Agora não"
                description={
                    facturaParaPagar
                        ? `Factura ${facturaParaPagar.numero_factura} emitida (${formatMoney(facturaParaPagar.total_pagar)}). Deseja efectuar o pagamento agora?`
                        : ""
                }
            />

        </AdminLayout>
    );
}
