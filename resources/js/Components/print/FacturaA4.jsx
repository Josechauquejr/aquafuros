import { usePage } from "@inertiajs/react";
import { Droplets } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const estadoConfig = {
    paga: { label: "PAGA", classes: "border-emerald-600 text-emerald-700" },
    pendente: { label: "PENDENTE", classes: "border-amber-600 text-amber-700" },
    parcial: { label: "PARCIALMENTE PAGA", classes: "border-cyan-600 text-cyan-700" },
    anulada: { label: "ANULADA", classes: "border-slate-400 text-slate-500" },
};

/**
 * Vista completa da factura em formato A4 — usada tanto na página de
 * impressão individual como no download rápido a partir da lista, para que
 * o PDF descarregado fique sempre idêntico ao que é impresso.
 */
export default function FacturaA4({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const { empresa } = usePage().props;
    const estado = estadoConfig[factura.estado];
    const ehLigacao = factura.tipo === "ligacao";
    const leitura = factura.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;
    const variacao =
        consumo !== null && consumoAnterior !== null && consumoAnterior !== undefined && consumoAnterior > 0
            ? ((consumo - consumoAnterior) / consumoAnterior) * 100
            : null;

    return (
        <div className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
            <div className="flex items-start justify-between border-b border-slate-300 pb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-cyan-700 text-white">
                        {empresa?.logotipoUrl ? (
                            <img src={empresa.logotipoUrl} alt={empresa.nome} className="h-full w-full object-contain" />
                        ) : (
                            <Droplets className="h-6 w-6" aria-hidden="true" />
                        )}
                    </div>
                    <div>
                        <p className="text-lg font-bold">{empresa?.nome ?? "Aquafuros"}</p>
                        {empresa?.nuit && <p className="text-xs text-slate-500">NUIT: {empresa.nuit}</p>}
                        {empresa?.localizacao && <p className="text-xs text-slate-500">{empresa.localizacao}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold uppercase tracking-wide">Factura</p>
                    {ehLigacao && (
                        <p className="text-xs font-semibold uppercase text-amber-700">Taxa de ligação de água</p>
                    )}
                    <p className="text-sm text-slate-600">{factura.numero_factura}</p>
                    <span className={`mt-2 inline-block rounded border px-3 py-1 text-xs font-bold ${estado.classes}`}>
                        {estado.label}
                    </span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                    <p className="mt-1 font-semibold">{factura.cliente?.nome ?? "Cliente removido"}</p>
                    <p className="text-slate-600">Nº {factura.cliente?.numero_cliente}</p>
                    <p className="text-slate-600">Tel: {factura.cliente?.telefone || "—"}</p>
                    <p className="text-slate-600">{factura.cliente?.endereco || "—"}</p>
                    <p className="text-slate-600">{factura.cliente?.bairro || "—"}</p>
                    <p className="text-slate-600">Tarifa: {factura.cliente?.tarifa?.nome ?? "—"}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Período de facturação
                    </p>
                    <p className="mt-1 font-semibold">{meses[factura.mes - 1]} de {factura.ano}</p>
                    <p className="text-slate-600">Emitida em {formatDateTime(factura.created_at)}</p>
                    <p className="text-slate-600">Gerada por {factura.gerada_por?.name ?? "—"}</p>
                </div>
            </div>

            {ehLigacao ? (
                <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Taxa única cobrada no início de um novo contrato de fornecimento de água — não está associada
                    a nenhuma leitura de consumo.
                </div>
            ) : (
                <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leitura do contador</p>
                    <table className="mt-2 w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                                <th className="py-2">Leitura anterior</th>
                                <th className="py-2">Leitura actual</th>
                                <th className="py-2 text-right">Consumo actual</th>
                                <th className="py-2 text-right">Consumo mês anterior</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="py-2">
                                    {leitura ? Number(leitura.leitura_anterior).toFixed(2) : "—"}
                                    {primeiraLeitura && (
                                        <span className="ml-2 text-xs text-slate-500">(leitura inicial)</span>
                                    )}
                                </td>
                                <td className="py-2">{leitura ? Number(leitura.leitura_actual).toFixed(2) : "—"}</td>
                                <td className="py-2 text-right font-semibold">
                                    {consumo !== null ? `${consumo.toFixed(2)} m³` : "—"}
                                </td>
                                <td className="py-2 text-right text-slate-600">
                                    {consumoAnterior !== null && consumoAnterior !== undefined
                                        ? `${Number(consumoAnterior).toFixed(2)} m³`
                                        : "— (sem período anterior)"}
                                    {variacao !== null && (
                                        <span className={variacao >= 0 ? "ml-1 text-rose-600" : "ml-1 text-emerald-600"}>
                                            ({variacao >= 0 ? "+" : ""}
                                            {variacao.toFixed(0)}%)
                                        </span>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valores</p>
                <table className="mt-2 w-full border-collapse text-sm">
                    <tbody>
                        <tr className="border-b border-slate-200">
                            <td className="py-2 text-slate-600">Valor do consumo</td>
                            <td className="py-2 text-right">{formatCurrency(factura.valor_consumo)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <td className="py-2 text-slate-600">Dívida anterior</td>
                            <td className="py-2 text-right">{formatCurrency(factura.divida_anterior)}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <td className="py-2 text-slate-600">Multa</td>
                            <td className="py-2 text-right">{formatCurrency(factura.multa)}</td>
                        </tr>
                        <tr>
                            <td className="py-3 text-base font-bold">Total a pagar</td>
                            <td className="py-3 text-right text-base font-bold">
                                {formatCurrency(factura.total_pagar)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {factura.pagamentos?.length > 0 && (
                <div className="mt-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pagamentos recebidos
                    </p>
                    <table className="mt-2 w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                                <th className="py-2">Recibo</th>
                                <th className="py-2">Data</th>
                                <th className="py-2 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {factura.pagamentos.map((p) => (
                                <tr key={p.id} className="border-b border-slate-100">
                                    <td className="py-2">{p.numero_recibo}</td>
                                    <td className="py-2">{formatDate(p.created_at)}</td>
                                    <td className="py-2 text-right">{formatCurrency(p.valor_pago)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-10 flex items-center justify-between gap-4 border-t border-slate-300 pt-4">
                <p className="text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                </p>
                {qrUrl && (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                        <QRCodeSVG value={qrUrl} size={72} level="M" />
                        <p className="text-[9px] text-slate-400">Verificar autenticidade</p>
                    </div>
                )}
            </div>
        </div>
    );
}
