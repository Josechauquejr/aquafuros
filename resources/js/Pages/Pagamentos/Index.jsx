import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Banknote,
    Eye,
    Landmark,
    Layers,
    ClipboardCheck,
    Lock,
    Pencil,
    Plus,
    Printer,
    RotateCcw,
    Smartphone,
    Trash2,
    Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import ConfirmDialog from "@/Components/ConfirmDialog";
import DataTable from "@/Components/DataTable/DataTable";
import { Campo, Campos, Destaque, Destaques, MaisDetalhes } from "@/Components/DataTable/Detalhe";
import InlineNotice from "@/Components/InlineNotice";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import AnimatedPanel from "@/Components/AnimatedPanel";
import CaixaCabecalho from "@/Components/CaixaCabecalho";
import Ilustracao from "@/Components/Ilustracao";
import SeletorMes from "@/Components/SeletorMes";
import StatusBadge from "@/Components/StatusBadge";
import Modal from "@/Components/Modal";
import RegistarPagamento from "@/Components/RegistarPagamento";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import useAbrirNovo from "@/hooks/useAbrirNovo";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

const metodoConfig = {
    dinheiro: { label: "Dinheiro", icon: Banknote },
    mpesa: { label: "M-Pesa", icon: Smartphone },
    "e-mola": { label: "E-Mola", icon: Smartphone },
    banco: { label: "Banco", icon: Landmark },
};

// Valores que o servidor assume quando o parâmetro não vem no URL.
const padroes = { periodo: "mes", metodo: "todos", aba: "", sort: "recibo", dir: "desc" };

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
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <MetodoIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
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
                <p className="font-semibold text-ink dark:text-white">{pagamento.numero_recibo}</p>
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
            <span className="font-semibold text-ink dark:text-white">{formatMoney(pagamento.valor_pago)}</span>
        ),
    },
    { chave: "metodo", titulo: "Método", render: (pagamento) => <MetodoBadge metodo={pagamento.metodo_pagamento} /> },
];

const cartaoPagamento = (pagamento) => (
    <div className="space-y-2">
        <div>
            <p className="font-semibold text-ink dark:text-white">{pagamento.numero_recibo}</p>
            <p className="truncate text-sm text-slate-600 dark:text-slate-300">
                {pagamento.cliente?.nome ?? "Cliente removido"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(pagamento.pago_em ?? pagamento.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink dark:text-white">{formatMoney(pagamento.valor_pago)}</span>
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

export default function Index({ pagamentos, facturasEmAberto, clientes = [], creditos = {}, dataActual, metricas, mesReferencia, filtros, caixaHoje }) {
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

    const abaRecibos = filtros.aba === "recibos";
    const [chaveReceber, setChaveReceber] = useState(0);
    const abrirNovo = (facturaIdPreseleccionada) => {
        setEditando(null);
        setClienteInicial("");
        setFacturaInicial(facturaIdPreseleccionada ?? "");
        setChaveReceber((n) => n + 1);
        if (abaRecibos) router.get("/pagamentos", {}, { preserveScroll: true });
    };
    useAbrirNovo(() => abrirNovo());

    // Chegou aqui a partir de "Deseja efectuar o pagamento agora?" (Facturas)
    // — pré-selecciona essa factura e abre logo o formulário de pagamento.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const clienteId = params.get("cliente_id");
        if (clienteId && facturasEmAberto.some(f => String(f.cliente_id) === clienteId)) {
            setClienteInicial(clienteId);
            setChaveReceber((n) => n + 1);
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


    const porMetodo = Object.entries(caixaHoje?.porMetodo ?? {}).filter(([, valor]) => valor > 0);

    return (
        <AdminLayout>
            <Head title="Caixa" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <CaixaCabecalho caixaHoje={caixaHoje} activa={abaRecibos ? "recibos" : "receber"} />

                {!abaRecibos ? (
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                        <RegistarPagamento
                            key={chaveReceber}
                            facturasEmAberto={facturasEmAberto}
                            creditos={creditos}
                            metodos={metodoConfig}
                            facturaInicial={facturaInicial}
                            clienteInicial={clienteInicial}
                            dataActual={dataActual}
                        />

                        <AnimatedPanel className="flex flex-col gap-4 p-6">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Caixa de hoje</h2>
                                <StatusBadge tone={caixaHoje?.fechada ? "slate" : "emerald"}>{caixaHoje?.fechada ? "Fechada" : "Aberta"}</StatusBadge>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[30px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(caixaHoje?.total ?? 0)}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {caixaHoje?.recibos ?? 0} {(caixaHoje?.recibos ?? 0) === 1 ? "recibo emitido" : "recibos emitidos"} hoje
                                </span>
                            </div>
                            {porMetodo.length > 0 ? (
                                <dl className="flex flex-col gap-2 rounded-md bg-slate-50 p-4 text-sm dark:bg-[#1E232D]">
                                    {porMetodo.map(([chave, valor]) => (
                                        <div key={chave} className="flex justify-between gap-3">
                                            <dt className="text-slate-600 dark:text-slate-300">{metodoConfig[chave]?.label ?? chave}</dt>
                                            <dd className="font-semibold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(valor)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : (
                                <div className="flex items-center gap-3 rounded-md bg-slate-50 p-4 dark:bg-[#1E232D]">
                                    <Ilustracao nome="recibo" largura={80} />
                                    <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                        Os recebimentos de hoje aparecem aqui, separados por Dinheiro, M-Pesa, E-Mola e Banco.
                                    </span>
                                </div>
                            )}
                            <Link
                                href="/pagamentos/fecho-caixa"
                                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-bold text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB] dark:hover:bg-[#262C38]"
                            >
                                <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                                {caixaHoje?.fechada ? "Ver o fecho do dia" : "Fazer fecho do dia"}
                            </Link>
                            <div className="flex flex-col gap-1 border-t border-[#E8ECF4] pt-4 dark:border-slate-800">
                                <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">OUTRAS ACÇÕES</span>
                                <button type="button" onClick={() => setAdiantamentoAberto(true)} className="flex min-h-[40px] items-center gap-2 text-left text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    <Wallet className="h-4 w-4" aria-hidden="true" />
                                    Receber adiantamento
                                </button>
                                <Link href="/pagamentos?aba=recibos" className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                    Ver e imprimir recibos
                                </Link>
                            </div>
                        </AnimatedPanel>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Recibos de {mesReferencia.rotulo}</h2>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {metricas.totalRegistados > 0
                                        ? `${metricas.totalRegistados} ${metricas.totalRegistados === 1 ? "recibo" : "recibos"} · ${formatMoney(metricas.totalRecebido)} recebidos`
                                        : "Ainda sem recibos neste mês"}
                                </span>
                            </div>
                            <SeletorMes rota="/pagamentos" mesReferencia={mesReferencia} extra={{ ...filtros, aba: "recibos" }} />
                        </div>

                        <DataTable
                            rota="/pagamentos"
                            filtros={{ ...filtros, aba: "recibos" }}
                            padroes={padroes}
                            paginador={pagamentos}
                            colunas={colunas}
                            cartao={cartaoPagamento}
                            detalhe={detalhePagamento}
                            placeholder="Cliente, nº de recibo ou de factura"
                            filtrosConfig={filtrosConfig}
                            accoes={accoesPagamento}
                            rotuloAccoes={(pagamento) => `Mais acções sobre ${pagamento.numero_recibo}`}
                            selecao={selecao}
                            rodape={
                                ehAdministrador && (
                                    <Link href="/lixeira?tipo=pagamentos" className="inline-flex items-center gap-1.5 font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        Recibos estornados
                                    </Link>
                                )
                            }
                            vazio={{
                                ilustracao: "recibo",
                                titulo: `Ainda sem recibos em ${mesReferencia.rotulo}`,
                                mensagem: "Cada pagamento que emitir neste mês aparece aqui.",
                                mensagemFiltrada: "Nenhum recibo encontrado para os filtros seleccionados.",
                            }}
                        />
                    </>
                )}
            </div>

            <Modal
                show={showModal && Boolean(editando)}
                onClose={() => { if (!form.processing) setShowModal(false); }}
                title={`Editar recibo ${editando?.numero_recibo ?? ""}`}
                description={editando?.cliente?.nome}
                variante="painel"
            >
                <form onSubmit={submit} className="space-y-4">
                    {editando && (
                        <>
                            <div className="grid grid-cols-3 gap-2.5">
                                {[
                                    ["Valor", formatMoney(editando.valor_pago)],
                                    ["Factura", editando.factura?.numero_factura ?? "—"],
                                    ["Data", formatDateTime(editando.pago_em ?? editando.created_at).split(" às ")[0]],
                                ].map(([rotulo, valor]) => (
                                    <div key={rotulo} className="flex flex-col gap-0.5 rounded-md border border-[#E1E7F3] bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#1E232D]">
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Lock className="h-3 w-3" aria-hidden="true" />{rotulo}</span>
                                        <strong className="text-[15px] tabular-nums text-ink dark:text-[#F2F5FB]">{valor}</strong>
                                    </div>
                                ))}
                            </div>
                            <p className="-mt-1 text-[13px] text-slate-600 dark:text-slate-300">Para mudar o valor, estorne o recibo e emita outro.</p>
                        </>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="metodo_pagamento" value="Método de pagamento" />
                            <select
                                id="metodo_pagamento"
                                value={form.data.metodo_pagamento}
                                onChange={(event) => form.setData("metodo_pagamento", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                            className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                            <InputLabel htmlFor="valor_adiantamento" value="Valor (MT)" />
                            <TextInput id="valor_adiantamento" type="number" min="0.01" step="0.01" required value={adiantamento.data.valor} onChange={(event) => adiantamento.setData("valor", event.target.value)} className="mt-1 block w-full" />
                            <InputError message={adiantamento.errors.valor} className="mt-1" />
                        </div>
                        <div>
                            <InputLabel htmlFor="metodo_adiantamento" value="Método" />
                            <select
                                id="metodo_adiantamento"
                                value={adiantamento.data.metodo_pagamento}
                                onChange={(event) => adiantamento.setData("metodo_pagamento", event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-ink sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                                {Object.entries(metodoConfig).map(([valor, { label }]) => (
                                    <option key={valor} value={valor}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <InputLabel htmlFor="ref_adiantamento" value={adiantamento.data.metodo_pagamento === "dinheiro" ? "Referência (opcional)" : "Referência da transacção *"} />
                        <TextInput id="ref_adiantamento" required={adiantamento.data.metodo_pagamento !== "dinheiro"} value={adiantamento.data.referencia_pagamento} onChange={(event) => adiantamento.setData("referencia_pagamento", event.target.value)} className="mt-1 block w-full" />
                        <InputError message={adiantamento.errors.referencia_pagamento} className="mt-1" />
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
