import { useForm } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Search, Wallet } from "lucide-react";
import { useId, useMemo, useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { filtrarDifuso } from "@/lib/busca";
import { formatDate, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { centavosPagamento as centavos, distribuirPagamento, multaFacturaCentavos as multaDe, ordenarFacturasPagamento, pagoFacturaCentavos as pagoDe, principalFacturaCentavos as principalDe, saldoFacturaCentavos as saldoDe } from "@/lib/pagamento";

const montante = valor => `${formatNumero(valor / 100)} MT`;
const paraInput = valor => (valor / 100).toFixed(2);
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const periodo = factura => `${meses[factura.mes - 1]} de ${factura.ano}`;
const campoClasses = "mt-1.5 block min-h-[42px] w-full rounded-lg text-base sm:text-sm";
const hojeLocal = () => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
};

function DadoRevisao({ titulo, children }) {
    return <div className="min-w-0 border-b border-slate-100 py-3 dark:border-slate-800">
        <dt className="text-xs text-slate-500 dark:text-slate-400">{titulo}</dt>
        <dd className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-white">{children}</dd>
    </div>;
}

function ValoresFactura({ factura }) {
    return <span className="mt-2 grid grid-cols-2 gap-3 text-xs">
        <span className="text-slate-500 dark:text-slate-400">Já pago<span className="mt-0.5 block text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{montante(pagoDe(factura))}</span></span>
        <span className="text-right text-slate-500 dark:text-slate-400">Em falta<span className="mt-0.5 block text-sm font-semibold tabular-nums text-amber-800 dark:text-amber-300">{montante(saldoDe(factura))}</span></span>
    </span>;
}

export default function RegistarPagamento({ facturasEmAberto, creditos = {}, metodos, facturaInicial = "", clienteInicial = "", dataActual, onClose }) {
    const id = useId();
    const hoje = dataActual || hojeLocal();
    const inicial = facturasEmAberto.find(factura => String(factura.id) === String(facturaInicial));
    const [clienteId, setClienteId] = useState(inicial?.cliente_id ?? clienteInicial);
    const [seleccionadas, setSeleccionadas] = useState(inicial ? [inicial.id] : []);
    const form = useForm({
        valor_pago: inicial ? paraInput(saldoDe(inicial)) : "",
        metodo_pagamento: "dinheiro", referencia_pagamento: "", data_pagamento: hoje,
        usar_credito: false, guardar_excesso: false,
    });
    const [pesquisa, setPesquisa] = useState("");
    const [rever, setRever] = useState(false);
    const [erroOperacao, setErroOperacao] = useState("");
    const clientes = useMemo(() => {
        const mapa = new Map();
        for (const factura of facturasEmAberto) {
            if (!factura.cliente) continue;
            const cliente = mapa.get(String(factura.cliente_id)) ?? {...factura.cliente, id: factura.cliente_id, facturas: [], saldo: 0};
            cliente.facturas.push(factura);
            cliente.saldo += saldoDe(factura);
            mapa.set(String(cliente.id), cliente);
        }
        return [...mapa.values()].map(cliente => ({...cliente, facturas: cliente.facturas.sort(ordenarFacturasPagamento)}))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    }, [facturasEmAberto]);
    const cliente = clientes.find(item => String(item.id) === String(clienteId));
    const clientesVisiveis = useMemo(() => filtrarDifuso(clientes, pesquisa,
        item => `${item.nome} ${item.numero_cliente ?? ""} ${item.facturas.map(f => f.numero_factura).join(" ")}`), [clientes, pesquisa]);
    const facturasSeleccionadas = (cliente?.facturas ?? []).filter(factura => seleccionadas.includes(factura.id));
    const factura = facturasSeleccionadas[0];
    const principal = facturasSeleccionadas.reduce((soma, item) => soma + principalDe(item), 0);
    const multa = facturasSeleccionadas.reduce((soma, item) => soma + multaDe(item), 0);
    const saldo = facturasSeleccionadas.reduce((soma, item) => soma + saldoDe(item), 0);
    const jaPago = facturasSeleccionadas.reduce((soma, item) => soma + pagoDe(item), 0);
    const quantidadeParciais = facturasSeleccionadas.filter(item => pagoDe(item) > 0).length;
    const creditoDisponivel = cliente ? centavos(creditos[cliente.id] ?? 0) : 0;
    const creditoAplicado = form.data.usar_credito ? Math.min(creditoDisponivel, saldo) : 0;
    const limiteRecebido = Math.max(0, saldo - creditoAplicado);
    const recebido = centavos(form.data.valor_pago);
    const excesso = Math.max(0, recebido - limiteRecebido);
    const aplicacoes = distribuirPagamento(facturasSeleccionadas, recebido, creditoAplicado);
    const aplicado = aplicacoes.reduce((soma, item) => soma + item.total, 0);
    const remanescente = Math.max(0, saldo - aplicado);
    const saldoClienteRestante = Math.max(0, (cliente?.saldo ?? 0) - aplicado);
    const multaLiquidada = aplicacoes.reduce((soma, item) => soma + item.multa, 0);
    const parcial = aplicado > 0 && aplicado < saldo;
    const valorNumerico = Number(form.data.valor_pago);
    const valorValido = form.data.valor_pago !== "" && Number.isFinite(valorNumerico) && valorNumerico >= 0
        && Math.abs(valorNumerico * 100 - recebido) < 0.0001 && (recebido > 0 || creditoAplicado > 0);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(form.data.data_pagamento) && form.data.data_pagamento <= hoje;
    const excedeSemCredito = excesso > 0 && !form.data.guardar_excesso;
    const erroValor = form.data.valor_pago !== "" && !valorValido
        ? (valorNumerico < 0 || (recebido === 0 && creditoAplicado === 0) ? "Indique um valor superior a zero." : "Indique um valor válido, com até duas casas decimais.") : "";
    const podeRever = facturasSeleccionadas.length > 0 && valorValido && dataValida && !excedeSemCredito
        && Boolean(metodos[form.data.metodo_pagamento]) && Object.keys(form.errors).length === 0;
    const alterar = (chave, valor) => {
        form.setData(chave, valor);
        form.clearErrors(chave, ...(chave === "valor_pago" ? ["parcelas"] : []));
        setErroOperacao("");
    };
    const seleccionarCliente = item => {
        setClienteId(item.id);
        setSeleccionadas([]);
        setPesquisa("");
        form.setData(dados => ({...dados, valor_pago: "", usar_credito: false, guardar_excesso: false}));
        form.clearErrors();
        setErroOperacao("");
    };
    const alterarSeleccao = ids => {
        setSeleccionadas(ids);
        const novoSaldo = cliente.facturas.filter(factura => ids.includes(factura.id)).reduce((soma, item) => soma + saldoDe(item), 0);
        const credito = form.data.usar_credito ? Math.min(creditoDisponivel, novoSaldo) : 0;
        form.setData(dados => ({...dados, valor_pago: ids.length ? paraInput(novoSaldo - credito) : "", guardar_excesso: false}));
        form.clearErrors();
    };
    const ajustarOpcao = (chave, valor) => {
        const opcoes = {...form.data, [chave]: valor};
        const credito = opcoes.usar_credito ? Math.min(creditoDisponivel, saldo) : 0;
        form.setData({...opcoes, valor_pago: paraInput(saldo - credito), guardar_excesso: false});
        form.clearErrors("valor_pago", "parcelas", chave);
    };
    const fechar = () => { if (!form.processing) onClose(); };
    const confirmar = () => {
        if (!rever || !podeRever || form.processing) return;
        const parcelas = aplicacoes.filter(item => item.total > 0).map(item => ({factura_id: item.factura.id, valor_pago: paraInput(item.total)}));
        const multiplo = parcelas.length > 1;
        form.transform(dados => multiplo ? {...dados, valor_recebido: dados.valor_pago, parcelas}
            : {...dados, factura_id: parcelas[0].factura_id});
        form.post(multiplo ? "/pagamentos/multiplo" : "/pagamentos", {
            onSuccess: page => {
                if (page.props.flash?.error) { setErroOperacao(page.props.flash.error); setRever(false); }
                else onClose();
            },
            onError: () => setRever(false),
        });
    };
    const erroParcelas = Object.entries(form.errors).find(([chave]) => chave.startsWith("parcelas"))?.[1];
    const footer = <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden sm:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">Valor a registar</p>
            <p className="mt-0.5 whitespace-nowrap text-base font-semibold tabular-nums text-slate-900 dark:text-white">{montante(aplicado)}</p>
        </div>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <SecondaryButton type="button" onClick={rever ? () => setRever(false) : fechar} disabled={form.processing} className="min-h-[42px] gap-1.5 normal-case text-sm">
                {rever && <ArrowLeft className="h-4 w-4" aria-hidden="true" />}{rever ? "Voltar" : "Cancelar"}
            </SecondaryButton>
            {rever ? <PrimaryButton type="button" onClick={confirmar} disabled={!podeRever || form.processing} className="min-h-[42px] gap-2 bg-[#0C7189] text-sm normal-case">
                <Check className="h-4 w-4" aria-hidden="true" />{form.processing ? "A registar…" : "Confirmar pagamento"}
            </PrimaryButton> : <PrimaryButton type="submit" form={id} disabled={!podeRever || form.processing} className="min-h-[42px] gap-2 bg-[#0C7189] text-sm normal-case">
                Rever e confirmar<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>}
        </div>
    </div>;

    return <Modal show onClose={fechar} maxWidth="2xl" icon={Wallet} title={rever ? "Rever pagamento" : "Registar pagamento"}
        description={rever ? "Confira as facturas e a aplicação do valor recebido." : "Pesquise o cliente e escolha uma, várias ou todas as facturas."} footer={footer}>
        {erroOperacao && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{erroOperacao}</p>}
        {rever ? <div>
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0C7189] dark:text-cyan-300" aria-hidden="true" />
                <p className="text-sm text-slate-700 dark:text-slate-200">O pagamento será registado após a confirmação. O recibo ficará disponível de seguida.</p>
            </div>
            <dl className="grid gap-x-6 sm:grid-cols-2">
                <DadoRevisao titulo="Cliente">{cliente?.nome} · {cliente?.numero_cliente}</DadoRevisao>
                <DadoRevisao titulo="Facturas seleccionadas">{facturasSeleccionadas.length}</DadoRevisao>
                <DadoRevisao titulo="Já pago nas facturas seleccionadas">{montante(jaPago)}</DadoRevisao>
                <DadoRevisao titulo="Em falta antes deste pagamento">{montante(saldo)}</DadoRevisao>
                <DadoRevisao titulo="Tipo deste pagamento">{parcial ? "Pagamento parcial" : "Liquidação do saldo seleccionado"}</DadoRevisao>
                <DadoRevisao titulo="Valor recebido">{montante(recebido)}</DadoRevisao>
                {multa > 0 && <DadoRevisao titulo="Penalização incluída no saldo">{montante(multa)}</DadoRevisao>}
                {multa > 0 && <DadoRevisao titulo="Valor aplicado à penalização">{montante(multaLiquidada)}</DadoRevisao>}
                <DadoRevisao titulo="Meio de pagamento">{metodos[form.data.metodo_pagamento]?.label}</DadoRevisao>
                {form.data.metodo_pagamento !== "dinheiro" && <DadoRevisao titulo="Referência da transacção">{form.data.referencia_pagamento || "Não indicada"}</DadoRevisao>}
                <DadoRevisao titulo="Data do pagamento">{formatDate(`${form.data.data_pagamento}T12:00:00`)}</DadoRevisao>
                {creditoAplicado > 0 && <DadoRevisao titulo="Crédito utilizado">{montante(creditoAplicado)}</DadoRevisao>}
                {excesso > 0 && <DadoRevisao titulo="Excesso a guardar como crédito">{montante(excesso)}</DadoRevisao>}
                <DadoRevisao titulo="Saldo restante do cliente">{montante(saldoClienteRestante)}</DadoRevisao>
            </dl>
            <h4 className="mb-2 mt-4 text-sm font-semibold text-slate-900 dark:text-white">Aplicação por factura</h4>
            <ul className="space-y-2">{aplicacoes.map(item => <li key={item.factura.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="break-words font-semibold text-slate-900 dark:text-white">{item.factura.numero_factura} · {periodo(item.factura)}</p>
                {pagoDe(item.factura) > 0 && <span className="mt-1 inline-block text-xs font-medium text-cyan-700 dark:text-cyan-300">Factura parcialmente paga</span>}
                <ValoresFactura factura={item.factura} />
                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800"><p className="text-slate-500 dark:text-slate-400">Neste pagamento <strong className="block text-sm text-slate-900 dark:text-white">{montante(item.total)}</strong></p><p className="text-right text-slate-500 dark:text-slate-400">Fica em dívida <strong className="block text-sm text-slate-900 dark:text-white">{montante(item.remanescente)}</strong></p></div>
                {item.multa > 0 && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Inclui {montante(item.multa)} de multa.</p>}
            </li>)}</ul>
        </div> : <form id={id} onSubmit={evento => { evento.preventDefault(); if (podeRever) setRever(true); }}>
            <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <section className="min-w-0" aria-labelledby={`${id}-seleccionar`}>
                    <InputLabel htmlFor={`${id}-pesquisa`}><span id={`${id}-seleccionar`}>Pesquisar cliente</span></InputLabel>
                    <div className="relative mt-1.5">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <TextInput id={`${id}-pesquisa`} type="search" value={pesquisa} onChange={evento => setPesquisa(evento.target.value)} placeholder="Nome ou número do cliente..." className="min-h-[42px] w-full rounded-lg pl-9 text-base sm:text-sm" />
                    </div>
                    {(!cliente || pesquisa.trim()) && <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain rounded-lg pr-1" role="group" aria-label="Clientes com dívida">
                        {clientesVisiveis.map(item => <button key={item.id} type="button" onClick={() => seleccionarCliente(item)} className="block w-full rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 dark:border-slate-700 dark:hover:bg-cyan-950/30">
                            <span className="block break-words font-semibold text-slate-900 dark:text-white">{item.nome}</span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{item.numero_cliente} · {item.facturas.length} factura(s) em aberto</span>
                            <span className="mt-2 block font-semibold tabular-nums text-[#0C7189] dark:text-cyan-300">Total em dívida: {montante(item.saldo)}</span>
                        </button>)}
                        {!clientesVisiveis.length && <p className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Nenhum cliente com dívida encontrado.</p>}
                    </div>}
                    {cliente && <>
                        <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/30">
                            <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{cliente.nome}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cliente.numero_cliente} · {cliente.facturas.length} factura(s) em aberto</p>
                            <p className="mt-2 text-sm font-semibold tabular-nums text-[#0C7189] dark:text-cyan-300">Total em dívida: {montante(cliente.saldo)}</p>
                        </div>
                        <div className="mb-2 mt-4 flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200">Facturas a pagar</h4>
                            <button type="button" onClick={() => alterarSeleccao(facturasSeleccionadas.length === cliente.facturas.length ? [] : cliente.facturas.map(item => item.id))} className="min-h-8 text-xs font-semibold text-[#0C7189] hover:underline dark:text-cyan-300">{facturasSeleccionadas.length === cliente.facturas.length ? "Limpar selecção" : "Seleccionar todas"}</button>
                        </div>
                        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Escolha uma factura, várias ou todas.</p>
                        <ul className="max-h-64 space-y-2 overflow-y-auto overscroll-contain rounded-lg pr-1" aria-label="Facturas do cliente">
                            {cliente.facturas.map(item => <li key={item.id}>
                                <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3", seleccionadas.includes(item.id) ? "border-[#0C7189] bg-cyan-50 dark:border-cyan-400 dark:bg-cyan-950/40" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900")}>
                                    <input type="checkbox" checked={seleccionadas.includes(item.id)} onChange={() => alterarSeleccao(seleccionadas.includes(item.id) ? seleccionadas.filter(valor => valor !== item.id) : [...seleccionadas, item.id])} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0C7189] focus:ring-cyan-600" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block break-words text-sm font-semibold text-slate-900 dark:text-white">{item.numero_factura}</span>
                                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{periodo(item)} · Vence em {formatDate(item.data_vencimento)}</span>
                                        <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", pagoDe(item) > 0 ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200")}>{pagoDe(item) > 0 ? "Parcialmente paga" : "Por pagar"}</span>
                                        <ValoresFactura factura={item} />
                                        {multaDe(item) > 0 && <span className="mt-0.5 block text-xs text-amber-800 dark:text-amber-300">Inclui multa: {montante(multaDe(item))}</span>}
                                    </span>
                                </label>
                            </li>)}
                        </ul>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{facturasSeleccionadas.length} de {cliente.facturas.length} factura(s) seleccionada(s)</p>
                    </>}
                    <InputError message={form.errors.factura_id || erroParcelas} className="mt-2" />
                </section>
                <section className="min-w-0 space-y-4" aria-label="Dados do pagamento">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Em falta nas facturas seleccionadas</p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <p className="whitespace-nowrap text-[28px] font-semibold leading-tight tabular-nums text-slate-900 dark:text-white">{factura ? montante(saldo) : "—"}</p>
                            {factura && <StatusBadge tone={quantidadeParciais > 0 ? "cyan" : "amber"}>{facturasSeleccionadas.length > 1 ? `${facturasSeleccionadas.length} facturas` : quantidadeParciais > 0 ? "Parcialmente paga" : "Por pagar"}</StatusBadge>}
                        </div>
                        {factura && <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                            <div><dt className="text-slate-500 dark:text-slate-400">Valor das facturas</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900 dark:text-white">{montante(jaPago + saldo)}</dd></div>
                            <div className="text-right"><dt className="text-slate-500 dark:text-slate-400">Já pago</dt><dd className="mt-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{montante(jaPago)}</dd></div>
                        </dl>}
                        {facturasSeleccionadas.length > 1 && quantidadeParciais > 0 && <p className="mt-2 text-xs font-medium text-cyan-700 dark:text-cyan-300">{quantidadeParciais} factura(s) parcialmente paga(s).</p>}
                        {multa > 0 && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Principal: {montante(principal)} · Penalização: {montante(multa)}</p>}
                    </div>
                    <fieldset disabled={!factura || form.processing} aria-label="Introduzir dados do pagamento" className="min-w-0 space-y-4 disabled:opacity-60">
                        {multa > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div><p className="text-xs font-medium text-amber-900 dark:text-amber-200">Penalização por atraso</p><p className="mt-0.5 text-base font-semibold tabular-nums text-amber-950 dark:text-amber-100">{montante(multa)}</p></div>
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">Obrigatória</span>
                            </div>
                            <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-300">A penalização está incluída no montante a pagar.</p>
                        </div>}
                        <div>
                            <div className="flex items-center justify-between gap-2"><InputLabel htmlFor={`${id}-valor`} value="Valor recebido (MT)" /><button type="button" onClick={() => alterar("valor_pago", paraInput(limiteRecebido))} className="min-h-8 text-xs font-semibold text-[#0C7189] hover:underline dark:text-cyan-300">Valor total</button></div>
                            <TextInput id={`${id}-valor`} type="number" inputMode="decimal" min="0" step="0.01" value={form.data.valor_pago} onChange={evento => alterar("valor_pago", evento.target.value)} className={cn(campoClasses, "text-right tabular-nums", (excedeSemCredito || erroValor || form.errors.valor_pago) && "border-rose-500 focus:border-rose-500 focus:ring-rose-500")} aria-invalid={excedeSemCredito || Boolean(erroValor || form.errors.valor_pago)} aria-describedby={`${id}-valor-ajuda`} required />
                            <div id={`${id}-valor-ajuda`} className="mt-1.5 text-xs" aria-live="polite">
                                {erroValor ? <p className="text-rose-600 dark:text-rose-400">{erroValor}</p>
                                    : excedeSemCredito ? <p className="text-rose-600 dark:text-rose-400">O valor excede o permitido de {montante(limiteRecebido)}. Corrija o valor ou guarde o excesso como crédito.</p>
                                    : parcial ? <p className="text-amber-800 dark:text-amber-300">Este pagamento é parcial. Fica em dívida nas facturas seleccionadas: {montante(remanescente)}.</p>
                                    : <p className="text-slate-500 dark:text-slate-400">Pode indicar um valor inferior. O valor é aplicado às facturas escolhidas, da mais antiga para a mais recente.</p>}
                            </div>
                            <InputError message={form.errors.valor_pago} className="mt-1" />
                            {creditoDisponivel > 0 && <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"><input type="checkbox" checked={form.data.usar_credito} onChange={evento => ajustarOpcao("usar_credito", evento.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#0C7189] focus:ring-cyan-600" /><span>Usar crédito disponível: <strong>{montante(creditoDisponivel)}</strong>. O crédito abate primeiro o montante a pagar.</span></label>}
                            {excesso > 0 && <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><input type="checkbox" checked={form.data.guardar_excesso} onChange={evento => alterar("guardar_excesso", evento.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-[#0C7189] focus:ring-cyan-600" /><span>Guardar o excesso de <strong>{montante(excesso)}</strong> como crédito do cliente.</span></label>}
                        </div>
                        <div>
                            <InputLabel value="Meio de pagamento" />
                            <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Meio de pagamento">
                                {Object.entries(metodos).sort(([a], [b]) => ["dinheiro", "mpesa", "e-mola", "banco"].indexOf(a) - ["dinheiro", "mpesa", "e-mola", "banco"].indexOf(b)).map(([chave, {label, icon: Icon}]) => <button key={chave} type="button" aria-pressed={form.data.metodo_pagamento === chave}
                                    onClick={() => { form.setData(dados => ({...dados, metodo_pagamento: chave, referencia_pagamento: ""})); form.clearErrors("metodo_pagamento", "referencia_pagamento"); }}
                                    className={cn("flex min-h-[40px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2", form.data.metodo_pagamento === chave ? "border-[#0C7189] bg-[#0C7189] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800")}>
                                    {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}{label}
                                </button>)}
                            </div>
                            <InputError message={form.errors.metodo_pagamento} className="mt-1" />
                        </div>
                        {form.data.metodo_pagamento !== "dinheiro" && <div>
                            <InputLabel htmlFor={`${id}-referencia`} value="Referência da transacção" />
                            <TextInput id={`${id}-referencia`} value={form.data.referencia_pagamento} maxLength={255} onChange={evento => alterar("referencia_pagamento", evento.target.value)} placeholder="Introduzir referência da transacção" className={campoClasses} />
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opcional.</p><InputError message={form.errors.referencia_pagamento} className="mt-1" />
                        </div>}
                        <div>
                            <InputLabel htmlFor={`${id}-data`} value="Data do pagamento" />
                            <div className="relative mt-1.5"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><TextInput id={`${id}-data`} lang="pt-PT" type="date" required max={hoje} value={form.data.data_pagamento} onChange={evento => alterar("data_pagamento", evento.target.value)} className="block min-h-[42px] w-full min-w-0 rounded-lg pl-9 text-base sm:text-sm" /></div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pode seleccionar uma data anterior. Datas futuras não são permitidas.</p>
                            <InputError message={form.errors.data_pagamento} className="mt-1" />
                        </div>
                    </fieldset>
                </section>
            </div>
        </form>}
        <section className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50" aria-label="Resumo financeiro" aria-live="polite" aria-atomic="true">
            <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-xs text-slate-500 dark:text-slate-400">Valor a registar</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{montante(aplicado)}</dd></div>
                <div className="text-right"><dt className="text-xs text-slate-500 dark:text-slate-400">Saldo restante do cliente</dt><dd className={cn("mt-1 break-words text-lg font-semibold tabular-nums", saldoClienteRestante > 0 ? "text-amber-800 dark:text-amber-300" : "text-slate-900 dark:text-white")}>{montante(saldoClienteRestante)}</dd></div>
            </dl>
            {creditoAplicado > 0 && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Inclui {montante(creditoAplicado)} de crédito do cliente.</p>}
            {factura && parcial && !excedeSemCredito && !erroValor && <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300">Pagamento parcial: ficam {montante(remanescente)} em dívida nas facturas seleccionadas.</p>}
            {excesso > 0 && form.data.guardar_excesso && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Serão guardados {montante(excesso)} como crédito, além do valor aplicado à factura.</p>}
            {factura && aplicado > 0 && !parcial && !excedeSemCredito && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">O pagamento liquida as facturas seleccionadas, incluindo as multas aplicáveis.</p>}
        </section>
    </Modal>;
}
