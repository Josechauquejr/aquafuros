import { Link, useForm } from "@inertiajs/react";
import { CalendarDays, Receipt, Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import AnimatedPanel from "@/Components/AnimatedPanel";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { filtrarDifuso } from "@/lib/busca";
import { formatDate, formatNumero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { centavosPagamento as centavos, distribuirPagamento, multaFacturaCentavos as multaDe, ordenarFacturasPagamento, pagoFacturaCentavos as pagoDe, principalFacturaCentavos as principalDe, saldoFacturaCentavos as saldoDe } from "@/lib/pagamento";

const montante = (valor) => `${formatNumero(valor / 100)} MT`;
const paraInput = (valor) => (valor / 100).toFixed(2);
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ORDEM_METODOS = ["dinheiro", "mpesa", "e-mola", "banco"];
const hojeLocal = () => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
};

function diasDeAtraso(factura, hoje) {
    if (!factura.data_vencimento) return 0;
    const vence = new Date(String(factura.data_vencimento).slice(0, 10) + "T00:00:00");
    const dia = new Date(hoje + "T00:00:00");
    return Math.floor((dia - vence) / 86400000);
}

function EstadoDaFactura({ factura, hoje }) {
    const dias = diasDeAtraso(factura, hoje);
    if (dias > 0) return <StatusBadge tone={dias > 30 ? "rose" : "amber"}>Vencida há {dias} {dias === 1 ? "dia" : "dias"}</StatusBadge>;
    if (pagoDe(factura) > 0) return <StatusBadge tone="cyan">Parcial</StatusBadge>;
    return <StatusBadge tone="slate">Vence a {formatDate(factura.data_vencimento)}</StatusBadge>;
}

/**
 * Caixa › Receber: "Quem vai pagar?". Escolhe o cliente, marca as facturas
 * (as em aberto já vêm marcadas), escolhe o método e emite o recibo — sem
 * janela nem passo de revisão. Facturas, multa e total no mesmo bloco
 * (Gestalt da região comum); a referência é obrigatória fora do dinheiro.
 */
export default function RegistarPagamento({ facturasEmAberto, creditos = {}, metodos, facturaInicial = "", clienteInicial = "", dataActual }) {
    const id = useId();
    const hoje = dataActual || hojeLocal();
    const inicial = facturasEmAberto.find((factura) => String(factura.id) === String(facturaInicial));

    const clientes = useMemo(() => {
        const mapa = new Map();
        for (const factura of facturasEmAberto) {
            if (!factura.cliente) continue;
            const cliente = mapa.get(String(factura.cliente_id)) ?? { ...factura.cliente, id: factura.cliente_id, facturas: [], saldo: 0 };
            cliente.facturas.push(factura);
            cliente.saldo += saldoDe(factura);
            mapa.set(String(cliente.id), cliente);
        }
        return [...mapa.values()]
            .map((cliente) => ({ ...cliente, facturas: cliente.facturas.sort(ordenarFacturasPagamento) }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    }, [facturasEmAberto]);

    const clienteDe = (idCliente) => clientes.find((item) => String(item.id) === String(idCliente));
    const idInicial = inicial?.cliente_id ?? clienteInicial;
    const marcadasDe = (cliente) => (cliente ? cliente.facturas.map((f) => f.id) : []);

    const [clienteId, setClienteId] = useState(idInicial);
    const [seleccionadas, setSeleccionadas] = useState(() => (inicial ? [inicial.id] : marcadasDe(clienteDe(idInicial))));
    const [pesquisa, setPesquisa] = useState("");
    const [mudarData, setMudarData] = useState(false);
    const [erroOperacao, setErroOperacao] = useState("");

    const saldoDasMarcadas = (cliente, ids) => (cliente?.facturas ?? []).filter((f) => ids.includes(f.id)).reduce((soma, f) => soma + saldoDe(f), 0);
    const form = useForm({
        valor_pago: (() => {
            const total = saldoDasMarcadas(clienteDe(idInicial), inicial ? [inicial.id] : marcadasDe(clienteDe(idInicial)));
            return total > 0 ? paraInput(total) : "";
        })(),
        metodo_pagamento: "dinheiro",
        referencia_pagamento: "",
        data_pagamento: hoje,
        usar_credito: false,
        guardar_excesso: true,
    });

    const cliente = clienteDe(clienteId);
    const clientesVisiveis = useMemo(
        () => filtrarDifuso(clientes, pesquisa, (item) => `${item.nome} ${item.numero_cliente ?? ""} ${item.facturas.map((f) => f.numero_factura).join(" ")}`),
        [clientes, pesquisa],
    );
    const facturasSeleccionadas = (cliente?.facturas ?? []).filter((factura) => seleccionadas.includes(factura.id));
    const saldo = facturasSeleccionadas.reduce((soma, item) => soma + saldoDe(item), 0);
    const creditoDisponivel = cliente ? centavos(creditos[cliente.id] ?? 0) : 0;
    const creditoAplicado = form.data.usar_credito ? Math.min(creditoDisponivel, saldo) : 0;
    const limiteRecebido = Math.max(0, saldo - creditoAplicado);
    const recebido = centavos(form.data.valor_pago);
    const excesso = Math.max(0, recebido - limiteRecebido);
    const aplicacoes = distribuirPagamento(facturasSeleccionadas, recebido, creditoAplicado);
    const aplicado = aplicacoes.reduce((soma, item) => soma + item.total, 0);
    const remanescente = Math.max(0, saldo - aplicado);
    const parcial = aplicado > 0 && aplicado < saldo;
    const precisaReferencia = form.data.metodo_pagamento !== "dinheiro";
    const valorNumerico = Number(form.data.valor_pago);
    const valorValido =
        form.data.valor_pago !== "" && Number.isFinite(valorNumerico) && valorNumerico >= 0 && Math.abs(valorNumerico * 100 - recebido) < 0.0001 && (recebido > 0 || creditoAplicado > 0);
    const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(form.data.data_pagamento) && form.data.data_pagamento <= hoje;
    const erroValor =
        form.data.valor_pago !== "" && !valorValido
            ? valorNumerico < 0 || (recebido === 0 && creditoAplicado === 0)
                ? "Indique um valor superior a zero."
                : "Indique um valor válido, com até duas casas decimais."
            : "";
    const faltaReferencia = precisaReferencia && !form.data.referencia_pagamento.trim();
    const podeEmitir =
        facturasSeleccionadas.length > 0 &&
        valorValido &&
        dataValida &&
        !faltaReferencia &&
        (excesso === 0 || form.data.guardar_excesso) &&
        Boolean(metodos[form.data.metodo_pagamento]) &&
        !form.processing;

    const alterar = (chave, valor) => {
        form.setData(chave, valor);
        form.clearErrors(chave, ...(chave === "valor_pago" ? ["parcelas"] : []));
        setErroOperacao("");
    };

    const reporValor = (ids, opcoes = form.data, clienteAlvo = cliente) => {
        const novoSaldo = saldoDasMarcadas(clienteAlvo, ids);
        const credito = opcoes.usar_credito ? Math.min(clienteAlvo ? centavos(creditos[clienteAlvo.id] ?? 0) : 0, novoSaldo) : 0;
        return ids.length ? paraInput(Math.max(0, novoSaldo - credito)) : "";
    };

    const seleccionarCliente = (item) => {
        const ids = marcadasDe(item);
        setClienteId(item.id);
        setSeleccionadas(ids);
        setPesquisa("");
        form.setData((dados) => ({ ...dados, usar_credito: false, valor_pago: reporValor(ids, { ...dados, usar_credito: false }, item) }));
        form.clearErrors();
        setErroOperacao("");
    };

    const trocarCliente = () => {
        setClienteId("");
        setSeleccionadas([]);
        form.setData((dados) => ({ ...dados, valor_pago: "", usar_credito: false }));
    };

    const alterarSeleccao = (ids) => {
        setSeleccionadas(ids);
        form.setData((dados) => ({ ...dados, valor_pago: reporValor(ids, dados) }));
        form.clearErrors();
    };

    const emitir = (evento) => {
        evento.preventDefault();
        if (!podeEmitir) return;
        const parcelas = aplicacoes.filter((item) => item.total > 0).map((item) => ({ factura_id: item.factura.id, valor_pago: paraInput(item.total) }));
        const multiplo = parcelas.length > 1;
        form.transform((dados) => (multiplo ? { ...dados, valor_recebido: dados.valor_pago, parcelas } : { ...dados, factura_id: parcelas[0].factura_id }));
        form.post(multiplo ? "/pagamentos/multiplo" : "/pagamentos", {
            preserveScroll: true,
            onSuccess: (page) => {
                if (page.props.flash?.error) setErroOperacao(page.props.flash.error);
            },
        });
    };

    const erroParcelas = Object.entries(form.errors).find(([chave]) => chave.startsWith("parcelas"))?.[1];
    const metodosOrdenados = Object.entries(metodos).sort(([a], [b]) => ORDEM_METODOS.indexOf(a) - ORDEM_METODOS.indexOf(b));

    return (
        <div className="flex min-w-0 flex-col gap-4">
            <label className="flex min-h-[52px] items-center gap-3 rounded-md border border-[#DDE2EE] bg-white px-4 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span className="sr-only">Quem vai pagar?</span>
                <input
                    id={`${id}-pesquisa`}
                    type="search"
                    value={pesquisa}
                    onChange={(evento) => setPesquisa(evento.target.value)}
                    placeholder={cliente ? "Procurar outro cliente" : "Quem vai pagar? Nome, nº de cliente ou nº de factura"}
                    aria-label="Procurar cliente ou factura"
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink placeholder:text-slate-500 focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB] dark:placeholder:text-slate-400"
                />
            </label>

            {(!cliente || pesquisa.trim()) && (
                <AnimatedPanel className="overflow-hidden">
                    {clientesVisiveis.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            {clientes.length === 0 ? "Não há facturas em aberto. Ninguém tem nada para pagar." : "Nenhum cliente com dívida encontrado."}
                        </p>
                    ) : (
                        <ul className="max-h-[420px] divide-y divide-[#EEF1F7] overflow-y-auto dark:divide-slate-800" aria-label="Clientes com facturas em aberto">
                            {clientesVisiveis.slice(0, 40).map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => seleccionarCliente(item)}
                                        className="flex min-h-[56px] w-full flex-wrap items-center justify-between gap-2 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                                    >
                                        <span className="flex flex-col">
                                            <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">{item.nome}</strong>
                                            <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                                {item.numero_cliente} · {item.facturas.length} {item.facturas.length === 1 ? "factura" : "facturas"} em aberto
                                            </span>
                                        </span>
                                        <strong className="tabular-nums text-ink dark:text-[#F2F5FB]">{montante(item.saldo)}</strong>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </AnimatedPanel>
            )}

            {cliente && !pesquisa.trim() && (
                <AnimatedPanel className="overflow-hidden">
                    <form onSubmit={emitir}>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                            <div className="flex flex-col">
                                <strong className="text-lg text-ink dark:text-[#F2F5FB]">{cliente.nome}</strong>
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    {cliente.numero_cliente} · crédito disponível {montante(creditoDisponivel)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href={`/clientes/${cliente.numero_cliente}`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    Abrir ficha
                                </Link>
                                <button
                                    type="button"
                                    onClick={trocarCliente}
                                    aria-label="Escolher outro cliente"
                                    className="flex h-9 w-9 items-center justify-center rounded-[9px] text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.06]"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </div>

                        {erroOperacao && (
                            <p role="alert" className="mx-6 mt-4 rounded-md bg-rose-100 p-3 text-sm text-rose-700 dark:bg-[rgba(244,163,154,0.14)] dark:text-rose-300">
                                {erroOperacao}
                            </p>
                        )}

                        <div className="flex flex-col gap-3 border-b border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">FACTURAS EM ABERTO</span>
                                {cliente.facturas.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => alterarSeleccao(facturasSeleccionadas.length === cliente.facturas.length ? [] : marcadasDe(cliente))}
                                        className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400"
                                    >
                                        {facturasSeleccionadas.length === cliente.facturas.length ? "Desmarcar todas" : "Marcar todas"}
                                    </button>
                                )}
                            </div>
                            {cliente.facturas.map((item) => {
                                const marcada = seleccionadas.includes(item.id);
                                const multa = multaDe(item);
                                return (
                                    <label
                                        key={item.id}
                                        className={cn(
                                            "flex cursor-pointer items-start gap-3 rounded-[14px] border p-4 transition-colors",
                                            marcada
                                                ? "border-[#B9CCFF] bg-[#F7F9FF] dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(0,89,255,0.10)]"
                                                : "border-[#E3E8F2] dark:border-slate-800",
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={marcada}
                                            onChange={() => alterarSeleccao(marcada ? seleccionadas.filter((valor) => valor !== item.id) : [...seleccionadas, item.id])}
                                            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded"
                                        />
                                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">
                                                    {item.numero_factura} · {meses[item.mes - 1]}
                                                </strong>
                                                <EstadoDaFactura factura={item} hoje={hoje} />
                                            </div>
                                            <div className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                <span>{multa > 0 ? "1.º " : ""}Principal{pagoDe(item) > 0 ? " (o que falta)" : ""}</span>
                                                <span className="tabular-nums">{montante(principalDe(item))}</span>
                                            </div>
                                            {multa > 0 && (
                                                <div className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                    <span>2.º Multa por atraso</span>
                                                    <span className="tabular-nums">{montante(multa)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">O pagamento cobre primeiro o principal e depois a multa, da factura mais antiga para a mais recente.</span>
                            <InputError message={form.errors.factura_id || erroParcelas} />
                        </div>

                        <fieldset disabled={facturasSeleccionadas.length === 0 || form.processing} className="flex flex-col gap-4 px-6 py-5 disabled:opacity-60">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="text-base text-slate-600 dark:text-slate-300">Total a pagar</span>
                                <strong className="text-[30px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{montante(saldo)}</strong>
                            </div>

                            <div role="radiogroup" aria-label="Método de pagamento" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {metodosOrdenados.map(([chave, { label, icon: Icone }]) => {
                                    const on = form.data.metodo_pagamento === chave;
                                    return (
                                        <button
                                            key={chave}
                                            type="button"
                                            role="radio"
                                            aria-checked={on}
                                            onClick={() => {
                                                form.setData((dados) => ({ ...dados, metodo_pagamento: chave, referencia_pagamento: "" }));
                                                form.clearErrors("metodo_pagamento", "referencia_pagamento");
                                            }}
                                            className={cn(
                                                "flex min-h-[48px] items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold transition-colors",
                                                on
                                                    ? "border-brand bg-brand text-white dark:border-cyan-500 dark:bg-cyan-500"
                                                    : "border-[#DDE2EE] bg-white text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB] dark:hover:bg-[#262C38]",
                                            )}
                                        >
                                            {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={form.errors.metodo_pagamento} />

                            {precisaReferencia && (
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">
                                        Referência da transacção {metodos[form.data.metodo_pagamento]?.label} <span className="text-rose-600 dark:text-rose-300">*</span>
                                    </span>
                                    <input
                                        type="text"
                                        value={form.data.referencia_pagamento}
                                        maxLength={255}
                                        onChange={(evento) => alterar("referencia_pagamento", evento.target.value)}
                                        placeholder="Ex.: o código da mensagem de confirmação"
                                        required
                                        className="min-h-[44px] rounded-md border-[#DDE2EE] text-[15px] dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                    />
                                    <InputError message={form.errors.referencia_pagamento} />
                                </label>
                            )}

                            {creditoDisponivel > 0 && (
                                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={form.data.usar_credito}
                                        onChange={(evento) => {
                                            const opcoes = { ...form.data, usar_credito: evento.target.checked };
                                            form.setData({ ...opcoes, valor_pago: reporValor(seleccionadas, opcoes) });
                                        }}
                                        className="mt-0.5 h-4 w-4 rounded"
                                    />
                                    <span>
                                        Usar o crédito do cliente (<strong>{montante(creditoDisponivel)}</strong>) antes do dinheiro.
                                    </span>
                                </label>
                            )}

                            <div className="flex flex-wrap items-end gap-3">
                                <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-ink dark:text-[#F2F5FB]">Valor recebido</span>
                                    <span className="flex min-h-[48px] items-center rounded-md border border-[#DDE2EE] bg-white pr-3.5 focus-within:border-cyan-500 focus-within:shadow-[0_0_0_4px_rgba(0,89,255,0.18)] dark:border-slate-800 dark:bg-[#1E232D]">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            min="0"
                                            step="0.01"
                                            value={form.data.valor_pago}
                                            onChange={(evento) => alterar("valor_pago", evento.target.value)}
                                            aria-label="Valor recebido, em meticais"
                                            aria-invalid={Boolean(erroValor || form.errors.valor_pago)}
                                            className="min-w-0 flex-1 border-0 bg-transparent text-right text-lg font-bold tabular-nums text-ink focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-[#F2F5FB]"
                                        />
                                        <span className="text-sm font-semibold text-slate-500">MT</span>
                                    </span>
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400">Total em dívida: {montante(cliente.saldo)}</span>
                                </label>
                                <PrimaryButton type="submit" disabled={!podeEmitir} className="min-h-[48px] px-6">
                                    <Receipt className="h-[18px] w-[18px]" aria-hidden="true" />
                                    {form.processing ? "A emitir…" : "Emitir recibo"}
                                </PrimaryButton>
                            </div>

                            <div aria-live="polite" className="flex flex-col gap-1 text-[13px]">
                                {erroValor && <p className="text-rose-700 dark:text-rose-300">{erroValor}</p>}
                                {!erroValor && parcial && (
                                    <p className="text-amber-700 dark:text-amber-300">Pagamento parcial: ficam {montante(remanescente)} em dívida nestas facturas.</p>
                                )}
                                {excesso > 0 ? (
                                    <label className="flex cursor-pointer items-start gap-2 text-slate-600 dark:text-slate-300">
                                        <input type="checkbox" checked={form.data.guardar_excesso} onChange={(evento) => alterar("guardar_excesso", evento.target.checked)} className="mt-0.5 h-4 w-4 rounded" />
                                        <span>
                                            Guardar os <strong>{montante(excesso)}</strong> a mais como crédito do cliente.
                                        </span>
                                    </label>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400">Se receber a mais, o excesso fica como crédito do cliente.</p>
                                )}
                                {faltaReferencia && <p className="text-slate-500 dark:text-slate-400">Escreva a referência para poder emitir o recibo.</p>}
                                <InputError message={form.errors.valor_pago} />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                                {mudarData ? (
                                    <input
                                        type="date"
                                        lang="pt-PT"
                                        max={hoje}
                                        value={form.data.data_pagamento}
                                        onChange={(evento) => alterar("data_pagamento", evento.target.value)}
                                        aria-label="Data do pagamento"
                                        className="min-h-[36px] rounded-[9px] border-[#DDE2EE] py-1 text-sm dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                                    />
                                ) : (
                                    <>
                                        Data do pagamento: {form.data.data_pagamento === hoje ? "hoje" : formatDate(`${form.data.data_pagamento}T12:00:00`)}
                                        <button type="button" onClick={() => setMudarData(true)} className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                            alterar
                                        </button>
                                    </>
                                )}
                                <InputError message={form.errors.data_pagamento} />
                            </div>
                        </fieldset>
                    </form>
                </AnimatedPanel>
            )}
        </div>
    );
}
