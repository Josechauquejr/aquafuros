import { usePage } from "@inertiajs/react";
import { formatDate } from "@/lib/format";
import { avisoPenalizacao, estadoDocumento, mesesFactura, moedaDocumento, periodoOrigem, resumoDocumento, volumeDocumento } from "@/lib/facturaDocumento";
import CabecalhoDocumento from "@/Components/print/CabecalhoDocumento";
import { MeiosPagamentoFactura, MontanteFactura, RodapeFactura } from "@/Components/print/FacturaElementos";

function LinhaValor({ descricao, valor, destaque = false }) {
    return <tr className={`border-b border-slate-200 last:border-0 ${destaque ? "font-semibold text-slate-900" : "text-slate-600"}`}>
        <td className="py-1.5 pr-4">{descricao}</td>
        <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{moedaDocumento(valor)}</td>
    </tr>;
}

export default function FacturaA4({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const { empresa } = usePage().props;
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const tarifa = factura.cliente?.tarifa;
    const ligacao = factura.tipo === "ligacao";
    const prazo = factura.data_vencimento ? new Date(factura.data_vencimento).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }) : null;

    return (
        <article className="mx-auto w-full max-w-[210mm] space-y-2.5 border border-slate-200 bg-white p-[12mm] text-[14px] leading-snug text-slate-900 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
            <CabecalhoDocumento textoMaior empresa={empresa} titulo="Factura" numero={factura.numero_factura} estado={estado.label} estadoClasses={estado.classes} />
            <section className="grid grid-cols-2 gap-8">
                <div>
                    <h2 className="text-[12px] font-semibold uppercase tracking-widest text-cyan-800">Dados do cliente</h2>
                    <p className="mt-1 text-lg font-semibold leading-snug">{factura.cliente?.nome ?? "Cliente removido"}</p>
                    <p className="mt-1 text-slate-600">N.º de cliente: {factura.cliente?.numero_cliente ?? "—"}</p>
                    <p className="text-slate-600">Contacto: {factura.cliente?.telefone || "—"}</p>
                    <p className="text-slate-600">Endereço: {[factura.cliente?.endereco, factura.cliente?.bairro].filter(Boolean).join(" · ") || "—"}</p>
                    <p className="text-slate-600">Categoria tarifária: {tarifa?.nome ?? "—"}</p>
                    {factura.cliente?.data_adesao && <p className="text-slate-600">Data de adesão: {formatDate(factura.cliente.data_adesao)}</p>}
                </div>
                <div className="text-right">
                    <h2 className="text-[12px] font-semibold uppercase tracking-widest text-cyan-800">Dados da factura</h2>
                    <p className="mt-1 text-lg font-semibold">{mesesFactura[factura.mes - 1]} de {factura.ano}</p>
                    <p className="mt-1 text-slate-600">Emissão: {formatDate(factura.created_at)}</p>
                    <p className="font-semibold text-slate-700">Vencimento: {formatDate(factura.data_vencimento)}</p>
                    <p className="text-slate-600">Factura: {factura.numero_factura}</p>
                    {leitura?.numero_leitura && <p className="text-slate-600">Leitura: {leitura.numero_leitura}</p>}
                    {factura.cliente?.numero_contador && <p className="text-slate-600">Contador: {factura.cliente.numero_contador}</p>}
                </div>
            </section>
            {ligacao ? <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Taxa de ligação de água. Encargo único associado ao início do contrato de fornecimento.</p> : <section>
                <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-cyan-800">Registo de consumo de água</h2>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        ["Leitura anterior", leitura?.leitura_anterior, false],
                        ["Leitura actual", leitura?.leitura_actual, false],
                        ["Consumo apurado", resumo.consumo, true],
                    ].map(([label, valor, destaque]) => <div key={label} className={`rounded-md border px-3 py-2 ${destaque ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-slate-50"}`}>
                        <p className="text-[12px] text-slate-600">{label}</p>
                        <p className="mt-1 whitespace-nowrap text-2xl font-semibold tabular-nums">{volumeDocumento(valor)}</p>
                    </div>)}
                </div>
                {(primeiraLeitura || consumoAnterior != null) && <p className="mt-2 text-[11px] text-slate-600">
                    {primeiraLeitura ? "Leitura anterior correspondente à leitura inicial do contrato." : `Consumo do período anterior: ${volumeDocumento(consumoAnterior)}.`}
                </p>}
            </section>}
            <section>
                <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-cyan-800">Discriminação da factura</h2>
                <table className="w-full border-collapse"><tbody>
                    <LinhaValor descricao={ligacao ? "Taxa de ligação de água" : "Valor do consumo do período"} valor={resumo.consumoEmitido} />
                    {resumo.tarifaMinima && !ligacao && <tr className="border-b border-slate-200"><td colSpan={2} className="pb-2 pt-1 text-[11px] text-slate-600">Tarifa mínima de {moedaDocumento(tarifa.taxa_minima)}, aplicável ao consumo até {volumeDocumento(tarifa.consumo_minimo_m3)}.</td></tr>}
                    {resumo.anterior > 0 && <LinhaValor descricao="Saldo anterior em dívida (sem penalizações)" valor={resumo.anterior} />}
                    {resumo.penalizacoesAnteriores > 0 && <LinhaValor descricao="Penalizações anteriores" valor={resumo.penalizacoesAnteriores} />}
                    <LinhaValor descricao="Penalização na emissão" valor={resumo.multaEmitida} />
                    <LinhaValor descricao="Total na emissão" valor={resumo.totalEmitido} destaque />
                    {resumo.multasAnterioresPosteriores !== 0 && <LinhaValor descricao="Penalizações anteriores apuradas após emissão" valor={resumo.multasAnterioresPosteriores} />}
                    {resumo.multaPeriodoPosterior !== 0 && <LinhaValor descricao="Penalização do período apurada após emissão" valor={resumo.multaPeriodoPosterior} />}
                    {resumo.outrosAjustamentosPosteriores !== 0 && <LinhaValor descricao="Outros encargos ou ajustamentos posteriores" valor={resumo.outrosAjustamentosPosteriores} />}
                    {resumo.pago > 0 && <LinhaValor descricao="Pagamentos registados após a emissão" valor={-resumo.pago} />}
                </tbody></table>
                {!factura.cobranca && !factura.divida_anterior_incluida && Number(factura.divida_anterior) > 0 && <p className="mt-2 text-[11px] text-slate-600">Saldo anterior de {moedaDocumento(factura.divida_anterior)} apresentado a título informativo. Cobrado nas facturas correspondentes; não incluído nesta factura.</p>}
                {factura.estado === "transferida" && <p className="mt-2 text-[11px] text-slate-600">Saldo transferido para uma factura posterior. Este documento não deve ser pago separadamente.</p>}
                {resumo.origens.length > 0 && <div className="mt-2 rounded border border-slate-200 px-3 py-2 text-[11px] text-slate-600">
                    <p className="font-semibold text-slate-800">Facturas anteriores ainda em aberto</p>
                    {resumo.origens.map(origem => <p key={origem.id}>{origem.numero_factura} · {periodoOrigem(origem)}: {moedaDocumento(origem.principal)} de principal + {moedaDocumento(origem.multa)} de multa.</p>)}
                </div>}
            </section>
            <section className="flex items-center justify-between gap-4 rounded-lg bg-cyan-800 px-5 py-3 text-white" style={{ breakInside: "avoid" }}>
                <div>
                    <h2 className="text-[12px] font-semibold uppercase tracking-widest text-cyan-100">Saldo actual a pagar</h2>
                    {prazo && <p className="mt-1 text-[12px] text-cyan-50">Prazo de pagamento: {prazo}.</p>}
                </div>
                <MontanteFactura valor={resumo.aPagar} className="text-3xl font-bold" />
            </section>
            <MeiosPagamentoFactura empresa={empresa} />
            <aside className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-950" style={{ breakInside: "avoid" }}>
                <p>{avisoPenalizacao}</p>
                {resumo.multasPrevistas > 0 && <p className="mt-1 font-medium">Penalizações por atraso previstas: {moedaDocumento(resumo.multasPrevistas)}. Valores sujeitos a confirmação no pagamento, ainda não incluídos no saldo actual.</p>}
                <p className="mt-1">Ao efectuar o pagamento, indique o número da factura e guarde o comprovativo.</p>
            </aside>
            <RodapeFactura empresa={empresa} qrUrl={qrUrl} />
        </article>
    );
}
