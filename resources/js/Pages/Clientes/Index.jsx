import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Eye,
    Pencil,
    Phone,
    Plus,
    Receipt,
    Sparkles,
    Trash2,
    UserPlus,


    FileText,
    Banknote,
    Printer,
    MapPin,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo as CampoDetalhe, Campos, Destaque, Destaques, MaisDetalhes, SeccaoDetalhe } from "@/Components/DataTable/Detalhe";
import { IconLink } from "@/Components/IconButton";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import CabecalhoLista from "@/Components/CabecalhoLista";
import { BlocoNumerado, Campo, CampoBloqueado, ResumoErros, classeAlterado, classeCampo } from "@/Components/Campo";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatNumero, formatDate, formatDateTime, formatMoney, formatPhone, formatVolume, phoneDigits } from "@/lib/utils";
import useAbrirNovo from "@/hooks/useAbrirNovo";
import { previewPost } from "@/lib/previewPost";

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
const padroes = { estado: "todos", bairro: "todos", tarifa: "todos", so_divida: false, risco: false, sort: "nome", dir: "asc" };

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
                dividaDe(cliente) > 0 ? "font-bold tabular-nums text-rose-700 dark:text-rose-300" : "font-normal text-slate-500 dark:text-slate-400",
            )}
        >
            {dividaDe(cliente) > 0 ? formatMoney(dividaDe(cliente)) : "Em dia"}
        </span>
    );
}

const botaoPagar =
    "inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400";
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
                <Link href={`/facturas/${factura.numero_factura}/imprimir`} prefetch="hover" cacheFor="5m" cacheTags="factura" className={ligacao}>
                    Ver factura
                </Link>
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
                <Link href={`/clientes/${cliente.numero_cliente}`} prefetch="hover" cacheFor="5m" cacheTags="ficha-cliente" className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    Ver ficha completa do cliente <span aria-hidden="true">→</span>
                </Link>
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
                    <CampoDetalhe rotulo="Telefone">
                        {cliente.telefone ? (
                            <a href={`tel:${phoneDigits(cliente.telefone)}`} className="hover:text-primary">
                                {formatPhone(cliente.telefone)}
                            </a>
                        ) : null}
                    </CampoDetalhe>
                    <CampoDetalhe rotulo="Bairro">{cliente.bairro}</CampoDetalhe>
                    <CampoDetalhe rotulo="Email">{cliente.email}</CampoDetalhe>
                    <CampoDetalhe rotulo="Tarifa">{cliente.tarifa?.nome}</CampoDetalhe>
                    <CampoDetalhe rotulo="Endereço">{cliente.endereco}</CampoDetalhe>
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
                        <CampoDetalhe rotulo="Leitura inicial do contador">
                            {cliente.leitura_inicial !== null && cliente.leitura_inicial !== undefined ? formatNumero(cliente.leitura_inicial) : null}
                        </CampoDetalhe>
                        <CampoDetalhe rotulo="Cliente desde">
                            {cliente.created_at ? formatDateTime(cliente.created_at) : formatDate(cliente.data_adesao)}
                        </CampoDetalhe>
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
                                                <Link
                                                    href={`/facturas/${f.numero_factura}/imprimir`}
                                                    prefetch="hover"
                                                    cacheFor="5m"
                                                    cacheTags="factura"
                                                    className="whitespace-nowrap text-primary hover:underline"
                                                >
                                                    {f.numero_factura}
                                                </Link>
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

const MESES_LONGOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Estado neutro para "Activo": só o anormal tem etiqueta (Von Restorff).
function EstadoCliente({ cliente }) {
    if (cliente.em_risco_corte) return <StatusBadge tone="rose">Risco de corte</StatusBadge>;
    if (cliente.estado === "ativo") {
        return (
            <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden="true" />
                Activo
            </span>
        );
    }
    return <StatusBadge tone="slate">{estadoConfig[cliente.estado]?.label ?? cliente.estado}</StatusBadge>;
}

function LeituraDoMes({ cliente }) {
    if (cliente.estado !== "ativo") return <span className="text-sm text-slate-400 dark:text-slate-500">—</span>;
    return cliente.lido_no_mes ? <StatusBadge tone="emerald">Lida</StatusBadge> : <StatusBadge tone="amber">Por ler</StatusBadge>;
}

const colunasPara = (mesCiclo) => [
    {
        chave: "nome",
        titulo: "Cliente",
        ordenavel: true,
        skeletonWidth: "w-40",
        render: (cliente) => (
            <Link href={`/clientes/${cliente.numero_cliente}`} className="flex flex-col text-ink no-underline dark:text-[#F2F5FB]">
                <strong className="text-[15px]">{cliente.nome}</strong>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">{cliente.numero_cliente}</span>
            </Link>
        ),
    },
    { chave: "zona", titulo: "Zona", skeletonWidth: "w-24", render: (cliente) => cliente.zona?.nome ?? cliente.bairro ?? <span className="text-slate-400">—</span> },
    { chave: "divida", titulo: "Saldo", ordenavel: true, skeletonWidth: "w-20", render: (cliente) => <Divida cliente={cliente} /> },
    { chave: "leitura", titulo: `Leitura de ${MESES_LONGOS[(mesCiclo?.mes ?? 1) - 1]}`, skeletonWidth: "w-16", render: (cliente) => <LeituraDoMes cliente={cliente} /> },
    { chave: "estado", titulo: "Estado", ordenavel: true, skeletonWidth: "w-20", render: (cliente) => <EstadoCliente cliente={cliente} /> },
];

const cartaoCliente = (cliente) => (
    <div className="space-y-2">
        <div>
            <p className="font-bold text-ink dark:text-white">{cliente.nome}</p>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
                {cliente.numero_cliente}
                {cliente.zona?.nome ? ` · ${cliente.zona.nome}` : ""}
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Divida cliente={cliente} />
            <LeituraDoMes cliente={cliente} />
            <EstadoCliente cliente={cliente} />
        </div>
    </div>
);

const formVazio = { nome: "", endereco: "", email: "", zona_id: "", telefone: "", tarifa_id: "", estado: "ativo", novo_contrato: false, leitura_inicial: "" };

export default function Index({ clientes, tarifas, todasTarifas, bairros, zonas = [], totais, filtros, taxaLigacao, mesCiclo }) {
    const { flash, auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador");
    const [etapaNovo, setEtapaNovo] = useState(null); // null | "escolha" | "formulario"
    const [novoContrato, setNovoContrato] = useState(false);
    const [editando, setEditando] = useState(null);
    const [paraEliminar, setParaEliminar] = useState(null);
    const [facturaParaPagar, setFacturaParaPagar] = useState(null);
    const [novaZonaAberta, setNovaZonaAberta] = useState(false);
    const [previewInicial, setPreviewInicial] = useState(null);
    const correcaoInicialForm = useForm({ leitura_inicial: "", confirmar_leitura_inicial: true, motivo_leitura_inicial: "" });
    const novaZona = useForm({ nome: "" });
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
                chave: "bairro",
                rotulo: "Zona",
                tipo: "select",
                padrao: "todos",
                opcoes: [{ valor: "todos", rotulo: "Todas as zonas" }, ...bairros.map((bairro) => ({ valor: bairro, rotulo: bairro }))],
            },
            {
                chave: "tarifa",
                rotulo: "Tarifa",
                tipo: "select",
                padrao: "todos",
                opcoes: [
                    { valor: "todos", rotulo: "Todas as tarifas" },
                    ...todasTarifas.map((tarifa) => ({ valor: String(tarifa.id), rotulo: tarifa.nome })),
                ],
            },
        ],
        [bairros, todasTarifas],
    );

    // Filtros rápidos visíveis (Reconhecer em vez de lembrar).
    const rapidos = [
        { chave: "todos", rotulo: "Todos", contagem: totais.total, params: { estado: "todos", so_divida: false, risco: false } },
        { chave: "ativo", rotulo: "Activos", contagem: totais.activos, params: { estado: "ativo", so_divida: false, risco: false } },
        { chave: "divida", rotulo: "Com dívida", contagem: totais.comDivida, params: { estado: "todos", so_divida: true, risco: false } },
        { chave: "risco", rotulo: "Risco de corte", contagem: totais.emRisco, params: { estado: "todos", so_divida: false, risco: true } },
        { chave: "cortado", rotulo: "Cortados", contagem: totais.cortados, params: { estado: "cortado", so_divida: false, risco: false } },
    ];
    const rapidoActivo = filtros.risco ? "risco" : filtros.so_divida ? "divida" : ["ativo", "cortado"].includes(filtros.estado) ? filtros.estado : "todos";
    const escolherRapido = (rapido) => {
        const params = { ...filtros, ...rapido.params, page: undefined };
        Object.keys(params).forEach((k) => {
            if (params[k] === "" || params[k] === false || params[k] === "todos" || params[k] === undefined) delete params[k];
        });
        if (params.sort === padroes.sort && params.dir === padroes.dir) {
            delete params.sort;
            delete params.dir;
        }
        router.get("/clientes", params, { preserveScroll: true, preserveState: true, replace: true });
    };

    const partesResumo = [
        `${totais.total} no total`,
        <strong key="a" className="text-ink dark:text-[#F2F5FB]">{totais.activos} activos</strong>,
        `${totais.cortados} cortados`,
        totais.comDivida > 0 ? `${totais.comDivida} com dívida` : "ninguém em dívida",
    ];

    const abrirNovo = () => {
        setEditando(null);
        setNovoContrato(null);
        form.reset();
        form.setData({ ...formVazio, tarifa_id: tarifas[0]?.id ?? "", novo_contrato: false });
        form.clearErrors();
        setEtapaNovo("formulario");
    };
    useAbrirNovo(abrirNovo);


    const abrirEdicao = (cliente) => {
        setEditando(cliente);
        setEtapaNovo(null);
        form.setData({
            nome: cliente.nome,
            endereco: cliente.endereco ?? "",
            zona_id: cliente.zona_id ?? "",
            email: cliente.email ?? "",
            telefone: cliente.telefone ?? "",
            tarifa_id: cliente.tarifa_id,
            estado: cliente.estado,
            ...(ehAdministrador ? { leitura_inicial: cliente.leitura_inicial ?? "" } : {}),
        });
        form.clearErrors();
        setEtapaNovo("formulario");
    };

    const fecharModalCliente = () => {
        setEtapaNovo(null);
        setEditando(null);
    };

    const criarZona = (event) => {
        event.preventDefault();
        novaZona.post("/clientes/zonas", {
            preserveScroll: true,
            onSuccess: (page) => {
                const criada = page.props.flash?.zonaCriada;
                if (criada) form.setData("zona_id", String(criada.id));
                novaZona.reset();
                setNovaZonaAberta(false);
            },
        });
    };

    const submitCliente = async (event) => {
        event.preventDefault();

        if (editando) {
            const leituraInicialAlterada = editando.leitura_inicial == null
                ? form.data.leitura_inicial !== "" && form.data.leitura_inicial != null
                : form.data.leitura_inicial !== "" && Number(form.data.leitura_inicial) !== Number(editando.leitura_inicial);
            if (ehAdministrador && leituraInicialAlterada) {
                try {
                    const plano = await previewPost(`/clientes/${editando.numero_cliente}/previsualizar-leitura-inicial`, { leitura_inicial: form.data.leitura_inicial });
                    setPreviewInicial(plano);
                    correcaoInicialForm.setData({
                        leitura_inicial: form.data.leitura_inicial,
                        confirmar_leitura_inicial: true,
                        motivo_leitura_inicial: "",
                    });
                    correcaoInicialForm.clearErrors();
                } catch (error) {
                    form.setError("leitura_inicial", error.message);
                }
                return;
            }
            form.put(`/clientes/${editando.numero_cliente}`, { onSuccess: fecharModalCliente });
        } else {
            form.post("/clientes", { onSuccess: fecharModalCliente });
        }
    };

    const confirmarLeituraInicial = (event) => {
        event.preventDefault();
        if (!editando || !previewInicial?.pode_aplicar) return;
        correcaoInicialForm.put(`/clientes/${editando.numero_cliente}/leitura-inicial`, {
            preserveScroll: true,
            onSuccess: () => { setPreviewInicial(null); fecharModalCliente(); },
        });
    };

    const confirmarEliminacao = () => {
        if (!paraEliminar) return;
        router.delete(`/clientes/${paraEliminar.numero_cliente}`, { onFinish: () => setParaEliminar(null), preserveScroll: true });
    };

    const accoesCliente = (cliente) => ({
        menu: [
            { icone: Eye, rotulo: "Ver resumo rápido", expandir: true },
            { icone: FileText, rotulo: "Abrir ficha completa", href: `/clientes/${cliente.numero_cliente}` },
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
        <AdminLayout>
            <Head title="Clientes" />

            <div className="mx-auto flex max-w-7xl flex-col gap-[22px] px-4 sm:px-6 lg:px-8">
                <CabecalhoLista
                    titulo="Clientes"
                    resumo={partesResumo.map((parte, i) => (
                        <span key={i}>
                            {i > 0 && " · "}
                            {parte}
                        </span>
                    ))}
                >
                    <PrimaryButton
                        type="button"
                        onClick={abrirNovo}
                        disabled={tarifas.length === 0}
                        title={tarifas.length === 0 ? "É preciso configurar pelo menos uma tarifa primeiro." : undefined}
                        className="min-h-[48px] px-[22px]"
                    >
                        <Plus className="h-[18px] w-[18px]" aria-hidden="true" />
                        Novo cliente
                    </PrimaryButton>
                </CabecalhoLista>

                <InlineNotice show={tarifas.length === 0} tone="info">
                    Ainda não há nenhuma tarifa configurada, por isso não é possível adicionar clientes.{" "}
                    {ehAdministrador ? (
                        <>
                            Configure pelo menos uma em{" "}
                            <Link href="/tarifas" className="font-semibold underline underline-offset-2">
                                Tarifas e regras
                            </Link>
                            .
                        </>
                    ) : (
                        "Peça a um administrador para configurar em Tarifas e regras."
                    )}
                </InlineNotice>

                <div role="group" aria-label="Filtrar clientes" className="flex flex-wrap gap-2">
                    {rapidos.map((rapido) => {
                        const on = rapido.chave === rapidoActivo;
                        return (
                            <button
                                key={rapido.chave}
                                type="button"
                                aria-pressed={on}
                                onClick={() => escolherRapido(rapido)}
                                className={cn(
                                    "min-h-[40px] rounded-full border px-3.5 text-sm font-semibold transition-colors",
                                    on
                                        ? "border-[#B9CCFF] bg-cyan-100 text-brand dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(110,162,255,0.16)] dark:text-cyan-300"
                                        : "border-[#DDE2EE] bg-white text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]",
                                )}
                            >
                                {rapido.rotulo} <span className="tabular-nums opacity-80">{rapido.contagem}</span>
                            </button>
                        );
                    })}
                </div>

                <DataTable
                    rota="/clientes"
                    filtros={filtros}
                    padroes={padroes}
                    paginador={clientes}
                    colunas={colunasPara(mesCiclo)}
                    cartao={cartaoCliente}
                    detalhe={detalheCliente}
                    aoClicar={(cliente) => router.visit(`/clientes/${cliente.numero_cliente}`)}
                    placeholder="Nome, nº de cliente, telefone ou bairro"
                    filtrosConfig={filtrosConfig}
                    accoes={accoesCliente}
                    rotuloAccoes={(cliente) => `Mais acções sobre ${cliente.nome}`}
                    rodape={
                        ehAdministrador && (
                            <Link href="/lixeira?tipo=clientes" className="inline-flex items-center gap-1.5 font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Clientes removidos
                            </Link>
                        )
                    }
                    vazio={{
                        ilustracao: "pesquisa",
                        titulo: "Ainda não há clientes",
                        mensagem: "Registe o primeiro cliente para começar a ler contadores e facturar.",
                        mensagemFiltrada: "Nenhum cliente encontrado para os filtros seleccionados.",
                        accao: { rotulo: "Novo cliente", icone: Plus, onClick: abrirNovo, disabled: tarifas.length === 0 },
                    }}
                />
            </div>

            <Modal
                show={etapaNovo === "formulario"}
                onClose={fecharModalCliente}
                variante={editando ? "painel" : "centro"}
                maxWidth="xl"
                title={editando ? "Editar cliente" : "Novo cliente"}
                description={editando ? `${editando.numero_cliente} · ${editando.nome}` : "Três perguntas: tipo de ligação, quem é e onde fica."}
            >
                <form onSubmit={submitCliente} className="flex flex-col gap-5">
                    <ResumoErros erros={form.errors} />

                    {editando ? (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Campo id="nome" rotulo="Nome completo" className="sm:col-span-2" alterado={form.data.nome !== (editando.nome ?? "")} erro={form.errors.nome}>
                                    <input id="nome" required value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} className={cn(classeCampo, form.data.nome !== (editando.nome ?? "") && classeAlterado)} />
                                </Campo>
                                <Campo id="telefone" rotulo="Telefone" alterado={form.data.telefone !== (editando.telefone ?? "")} erro={form.errors.telefone}>
                                    <input id="telefone" type="tel" value={form.data.telefone} onChange={(e) => form.setData("telefone", e.target.value)} placeholder="84 562 6156" className={cn(classeCampo, form.data.telefone !== (editando.telefone ?? "") && classeAlterado)} />
                                </Campo>
                                <Campo id="email" rotulo="Email" opcional alterado={form.data.email !== (editando.email ?? "")} erro={form.errors.email}>
                                    <input id="email" type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} placeholder="Para receber facturas" autoComplete="off" className={cn(classeCampo, form.data.email !== (editando.email ?? "") && classeAlterado)} />
                                </Campo>
                                <Campo id="zona_id" rotulo="Zona" alterado={String(form.data.zona_id ?? "") !== String(editando.zona_id ?? "")} erro={form.errors.zona_id}>
                                    <select id="zona_id" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className={cn(classeCampo, String(form.data.zona_id ?? "") !== String(editando.zona_id ?? "") && classeAlterado)}>
                                        <option value="">Sem zona</option>
                                        {zonas.map((zona) => (
                                            <option key={zona.id} value={zona.id}>{zona.nome}</option>
                                        ))}
                                    </select>
                                </Campo>
                                <Campo id="tarifa_id" rotulo="Tarifa" alterado={String(form.data.tarifa_id) !== String(editando.tarifa_id)} erro={form.errors.tarifa_id}>
                                    <select id="tarifa_id" value={form.data.tarifa_id} onChange={(e) => form.setData("tarifa_id", e.target.value)} className={cn(classeCampo, String(form.data.tarifa_id) !== String(editando.tarifa_id) && classeAlterado)}>
                                        {tarifas.map((tarifa) => (
                                            <option key={tarifa.id} value={tarifa.id}>{tarifa.nome}</option>
                                        ))}
                                    </select>
                                </Campo>
                                <Campo id="endereco" rotulo="Morada" opcional className="sm:col-span-2" alterado={form.data.endereco !== (editando.endereco ?? "")} erro={form.errors.endereco}>
                                    <input id="endereco" value={form.data.endereco} onChange={(e) => form.setData("endereco", e.target.value)} className={cn(classeCampo, form.data.endereco !== (editando.endereco ?? "") && classeAlterado)} />
                                </Campo>
                                {ehAdministrador && (
                                    <Campo
                                        id="leitura_inicial"
                                        rotulo="Leitura inicial do contador"
                                        className="sm:col-span-2"
                                        alterado={String(form.data.leitura_inicial ?? "") !== String(editando.leitura_inicial ?? "")}
                                        erro={form.errors.leitura_inicial}
                                        ajuda="Muda o consumo da primeira leitura. Antes de gravar, mostra o efeito na factura."
                                    >
                                        <input id="leitura_inicial" type="number" min="0" step="0.01" value={form.data.leitura_inicial} onChange={(e) => form.setData("leitura_inicial", e.target.value)} className={classeCampo} />
                                    </Campo>
                                )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <CampoBloqueado rotulo="Nº de cliente" valor={editando.numero_cliente} motivo="Fixo: está nas facturas e recibos." />
                                <CampoBloqueado rotulo="Estado" valor={estadoConfig[editando.estado]?.label ?? editando.estado} motivo="Suspender ou reactivar na ficha do cliente." />
                            </div>
                        </>
                    ) : (
                        <>
                            <BlocoNumerado numero={1} titulo="Tipo de ligação">
                                <div role="radiogroup" aria-label="Tipo de ligação" className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        { valor: true, titulo: "Ligação nova", texto: `Primeira ligação de água. É emitida a factura da taxa de ligação de ${formatMoney(taxaLigacao)}.`, icone: Sparkles },
                                        { valor: false, titulo: "Já tem água", texto: "Cliente que já estava ligado antes do sistema. Só registar, sem taxa.", icone: UserPlus },
                                    ].map((opcao) => {
                                        const on = novoContrato === opcao.valor;
                                        const Icone = opcao.icone;
                                        return (
                                            <button
                                                key={opcao.titulo}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() => {
                                                    setNovoContrato(opcao.valor);
                                                    form.setData("novo_contrato", opcao.valor);
                                                }}
                                                className={cn(
                                                    "flex items-start gap-3 rounded-[14px] border p-4 text-left transition-colors",
                                                    on ? "border-brand bg-[#F7F9FF] dark:border-cyan-400 dark:bg-[rgba(0,89,255,0.10)]" : "border-[#DDE2EE] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/[0.04]",
                                                )}
                                            >
                                                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", on ? "bg-brand text-white dark:bg-cyan-500" : "bg-[#EEF2FA] text-brand dark:bg-[#1E232D] dark:text-cyan-300")}>
                                                    <Icone className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                                <span className="flex flex-col gap-1">
                                                    <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{opcao.titulo}</strong>
                                                    <span className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{opcao.texto}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </BlocoNumerado>

                            <BlocoNumerado numero={2} titulo="Quem é">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Campo id="nome" rotulo="Nome completo" className="sm:col-span-2" erro={form.errors.nome}>
                                        <input id="nome" required value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} placeholder="Nome completo ou da empresa" className={classeCampo} />
                                    </Campo>
                                    <Campo id="telefone" rotulo="Telefone" erro={form.errors.telefone} ajuda="Para lembretes e cobrança.">
                                        <input id="telefone" type="tel" value={form.data.telefone} onChange={(e) => form.setData("telefone", e.target.value)} placeholder="84 562 6156" className={classeCampo} />
                                    </Campo>
                                    <Campo id="email" rotulo="Email" opcional erro={form.errors.email}>
                                        <input id="email" type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} placeholder="Para receber facturas" autoComplete="off" className={classeCampo} />
                                    </Campo>
                                </div>
                            </BlocoNumerado>

                            <BlocoNumerado numero={3} titulo="Onde fica">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Campo id="zona_id" rotulo="Zona" erro={form.errors.zona_id}>
                                        <select id="zona_id" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className={classeCampo}>
                                            <option value="">{zonas.length === 0 ? "Sem zonas — crie em Zonas" : "Escolha a zona"}</option>
                                            {zonas.map((zona) => (
                                                <option key={zona.id} value={zona.id}>{zona.nome}</option>
                                            ))}
                                        </select>
                                        <button type="button" onClick={() => setNovaZonaAberta(true)} className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                            Adicionar zona
                                        </button>
                                    </Campo>
                                    <Campo id="tarifa_id" rotulo="Tarifa" erro={form.errors.tarifa_id}>
                                        <select id="tarifa_id" value={form.data.tarifa_id} onChange={(e) => form.setData("tarifa_id", e.target.value)} className={classeCampo}>
                                            {tarifas.map((tarifa) => (
                                                <option key={tarifa.id} value={tarifa.id}>{tarifa.nome}</option>
                                            ))}
                                        </select>
                                    </Campo>
                                    <Campo id="endereco" rotulo="Morada" opcional className="sm:col-span-2" erro={form.errors.endereco}>
                                        <input id="endereco" value={form.data.endereco} onChange={(e) => form.setData("endereco", e.target.value)} placeholder="Rua, nº da casa ou ponto de referência" className={classeCampo} />
                                    </Campo>
                                    <Campo
                                        id="leitura_inicial"
                                        rotulo="Leitura inicial do contador"
                                        className="sm:col-span-2"
                                        erro={form.errors.leitura_inicial}
                                        ajuda="O que o contador marca hoje. A primeira factura parte deste valor. Use 0 só num contador novo."
                                    >
                                        <input id="leitura_inicial" type="number" min="0" step="0.01" required value={form.data.leitura_inicial} onChange={(e) => form.setData("leitura_inicial", e.target.value)} placeholder="Ex.: 430" className={classeCampo} />
                                    </Campo>
                                </div>
                            </BlocoNumerado>

                            {novoContrato !== null && (
                                <div className="rounded-[14px] bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-600 dark:bg-[#1E232D] dark:text-slate-300">
                                    <strong className="text-ink dark:text-[#F2F5FB]">{form.data.nome.trim() || "O cliente"}</strong> fica activo
                                    {novoContrato ? (
                                        <>
                                            {" "}e é emitida a factura da taxa de ligação de <strong className="text-ink dark:text-[#F2F5FB]">{formatMoney(taxaLigacao)}</strong>.
                                        </>
                                    ) : (
                                        <> sem taxa de ligação: não é emitida nenhuma factura agora.</>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex flex-wrap justify-end gap-3 border-t border-[#E8ECF4] pt-4 dark:border-slate-700">
                        <SecondaryButton type="button" onClick={fecharModalCliente}>
                            Cancelar
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={form.processing || (!editando && novoContrato === null)}>
                            {form.processing ? "A guardar…" : editando ? "Guardar alterações" : "Criar cliente"}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            <Modal show={Boolean(previewInicial)} onClose={() => setPreviewInicial(null)} title="Pré-visualizar leitura inicial" maxWidth="md">
                {previewInicial && <form onSubmit={confirmarLeituraInicial} className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">Leitura inicial: <strong>{formatNumero(previewInicial.leitura_inicial_antes)} → {formatNumero(previewInicial.leitura_inicial_depois)}</strong>.</p>
                    {previewInicial.primeira ? <div className="rounded-lg border border-border p-4 text-sm">
                        <p>Primeira leitura: <strong>{previewInicial.primeira.periodo}</strong> · contador {formatNumero(previewInicial.primeira.contador)}</p>
                        <p className="mt-1">Consumo: {formatNumero(previewInicial.primeira.consumo_antes)} → <strong>{formatNumero(previewInicial.primeira.consumo_depois)} m³</strong></p>
                        {previewInicial.factura?.factura && <p className="mt-1">Factura {previewInicial.factura.factura.numero_factura}: {formatMoney(previewInicial.factura.total_antes)} → <strong>{previewInicial.factura.total_depois == null ? "—" : formatMoney(previewInicial.factura.total_depois)}</strong></p>}
                    </div> : <p className="text-sm">Ainda não há leituras mensais; apenas o ponto inicial será actualizado.</p>}
                    <InputError message={correcaoInicialForm.errors.leitura_inicial} />
                    {!previewInicial.pode_aplicar && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">A factura afectada tem pagamentos ou não está pendente. Regularize os pagamentos antes de alterar esta leitura.</p>}
                    <div><InputLabel htmlFor="motivo-leitura-inicial" value="Motivo da alteração" /><textarea id="motivo-leitura-inicial" rows={3} required minLength={5} maxLength={1000} value={correcaoInicialForm.data.motivo_leitura_inicial} onChange={(event) => correcaoInicialForm.setData("motivo_leitura_inicial", event.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Ex.: leitura de abertura confirmada com o cliente" /><InputError message={correcaoInicialForm.errors.motivo_leitura_inicial} className="mt-1" /></div>
                    <div className="flex justify-end gap-3"><SecondaryButton type="button" onClick={() => setPreviewInicial(null)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={!previewInicial.pode_aplicar || correcaoInicialForm.processing}>{correcaoInicialForm.processing ? "A guardar…" : "Confirmar correcção"}</PrimaryButton></div>
                </form>}
            </Modal>

            <Modal show={novaZonaAberta} onClose={() => setNovaZonaAberta(false)} title="Adicionar bairro/zona" maxWidth="sm">
                <form onSubmit={criarZona} className="space-y-4">
                    <div>
                        <InputLabel htmlFor="nova_zona_nome" value="Nome do bairro ou zona" />
                        <TextInput id="nova_zona_nome" value={novaZona.data.nome} onChange={(event) => novaZona.setData("nome", event.target.value)} className="mt-1 block w-full" autoFocus required />
                        <InputError message={novaZona.errors.nome} className="mt-1" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={() => setNovaZonaAberta(false)}>Cancelar</SecondaryButton>
                        <PrimaryButton type="submit" disabled={novaZona.processing}>Criar zona</PrimaryButton>
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
