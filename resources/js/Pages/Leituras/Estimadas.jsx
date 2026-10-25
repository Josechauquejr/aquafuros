import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import InputError from "@/Components/InputError";
import InputLabel from "@/Components/InputLabel";
import TextInput from "@/Components/TextInput";
import Textarea from "@/Components/Textarea";
import StatusBadge from "@/Components/StatusBadge";
import { formatMoney, formatVolume } from "@/lib/utils";
import { previewPost } from "@/lib/previewPost";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function estadoEstimativa(estado) {
    const estilos = {
        pendente: ["Pendente de aprovação", "amber"],
        confirmada: ["Confirmada · por facturar", "cyan"],
        facturada: ["Facturada · aguarda leitura real", "emerald"],
        reconciliada: ["Reconciliada", "slate"],
        cancelada: ["Cancelada", "slate"],
        factura_anulada: ["Factura anulada", "rose"],
    };
    const [texto, tom] = estilos[estado] ?? [estado, "slate"];
    return <StatusBadge tone={tom}>{texto}</StatusBadge>;
}

function formatPeriodo(item) {
    return `${meses[Number(item.mes) - 1]}/${item.ano}`;
}

export default function Estimadas({ estimativas, acertos, clientes }) {
    const { auth, flash } = usePage().props;
    const podeAprovar = auth.roles?.some((papel) => ["administrador", "gestor"].includes(papel));
    const agora = new Date();
    const form = useForm({ cliente_id: "", mes: agora.getMonth() + 1, ano: agora.getFullYear(), consumo_m3: "", motivo: "" });
    const [preview, setPreview] = useState(null);
    const [erroPreview, setErroPreview] = useState("");

    const carregarPreview = async (event) => {
        event.preventDefault();
        setErroPreview("");
        setPreview(null);
        try {
            const resultado = await previewPost("/leituras-estimadas/prever", {
                cliente_id: form.data.cliente_id,
                mes: form.data.mes,
                ano: form.data.ano,
            });
            setPreview(resultado);
        } catch (erro) {
            setErroPreview(erro.message || "Não foi possível preparar a estimativa.");
        }
    };

    const guardar = (event) => {
        event.preventDefault();
        form.post("/leituras-estimadas", {
            preserveScroll: true,
            onSuccess: () => { form.reset("consumo_m3", "motivo"); setPreview(null); },
        });
    };

    const executar = (url, metodo = "put") => router[metodo](url, {}, { preserveScroll: true });

    return (
        <AdminLayout header={<h1 className="text-xl font-semibold text-slate-900 dark:text-white">Leituras estimadas</h1>}>
            <Head title="Leituras estimadas" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {flash?.status && <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{flash.status}</div>}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <h2 className="text-lg font-semibold">Registar estimativa mensal</h2>
                    <p className="mt-1 text-sm text-slate-500">Usa a média dos três últimos consumos reais confirmados. A estimativa fica separada das leituras reais.</p>
                    <form onSubmit={guardar} className="mt-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="sm:col-span-2">
                                <InputLabel htmlFor="cliente_id" value="Cliente" />
                                <select id="cliente_id" value={form.data.cliente_id} onChange={(e) => { form.setData("cliente_id", e.target.value); setPreview(null); }} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                    <option value="">Escolha o cliente</option>
                                    {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {cliente.numero_cliente}</option>)}
                                </select>
                                <InputError message={form.errors.cliente_id} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="mes" value="Mês" />
                                <select id="mes" value={form.data.mes} onChange={(e) => { form.setData("mes", e.target.value); setPreview(null); }} className="mt-1 block w-full rounded-md border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                    {meses.map((mes, i) => <option key={mes} value={i + 1}>{mes}</option>)}
                                </select>
                            </div>
                            <div>
                                <InputLabel htmlFor="ano" value="Ano" />
                                <TextInput id="ano" type="number" min="2000" max="2100" value={form.data.ano} onChange={(e) => { form.setData("ano", e.target.value); setPreview(null); }} className="mt-1 block w-full" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <SecondaryButton type="button" disabled={!form.data.cliente_id} onClick={carregarPreview}>Pré-visualizar base</SecondaryButton>
                            {preview && <div className="text-sm text-slate-600 dark:text-slate-300">{preview.pode_estimar_automaticamente ? <>Média calculada: <strong>{formatVolume(preview.media_m3)}</strong> a partir de {preview.leituras_base.length} leituras reais.</> : "Não existem três leituras reais válidas; indique um consumo manual e justifique."}</div>}
                        </div>
                        {preview && <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                            <p className="font-medium">Leituras usadas</p>
                            {preview.leituras_base.length ? <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-slate-600 dark:text-slate-300">{preview.leituras_base.map((leitura) => <li key={leitura.leitura_id}>{meses[leitura.mes - 1]}/{leitura.ano}: {formatVolume(leitura.consumo_m3)}</li>)}</ul> : <p className="mt-1 text-slate-500">Sem histórico real confirmado.</p>}
                        </div>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel htmlFor="consumo_m3" value={`Consumo manual (m³)${preview?.pode_estimar_automaticamente ? " · opcional para substituir a média" : " · obrigatório sem três leituras reais"}`} />
                                <TextInput id="consumo_m3" type="number" min="0" step="0.01" value={form.data.consumo_m3} onChange={(e) => form.setData("consumo_m3", e.target.value)} className="mt-1 block w-full" />
                                <InputError message={form.errors.consumo_m3} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="motivo" value="Motivo (obrigatório para valor manual)" />
                                <Textarea id="motivo" value={form.data.motivo} onChange={(e) => form.setData("motivo", e.target.value)} rows={2} className="mt-1 block w-full" />
                                <InputError message={form.errors.motivo} className="mt-2" />
                            </div>
                        </div>
                        {erroPreview && <p className="text-sm text-rose-600">{erroPreview}</p>}
                        <InputError message={form.errors.periodo} />
                        <PrimaryButton disabled={form.processing || !preview}>Registar estimativa pendente</PrimaryButton>
                    </form>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <h2 className="text-lg font-semibold">Estimativas</h2>
                    <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                        {estimativas.length ? estimativas.map((item) => <article key={item.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-semibold">{item.cliente?.nome} <span className="font-normal text-slate-500">· {formatPeriodo(item)}</span></p>
                                <p className="mt-1 text-sm">Consumo: <strong>{formatVolume(item.consumo_m3)}</strong> · {item.metodo === "media_real" ? "média de três leituras reais" : "manual"}</p>
                                <p className="text-xs text-slate-500">Registada por {item.registado_por?.name ?? "utilizador removido"}{item.confirmado_por && ` · Confirmada por ${item.confirmado_por.name}`}{item.motivo ? ` · ${item.motivo}` : ""}{item.motivo_cancelamento ? ` · Cancelada por ${item.cancelado_por?.name ?? "utilizador removido"}: ${item.motivo_cancelamento}` : ""}</p>
                                <div className="mt-2 flex flex-wrap gap-2">{estadoEstimativa(item.estado)}{item.factura && <a className="text-sm text-cyan-700 underline dark:text-cyan-300" href={`/facturas/${item.factura.numero_factura}/imprimir`}>{item.factura.numero_factura}</a>}</div>
                                <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">Ver leituras que formaram a média</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(item.leituras_base ?? [], null, 2)}</pre></details>
                            </div>
                            {podeAprovar && <div className="flex flex-wrap gap-2">
                                {item.estado === "pendente" && <SecondaryButton onClick={() => executar(`/leituras-estimadas/${item.id}/confirmar`)}>Confirmar</SecondaryButton>}
                                {item.estado === "confirmada" && <PrimaryButton onClick={() => executar(`/leituras-estimadas/${item.id}/facturar`, "post")}>Emitir factura</PrimaryButton>}
                                {["pendente", "confirmada"].includes(item.estado) && <SecondaryButton onClick={() => { const motivo = window.prompt("Motivo do cancelamento da estimativa?"); if (motivo?.trim().length >= 5) router.delete(`/leituras-estimadas/${item.id}`, { data: { motivo_cancelamento: motivo }, preserveScroll: true }); }}>Cancelar</SecondaryButton>}
                            </div>}
                        </article>) : <p className="py-5 text-sm text-slate-500">Ainda não há estimativas registadas.</p>}
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <h2 className="text-lg font-semibold">Reconciliações com leitura real</h2>
                    <p className="mt-1 text-sm text-slate-500">A leitura real é comparada com as estimativas facturadas do ciclo. A aprovação não altera as facturas antigas.</p>
                    <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                        {acertos.length ? acertos.map((acerto) => <article key={acerto.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-semibold">{acerto.cliente?.nome} · acerto #{acerto.id}</p>
                                <p className="mt-1 text-sm">Real: {formatVolume(acerto.consumo_real_m3)} · estimado: {formatVolume(acerto.consumo_estimado_m3)} · diferença: {formatVolume(acerto.diferenca_m3)}</p>
                                <p className="text-sm">{Number(acerto.valor_acerto) < 0 ? "Crédito a reconhecer" : Number(acerto.valor_acerto) > 0 ? "A cobrar na próxima factura" : "Sem diferença financeira"}: <strong>{formatMoney(Math.abs(Number(acerto.valor_acerto)))}</strong></p>
                                <StatusBadge tone={acerto.estado === "a_confirmar" ? "amber" : acerto.estado === "credito" ? "emerald" : "cyan"}>{acerto.estado.replaceAll("_", " ")}</StatusBadge>
                                {acerto.factura && <p className="mt-1 text-xs text-slate-500">Lançado em {acerto.factura.numero_factura}</p>}
                                {acerto.credito && <p className="mt-1 text-xs text-slate-500">Crédito do cliente registado, sem entrada de caixa.</p>}
                                {acerto.aprovado_por && <p className="mt-1 text-xs text-slate-500">Aprovado por {acerto.aprovado_por.name} em {new Date(acerto.aprovado_em).toLocaleString("pt-PT")}.</p>}
                                <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">Ver cálculo e facturas de origem</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(acerto.detalhes, null, 2)}</pre></details>
                            </div>
                            {podeAprovar && acerto.estado === "a_confirmar" && <PrimaryButton onClick={() => { const descricao = Number(acerto.valor_acerto) < 0 ? "registar um crédito para o cliente" : "cobrar a diferença na próxima factura"; if (window.confirm(`Confirma ${descricao} no valor de ${formatMoney(Math.abs(Number(acerto.valor_acerto)))}? As facturas antigas não serão alteradas.`)) executar(`/acertos-leitura/${acerto.id}/aprovar`); }}>Aprovar acerto</PrimaryButton>}
                        </article>) : <p className="py-5 text-sm text-slate-500">Ainda não há ciclos estimados reconciliados.</p>}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
