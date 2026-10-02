import { useForm } from "@inertiajs/react";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import ListaPesquisavel from "@/Components/ListaPesquisavel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import TextInput from "@/Components/TextInput";
import { cn, formatMoney } from "@/lib/utils";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Em centavos para as somas e a repartição não acumularem erros de vírgula flutuante.
const centavos = (valor) => Math.round((Number(valor) || 0) * 100);
const emFaltaCentavos = (factura) => centavos(factura.em_falta ?? factura.total_pagar);
const paraValor = (cents) => (cents / 100).toFixed(2);

// Mais antiga primeiro — é a que o cliente deve há mais tempo.
const maisAntigaPrimeiro = (a, b) => a.ano - b.ano || a.mes - b.mes || a.id - b.id;

/**
 * Pagamento de várias facturas do mesmo cliente de uma só vez.
 *
 * Fluxo: 1) escolher o cliente; 2) marcar 2 ou mais das suas facturas em
 * aberto; 3) o valor recebido reparte-se pela mais antiga primeiro (ou fica
 * cada factura paga por inteiro, se não se indicar valor) e cada parcela pode
 * ser ajustada à mão; 4) ao confirmar, cada factura recebe o seu pagamento e
 * recibo — todos ligados ao mesmo lote — e os recibos abrem juntos.
 */
const dataLocal = (deslocamentoDias = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - deslocamentoDias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function PagamentoMultiplo({ show, onClose, facturasEmAberto, metodos, diasRetroactivos = 7 }) {
    const [clienteId, setClienteId] = useState("");
    const [escolhidas, setEscolhidas] = useState([]);
    const [valores, setValores] = useState({});
    const [totalRecebido, setTotalRecebido] = useState("");
    const form = useForm({ metodo_pagamento: "dinheiro", referencia_pagamento: "", data_pagamento: "", parcelas: [] });

    // Só clientes com facturas em aberto aparecem; "Cliente removido" não recebe.
    const clientes = useMemo(() => {
        const mapa = new Map();
        facturasEmAberto.forEach((factura) => {
            if (!factura.cliente) return;
            const actual = mapa.get(factura.cliente_id) ?? { id: factura.cliente_id, nome: factura.cliente.nome, quantidade: 0, total: 0 };
            actual.quantidade += 1;
            actual.total += emFaltaCentavos(factura);
            mapa.set(factura.cliente_id, actual);
        });
        return [...mapa.values()];
    }, [facturasEmAberto]);

    const facturasDoCliente = useMemo(
        () => facturasEmAberto.filter((f) => String(f.cliente_id) === String(clienteId)).sort(maisAntigaPrimeiro),
        [facturasEmAberto, clienteId],
    );

    const reiniciar = () => {
        setClienteId("");
        setEscolhidas([]);
        setValores({});
        setTotalRecebido("");
        form.reset();
        form.clearErrors();
    };

    const fechar = () => {
        reiniciar();
        onClose();
    };

    // Reparte `total` (centavos) pelas facturas escolhidas, da mais antiga para a mais recente.
    const repartir = (ids, total) => {
        const proximos = {};
        let restante = total;
        facturasDoCliente
            .filter((f) => ids.includes(f.id))
            .forEach((factura) => {
                const parte = Math.min(restante, emFaltaCentavos(factura));
                proximos[factura.id] = parte > 0 ? paraValor(parte) : "";
                restante -= parte;
            });
        return proximos;
    };

    const recalcular = (ids, total) => {
        const alvo = total === "" ? ids.reduce((soma, id) => soma + emFaltaCentavos(facturasDoCliente.find((f) => f.id === id)), 0) : centavos(total);
        setValores(repartir(ids, alvo));
    };

    const alternar = (id) => {
        const proximas = escolhidas.includes(id) ? escolhidas.filter((x) => x !== id) : [...escolhidas, id];
        setEscolhidas(proximas);
        recalcular(proximas, totalRecebido);
    };

    const escolherTodas = () => {
        const todas = escolhidas.length === facturasDoCliente.length ? [] : facturasDoCliente.map((f) => f.id);
        setEscolhidas(todas);
        recalcular(todas, totalRecebido);
    };

    const mudarTotal = (valor) => {
        setTotalRecebido(valor);
        recalcular(escolhidas, valor);
    };

    // Ajuste manual de uma parcela: o total recebido passa a ser a soma das parcelas.
    const mudarParcela = (id, valor) => {
        const proximos = { ...valores, [id]: valor };
        setValores(proximos);
        setTotalRecebido(paraValor(escolhidas.reduce((soma, x) => soma + centavos(proximos[x]), 0)));
    };

    const somaParcelas = escolhidas.reduce((soma, id) => soma + centavos(valores[id]), 0);
    const somaEmFalta = escolhidas.reduce((soma, id) => soma + emFaltaCentavos(facturasDoCliente.find((f) => f.id === id)), 0);
    const excedeTotal = totalRecebido !== "" && centavos(totalRecebido) > somaEmFalta;
    const parcelaInvalida = escolhidas.some((id) => {
        const v = centavos(valores[id]);
        return v <= 0 || v > emFaltaCentavos(facturasDoCliente.find((f) => f.id === id));
    });
    const podeConfirmar = escolhidas.length >= 2 && !parcelaInvalida && somaParcelas > 0;

    const submit = (evento) => {
        evento.preventDefault();
        if (!podeConfirmar) return;

        form.transform((dados) => ({
            ...dados,
            parcelas: escolhidas.map((id) => ({ factura_id: id, valor_pago: valores[id] })),
        }));
        form.post("/pagamentos/multiplo", { onSuccess: fechar });
    };

    const erroParcelas = form.errors.parcelas ?? Object.entries(form.errors).find(([chave]) => chave.startsWith("parcelas."))?.[1];

    return (
        <Modal show={show} onClose={fechar} title="Pagar várias facturas" maxWidth="2xl">
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel value="1. Cliente" />
                    <div className="mt-1">
                        <ListaPesquisavel
                            itens={clientes}
                            valorSeleccionado={clienteId}
                            onSeleccionar={(cliente) => {
                                setClienteId(cliente.id);
                                setEscolhidas([]);
                                setValores({});
                                setTotalRecebido("");
                            }}
                            obterId={(cliente) => cliente.id}
                            obterOrdenacao={(cliente) => cliente.nome}
                            obterTexto={(cliente) => cliente.nome}
                            placeholder="Pesquisar cliente..."
                            vazioTexto="Nenhum cliente com facturas em aberto."
                            renderItem={(cliente) => (
                                <>
                                    <p className="truncate font-medium text-slate-900 dark:text-white">{cliente.nome}</p>
                                    <div className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                                        <p className="font-semibold text-slate-900 dark:text-white">{formatMoney(cliente.total / 100)}</p>
                                        <p>{cliente.quantidade} factura(s) em aberto</p>
                                    </div>
                                </>
                            )}
                        />
                    </div>
                </div>

                {clienteId !== "" && (
                    <div>
                        <div className="flex items-center justify-between">
                            <InputLabel value="2. Facturas a pagar (mínimo 2)" />
                            {facturasDoCliente.length > 2 && (
                                <button
                                    type="button"
                                    onClick={escolherTodas}
                                    className="text-xs font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
                                >
                                    {escolhidas.length === facturasDoCliente.length ? "Limpar" : "Escolher todas"}
                                </button>
                            )}
                        </div>
                        <ul className="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                            {facturasDoCliente.map((factura) => {
                                const marcada = escolhidas.includes(factura.id);
                                return (
                                    <li key={factura.id} className={cn("flex flex-wrap items-center gap-3 px-3 py-2.5", marcada && "bg-cyan-50/60 dark:bg-cyan-950/20")}>
                                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={marcada}
                                                onChange={() => alternar(factura.id)}
                                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                                                    {factura.numero_factura} · {meses[factura.mes - 1]}/{factura.ano}
                                                </span>
                                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                                    Em falta {formatMoney(factura.em_falta ?? factura.total_pagar)}
                                                </span>
                                            </span>
                                            <StatusBadge tone={factura.estado === "parcial" ? "cyan" : "amber"}>
                                                {factura.estado === "parcial" ? "Parcial" : "Pendente"}
                                            </StatusBadge>
                                        </label>
                                        {marcada && (
                                            <div className="w-36">
                                                <label className="sr-only" htmlFor={`parcela-${factura.id}`}>
                                                    Valor a pagar da factura {factura.numero_factura}
                                                </label>
                                                <TextInput
                                                    id={`parcela-${factura.id}`}
                                                    type="number"
                                                    min="0.01"
                                                    max={paraValor(emFaltaCentavos(factura))}
                                                    step="0.01"
                                                    value={valores[factura.id] ?? ""}
                                                    onChange={(evento) => mudarParcela(factura.id, evento.target.value)}
                                                    className="block w-full text-right"
                                                />
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {escolhidas.length >= 2 && (
                    <div>
                        <InputLabel htmlFor="total_recebido" value="3. Valor recebido do cliente" />
                        <TextInput
                            id="total_recebido"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder={`Vazio = pagar tudo (${formatMoney(somaEmFalta / 100)})`}
                            value={totalRecebido}
                            onChange={(evento) => mudarTotal(evento.target.value)}
                            className="mt-1 block w-full"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Se pagar menos do que o total, o valor vai primeiro para a factura mais antiga e o resto fica em
                            aberto. Pode ajustar cada parcela acima.
                        </p>
                        {excedeTotal && (
                            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                O valor excede o que o cliente deve nestas facturas — só {formatMoney(somaParcelas / 100)} será registado.
                            </p>
                        )}
                    </div>
                )}

                {escolhidas.length >= 2 && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="metodo_multiplo" value="Método de pagamento" />
                                <select
                                    id="metodo_multiplo"
                                    value={form.data.metodo_pagamento}
                                    onChange={(evento) => form.setData("metodo_pagamento", evento.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 sm:text-sm shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                    {Object.entries(metodos).map(([valor, { label }]) => (
                                        <option key={valor} value={valor}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="referencia_multiplo" value="Referência (opcional)" />
                                <TextInput
                                    id="referencia_multiplo"
                                    value={form.data.referencia_pagamento}
                                    onChange={(evento) => form.setData("referencia_pagamento", evento.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="Ex: MP-88213"
                                />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="data_multiplo" value="Data do pagamento" />
                            <TextInput
                                id="data_multiplo"
                                type="date"
                                value={form.data.data_pagamento || dataLocal()}
                                min={dataLocal(diasRetroactivos)}
                                max={dataLocal()}
                                onChange={(evento) => form.setData("data_pagamento", evento.target.value)}
                                className="mt-1 block w-full sm:w-56"
                            />
                            <InputError message={form.errors.data_pagamento} className="mt-1" />
                        </div>

                        <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-900">
                            <p className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">{escolhidas.length} recibos serão emitidos</span>
                                <span className="font-bold text-slate-950 dark:text-white">{formatMoney(somaParcelas / 100)}</span>
                            </p>
                        </div>
                    </>
                )}

                <InputError message={erroParcelas} />

                <div className="flex justify-end gap-3 pt-2">
                    <SecondaryButton type="button" onClick={fechar}>
                        Cancelar
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={form.processing || !podeConfirmar}>
                        <Layers className="h-4 w-4" aria-hidden="true" />
                        Registar {escolhidas.length >= 2 ? `${escolhidas.length} pagamentos` : "pagamentos"}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
