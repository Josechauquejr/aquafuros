import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Droplets } from "lucide-react";
import { useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import StatusBadge from "@/Components/StatusBadge";
import { Campo, Campos, Destaque, Destaques } from "@/Components/DataTable/Detalhe";
import { formatDate, formatMoney, formatNumero } from "@/lib/utils";
import AnimatedButton from "@/Components/AnimatedButton";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";
import { previewPost } from "@/lib/previewPost";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const estadosCliente = { ativo: ["Activo", "emerald"], inativo: ["Inactivo", "slate"], cortado: ["Cortado", "rose"] };
const estadosFactura = { paga: ["Paga", "emerald"], pendente: ["Pendente", "amber"], parcial: ["Parcial", "cyan"], anulada: ["Anulada", "slate"], transferida: ["Transferida", "slate"] };
function criarRegistos(cliente) {
    const facturaPorLeitura = new Map((cliente.facturas ?? []).filter((factura) => factura.leitura_id).map((factura) => [factura.leitura_id, factura]));

    const mensais = (cliente.leituras ?? []).map((leitura) => {
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
    const abertura = cliente.leitura_inicial == null ? [] : [{
        id: "leitura-inicial", abertura: true, data: "Abertura", dataOrdenacao: 0,
        referenciaLeitura: "Abertura do contador", leituraAnterior: null,
        leituraActual: cliente.leitura_inicial, leituraHref: null, consumo: "—",
        consumoOrdenacao: null, valor: "—", valorOrdenacao: null, factura: null,
        recibos: [], estado: ["Não faturável", "slate"],
    }];
    return [...abertura, ...mensais];
}
export default function Show({ cliente, zonas = [], tarifas = [] }) {
    const { auth } = usePage().props;
    const ehAdministrador = auth.roles?.includes("administrador");
    const [editar, setEditar] = useState(false);
    const [previewInicial, setPreviewInicial] = useState(null);
    const [motivoInicial, setMotivoInicial] = useState("");
    const form = useForm({ nome: "", endereco: "", zona_id: "", telefone: "", email: "", tarifa_id: "", estado: "ativo", leitura_inicial: "" });
    const [ordenacao, setOrdenacao] = useState({ campo: "dataOrdenacao", direccao: "desc" });
    const [estadoNome, estadoTom] = estadosCliente[cliente.estado] ?? [cliente.estado, "slate"];
    const pagamentos = cliente.pagamentos ?? [];
    const facturas = cliente.facturas ?? [];
    const leituras = cliente.leituras ?? [];
    const totalPago = pagamentos.filter((pagamento) => !pagamento.deleted_at).reduce((total, pagamento) => total + Number(pagamento.valor_pago), 0);
    const resumo = cliente.resumo_consumo ?? { total: 0, quantidade: 0, primeira: null, evolucao: [] };
    const maxConsumo = Math.max(1, ...(resumo.evolucao ?? []).map((item) => Number(item.consumo)));

    const abrirEdicao = () => {
        form.setData({ nome: cliente.nome ?? "", endereco: cliente.endereco ?? "", zona_id: cliente.zona_id ?? "", telefone: cliente.telefone ?? "", email: cliente.email ?? "", tarifa_id: cliente.tarifa_id ?? "", estado: cliente.estado ?? "ativo", leitura_inicial: cliente.leitura_inicial ?? 0 });
        form.clearErrors();
        setEditar(true);
    };
    const guardarEdicao = async (event) => {
        event.preventDefault();
        if (ehAdministrador && Number(form.data.leitura_inicial) !== Number(cliente.leitura_inicial ?? 0)) {
            try {
                const plano = await previewPost(`/clientes/${cliente.numero_cliente}/previsualizar-leitura-inicial`, { leitura_inicial: form.data.leitura_inicial });
                setPreviewInicial(plano);
                setMotivoInicial("");
            } catch (error) {
                form.setError("leitura_inicial", error.message);
            }
            return;
        }
        form.put(`/clientes/${cliente.numero_cliente}`, { preserveScroll: true, onSuccess: () => setEditar(false) });
    };
    const confirmarLeituraInicial = () => {
        if (!previewInicial?.pode_aplicar || motivoInicial.trim().length < 5) return;
        form.transform((data) => ({ ...data, confirmar_leitura_inicial: true, motivo_leitura_inicial: motivoInicial }))
            .put(`/clientes/${cliente.numero_cliente}`, {
                preserveScroll: true,
                onSuccess: () => { setPreviewInicial(null); setEditar(false); },
                onFinish: () => form.transform((data) => data),
            });
    };

    const registos = useMemo(() => criarRegistos(cliente), [cliente]);
    const registosOrdenados = useMemo(() => [...registos].sort((a, b) => {
        if (a.abertura) return -1;
        if (b.abertura) return 1;
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h1 className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{cliente.nome}</h1>
                            <AnimatedButton variant="secondary" onClick={abrirEdicao}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar dados</AnimatedButton>
                        </div>
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

                    <AnimatedPanel className="p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><h2 className="text-lg font-semibold text-foreground">Evolução do consumo</h2><p className="text-sm text-muted-foreground">Consumo acumulado e leituras mensais registadas.</p></div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"><Droplets className="h-4 w-4" aria-hidden="true" /> {formatNumero(resumo.total)} m³ no total</span>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-border p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primeira leitura registada</p>
                                {resumo.primeira ? <><p className="mt-2 text-xl font-bold text-foreground">{formatNumero(resumo.primeira.leitura_actual)} m³</p><p className="mt-1 text-sm text-muted-foreground">{String(resumo.primeira.mes).padStart(2, "0")}/{resumo.primeira.ano} · primeiro consumo: {formatNumero(resumo.primeira.consumo)} m³</p><p className="mt-1 text-xs text-muted-foreground">Contador: {formatNumero(resumo.primeira.leitura_anterior)} → {formatNumero(resumo.primeira.leitura_actual)}</p></> : <p className="mt-2 text-sm text-muted-foreground">Ainda não há leituras registadas.</p>}
                            </div>
                            <div className="rounded-lg border border-border p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimas leituras · m³</p>
                                {resumo.evolucao?.length ? <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label="Gráfico da evolução mensal do consumo">
                                    {resumo.evolucao.map((item) => { const valor = Number(item.consumo); const altura = Math.max(6, (valor / maxConsumo) * 100); return <div key={`${item.ano}-${item.mes}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${String(item.mes).padStart(2, "0")}/${item.ano}: ${formatNumero(valor)} m³`}><div className="w-full max-w-8 rounded-t bg-cyan-600 dark:bg-cyan-400" style={{ height: `${altura}%` }} /><span className="text-[10px] text-muted-foreground">{String(item.mes).padStart(2, "0")}/{String(item.ano).slice(-2)}</span></div>; })}
                                </div> : <p className="mt-2 text-sm text-muted-foreground">Sem dados para mostrar.</p>}
                                <p className="mt-2 text-xs text-muted-foreground">{resumo.quantidade} leitura(s) consideradas; anuladas excluídas.</p>
                            </div>
                        </div>
                    </AnimatedPanel>

                    <AnimatedPanel className="overflow-hidden">
                        <div className="border-b border-border p-5 sm:p-6">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Histórico do cliente</h2>
                                    <p className="text-sm text-muted-foreground">A abertura do contador aparece separada; as linhas mensais mostram consumo, factura e recibos.</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{registosOrdenados.length} registo(s): {cliente.leitura_inicial != null ? "1 abertura" : "nenhuma abertura"} e {leituras.filter((leitura) => !leitura.deleted_at).length} leitura(s) mensal(is)</p>
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
                                                <div className="mt-1 text-xs text-muted-foreground">{registo.abertura ? `Contador: ${formatNumero(registo.leituraActual)}` : `${formatNumero(registo.leituraAnterior)} → ${formatNumero(registo.leituraActual)}`}</div>
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
            <Modal show={editar} onClose={() => setEditar(false)} title={`Editar cliente · ${cliente.numero_cliente}`} maxWidth="lg">
                <form onSubmit={guardarEdicao} className="space-y-4">
                    <div><InputLabel htmlFor="cliente-nome" value="Nome" /><TextInput id="cliente-nome" required value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.nome} className="mt-1" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><InputLabel htmlFor="cliente-zona" value="Zona / bairro" /><select id="cliente-zona" value={form.data.zona_id} onChange={(e) => form.setData("zona_id", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="">Sem zona</option>{zonas.map((zona) => <option key={zona.id} value={zona.id}>{zona.nome}</option>)}</select><InputError message={form.errors.zona_id} className="mt-1" /></div>
                        <div><InputLabel htmlFor="cliente-telefone" value="Telefone" /><TextInput id="cliente-telefone" value={form.data.telefone} onChange={(e) => form.setData("telefone", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.telefone} className="mt-1" /></div>
                    </div>
                    <div><InputLabel htmlFor="cliente-email" value="Email" /><TextInput id="cliente-email" type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.email} className="mt-1" /></div>
                    <div><InputLabel htmlFor="cliente-endereco" value="Endereço" /><TextInput id="cliente-endereco" value={form.data.endereco} onChange={(e) => form.setData("endereco", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.endereco} className="mt-1" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div><InputLabel htmlFor="cliente-tarifa" value="Tarifa" /><select id="cliente-tarifa" required value={form.data.tarifa_id} onChange={(e) => form.setData("tarifa_id", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="">Seleccione</option>{tarifas.map((tarifa) => <option key={tarifa.id} value={tarifa.id}>{tarifa.nome}</option>)}</select><InputError message={form.errors.tarifa_id} className="mt-1" /></div>
                        <div><InputLabel htmlFor="cliente-estado" value="Estado" /><select id="cliente-estado" value={form.data.estado} onChange={(e) => form.setData("estado", e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-base text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"><option value="ativo">Activo</option><option value="inativo">Inactivo</option><option value="cortado">Cortado</option></select><InputError message={form.errors.estado} className="mt-1" /></div>
                    </div>
                    {ehAdministrador && <div><InputLabel htmlFor="cliente-leitura-inicial" value="Leitura inicial do contador" /><TextInput id="cliente-leitura-inicial" type="number" min="0" step="0.01" value={form.data.leitura_inicial} onChange={(e) => form.setData("leitura_inicial", e.target.value)} className="mt-1 block w-full" /><InputError message={form.errors.leitura_inicial} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">É o valor de abertura, não é consumo mensal e não gera factura. Uma alteração mostra primeiro o efeito no primeiro mês.</p></div>}
                    <div className="flex justify-end gap-2 border-t border-border pt-4"><SecondaryButton type="button" onClick={() => setEditar(false)}>Cancelar</SecondaryButton><PrimaryButton type="submit" disabled={form.processing}>{form.processing ? "A guardar…" : "Guardar alterações"}</PrimaryButton></div>
                </form>
            </Modal>
            <Modal show={Boolean(previewInicial)} onClose={() => setPreviewInicial(null)} title="Pré-visualizar leitura inicial" maxWidth="md">
                {previewInicial && <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Leitura inicial: <strong>{formatNumero(previewInicial.leitura_inicial_antes)} → {formatNumero(previewInicial.leitura_inicial_depois)} m³</strong>.</p>
                    {previewInicial.primeira ? <div className="rounded-lg border border-border p-4 text-sm"><p>Primeira leitura mensal: <strong>{previewInicial.primeira.periodo}</strong> · contador {formatNumero(previewInicial.primeira.contador)} m³</p><p className="mt-1">Consumo: {formatNumero(previewInicial.primeira.consumo_antes)} → <strong>{formatNumero(previewInicial.primeira.consumo_depois)} m³</strong></p>{previewInicial.factura?.factura && <p className="mt-1">Factura {previewInicial.factura.factura.numero_factura}: {formatMoney(previewInicial.factura.total_antes)} → <strong>{previewInicial.factura.total_depois == null ? "—" : formatMoney(previewInicial.factura.total_depois)}</strong></p>}</div> : <p className="text-sm">Ainda não há leituras mensais; apenas o valor de abertura será actualizado.</p>}
                    {!previewInicial.pode_aplicar && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">A factura afectada tem pagamentos ou não está pendente. Regularize-a antes de alterar a leitura inicial.</p>}
                    <div><InputLabel htmlFor="motivo-inicial-ficha" value="Motivo da alteração" /><textarea id="motivo-inicial-ficha" rows={3} value={motivoInicial} onChange={(e) => setMotivoInicial(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900" /></div>
                    <div className="flex justify-end gap-2"><SecondaryButton type="button" onClick={() => setPreviewInicial(null)}>Cancelar</SecondaryButton><PrimaryButton type="button" disabled={!previewInicial.pode_aplicar || motivoInicial.trim().length < 5 || form.processing} onClick={confirmarLeituraInicial}>Confirmar correcção</PrimaryButton></div>
                </div>}
            </Modal>
        </AdminLayout>
    );
}
