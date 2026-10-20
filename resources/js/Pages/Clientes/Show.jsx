import { Head, Link } from "@inertiajs/react";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import StatusBadge from "@/Components/StatusBadge";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import { formatDate, formatMoney, formatNumero } from "@/lib/utils";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const estadosCliente = { ativo: ["Activo", "emerald"], inativo: ["Inactivo", "slate"], cortado: ["Cortado", "rose"] };
const estadosFactura = { paga: ["Paga", "emerald"], pendente: ["Pendente", "amber"], parcial: ["Parcial", "cyan"], anulada: ["Anulada", "slate"], transferida: ["Transferida", "slate"] };
function criarRegistos(cliente) {
    const facturaPorLeitura = new Map((cliente.facturas ?? []).filter((factura) => factura.leitura_id).map((factura) => [factura.leitura_id, factura]));

    return (cliente.leituras ?? []).map((leitura) => {
        const factura = facturaPorLeitura.get(leitura.id);
        const recibos = (factura?.pagamentos ?? []).map((pagamento) => ({
            rotulo: pagamento.numero_recibo,
            href: `/pagamentos/${pagamento.numero_recibo}/imprimir`,
            anulado: Boolean(pagamento.deleted_at),
        }));

        return {
            id: `leitura-${leitura.id}`,
            data: `${meses[leitura.mes - 1]}/${leitura.ano}`,
            dataOrdenacao: leitura.ano * 100 + leitura.mes,
            referenciaLeitura: leitura.numero_leitura ?? `LEI-${leitura.id}`,
            leituraAnterior: leitura.leitura_anterior,
            leituraActual: leitura.leitura_actual,
            leituraHref: factura ? `/facturas/${factura.numero_factura}/imprimir` : null,
            consumo: `${formatNumero(Number(leitura.leitura_actual) - Number(leitura.leitura_anterior))} m³`,
            consumoOrdenacao: Number(leitura.leitura_actual) - Number(leitura.leitura_anterior),
            valor: factura ? formatMoney(factura.total_pagar) : "—",
            valorOrdenacao: factura ? Number(factura.total_pagar) : null,
            factura: factura ? { rotulo: factura.numero_factura, href: `/facturas/${factura.numero_factura}/imprimir` } : null,
            recibos,
            estado: leitura.deleted_at ? ["Anulada", "rose"] : factura ? (estadosFactura[factura.estado] ?? [factura.estado, "slate"]) : leitura.confirmado ? ["Confirmada", "emerald"] : ["Pendente", "amber"],
        };
    });
}
export default function Show({ cliente }) {
    const [ordenacao, setOrdenacao] = useState({ campo: "dataOrdenacao", direccao: "desc" });
    const [estadoNome, estadoTom] = estadosCliente[cliente.estado] ?? [cliente.estado, "slate"];
    const pagamentos = cliente.pagamentos ?? [];
    const facturas = cliente.facturas ?? [];
    const leituras = cliente.leituras ?? [];
    const totalPago = pagamentos.filter((pagamento) => !pagamento.deleted_at).reduce((total, pagamento) => total + Number(pagamento.valor_pago), 0);

    const registos = useMemo(() => criarRegistos(cliente), [cliente]);
    const registosOrdenados = useMemo(() => [...registos].sort((a, b) => {
        const valorA = a[ordenacao.campo];
        const valorB = b[ordenacao.campo];
        if (valorA == null && valorB == null) return 0;
        if (valorA == null) return 1;
        if (valorB == null) return -1;
        return (valorA - valorB) * (ordenacao.direccao === "asc" ? 1 : -1);
    }), [registos, ordenacao]);
    const ordenarPor = (campo) => setOrdenacao((actual) => ({
        campo,
        direccao: actual.campo === campo && actual.direccao === "asc" ? "desc" : "asc",
    }));
    const tituloOrdenavel = (rotulo, campo, alinhamento = "") => (
        <button type="button" onClick={() => ordenarPor(campo)} className={`inline-flex items-center gap-1.5 font-semibold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${alinhamento}`}>
            {rotulo}
            {ordenacao.campo === campo ? (ordenacao.direccao === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />) : <span aria-hidden="true">↕</span>}
        </button>
    );

    return (
        <AdminLayout>
            <Head title={`Ficha do cliente · ${cliente.nome}`} />
            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div>
                        <Link href="/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline dark:text-cyan-300">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar aos clientes
                        </Link>
                        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Ficha do cliente</p>
                        <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{cliente.nome}</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nº de cliente: {cliente.numero_cliente}</p>
                    </div>

                    <AnimatedPanel className="p-5 sm:p-7">
                        <h2 className="mb-5 text-lg font-semibold text-foreground">Dados do cliente</h2>
                        <Campos>
                            <Campo rotulo="Telefone">{cliente.telefone}</Campo>
                            <Campo rotulo="Email">{cliente.email}</Campo>
                            <Campo rotulo="Endereço">{cliente.endereco}</Campo>
                            <Campo rotulo="Bairro / zona">{cliente.zona?.nome ?? cliente.bairro}</Campo>
                            <Campo rotulo="Tarifa">{cliente.tarifa?.nome}</Campo>
                            <Campo rotulo="Leitura inicial">{cliente.leitura_inicial != null ? formatNumero(cliente.leitura_inicial) : null}</Campo>
                            <Campo rotulo="Cliente desde">{formatDate(cliente.data_adesao ?? cliente.created_at)}</Campo>
                        </Campos>
                    </AnimatedPanel>

                    <Destaques className="sm:grid-cols-2 xl:grid-cols-4">
                        <Destaque rotulo="Dívida em aberto" tom={Number(cliente.saldo_em_aberto) > 0 ? "perigo" : "sucesso"}>{formatMoney(cliente.saldo_em_aberto)}</Destaque>
                        <Destaque rotulo="Pagamentos registados" tom="primario" sub={`${pagamentos.filter((pagamento) => !pagamento.deleted_at).length} pagamento(s)`}>{formatMoney(totalPago)}</Destaque>
                        <Destaque rotulo="Facturas" sub={`${facturas.length} no histórico`}>{facturas.length}</Destaque>
                        <Destaque rotulo="Estado"><StatusBadge tone={estadoTom}>{estadoNome}</StatusBadge></Destaque>
                    </Destaques>

                    <AnimatedPanel className="overflow-hidden">
                        <div className="border-b border-border p-5 sm:p-6">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Histórico do cliente</h2>
                                    <p className="text-sm text-muted-foreground">Cada linha representa uma leitura e reúne a factura e os recibos associados.</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{registosOrdenados.length} leitura(s)</p>
                            </div>

                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] text-left text-sm">
                                <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <tr>
                                        <th aria-sort={ordenacao.campo === "dataOrdenacao" ? (ordenacao.direccao === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3">{tituloOrdenavel("Data", "dataOrdenacao")}</th>
                                        <th className="px-4 py-3">Leitura</th>
                                        <th aria-sort={ordenacao.campo === "consumoOrdenacao" ? (ordenacao.direccao === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3">{tituloOrdenavel("Consumo", "consumoOrdenacao")}</th>
                                        <th aria-sort={ordenacao.campo === "valorOrdenacao" ? (ordenacao.direccao === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 text-right">{tituloOrdenavel("Valor", "valorOrdenacao", "ml-auto")}</th>
                                        <th className="px-4 py-3">Factura</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Recibo(s)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {registosOrdenados.length ? registosOrdenados.map((registo) => (
                                        <tr key={registo.id} className="align-top hover:bg-muted/30">
                                            <td className="whitespace-nowrap px-4 py-3">{registo.data}</td>
                                            <td className="px-4 py-3">
                                                {registo.leituraHref ? <Link href={registo.leituraHref} prefetch="hover" cacheFor="5m" cacheTags="factura" className="font-semibold text-primary hover:underline">{registo.referenciaLeitura}</Link> : <span className="font-medium">{registo.referenciaLeitura}</span>}
                                                <div className="mt-1 text-xs text-muted-foreground">{formatNumero(registo.leituraAnterior)} → {formatNumero(registo.leituraActual)}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3">{registo.consumo}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{registo.valor}</td>
                                            <td className="px-4 py-3">{registo.factura ? <Link href={registo.factura.href} prefetch="hover" cacheFor="5m" cacheTags="factura" className="font-semibold text-primary hover:underline">{registo.factura.rotulo}</Link> : <span className="text-muted-foreground">—</span>}</td>
                                            <td className="px-4 py-3"><StatusBadge tone={registo.estado[1]}>{registo.estado[0]}</StatusBadge></td>
                                            <td className="px-4 py-3">{registo.recibos.length ? <div className="flex max-w-xs flex-wrap gap-1.5">{registo.recibos.map((recibo) => <Link key={recibo.rotulo} href={recibo.href} prefetch="hover" cacheFor="5m" cacheTags="recibo" className={`rounded-md px-2 py-1 text-xs font-semibold hover:underline ${recibo.anulado ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-950 dark:text-rose-300" : "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"}`}>{recibo.rotulo}</Link>)}</div> : <span className="text-muted-foreground">—</span>}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Ainda não há leituras registadas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </AnimatedPanel>
                </div>
            </div>
        </AdminLayout>
    );
}
