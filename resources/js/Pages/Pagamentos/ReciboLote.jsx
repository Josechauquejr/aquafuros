import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import AnimatedButton from "@/Components/AnimatedButton";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Recibo único de um pagamento de várias facturas: uma folha para o cliente
 * com todas as facturas pagas e o total. Cada factura tem também o seu recibo
 * individual (referido na tabela).
 */
export default function ReciboLote({ pagamentos, total }) {
    const { empresa } = usePage().props;
    const primeiro = pagamentos[0];

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Recibo — ${primeiro.cliente?.nome ?? "cliente"}`} />

            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
                <Link href="/pagamentos" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar aos pagamentos
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/pagamentos/imprimir-lote?ids=${pagamentos.map((p) => p.id).join(",")}`}
                        className="text-sm font-medium text-cyan-700 underline-offset-2 hover:underline"
                    >
                        Recibos individuais
                    </Link>
                    <AnimatedButton variant="primary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir
                    </AnimatedButton>
                </div>
            </div>

            <div className="mx-auto max-w-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:border-0 print:shadow-none">
                <div className="flex items-start justify-between border-b border-slate-300 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cyan-700 text-white">
                            {empresa?.logotipoUrl ? (
                                <img src={empresa.logotipoUrl} alt={empresa.nome} crossOrigin="anonymous" className="h-full w-full object-contain" />
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
                        <p className="text-xl font-bold uppercase tracking-wide">Recibo</p>
                        <p className="text-sm text-slate-600">{pagamentos.length} facturas pagas</p>
                        <p className="text-sm text-slate-600">{formatDate(primeiro.pago_em ?? primeiro.created_at)}</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                        <p className="mt-1 font-semibold">{primeiro.cliente?.nome ?? "Cliente removido"}</p>
                        {primeiro.cliente?.numero_cliente && <p className="text-xs text-slate-500">{primeiro.cliente.numero_cliente}</p>}
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Método</p>
                        <p className="mt-1 font-semibold">{metodoLabels[primeiro.metodo_pagamento] ?? primeiro.metodo_pagamento}</p>
                        {primeiro.referencia_pagamento && <p className="text-xs text-slate-500">Ref.: {primeiro.referencia_pagamento}</p>}
                    </div>
                </div>

                <table className="mt-8 w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
                            <th className="py-2">Factura</th>
                            <th className="py-2">Período</th>
                            <th className="py-2">Recibo</th>
                            <th className="py-2 text-right">Valor pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagamentos.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100">
                                <td className="py-2">{p.factura?.numero_factura}</td>
                                <td className="py-2">{p.factura ? `${meses[p.factura.mes - 1]}/${p.factura.ano}` : "—"}</td>
                                <td className="py-2">{p.numero_recibo}</td>
                                <td className="py-2 text-right">{formatCurrency(p.valor_pago)}</td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={3} className="py-3 text-base font-bold">Total recebido</td>
                            <td className="py-3 text-right text-base font-bold">{formatCurrency(total)}</td>
                        </tr>
                    </tbody>
                </table>

                <p className="mt-6 text-xs text-slate-500">
                    Recebido por {primeiro.recebido_por?.name ?? "—"} em {formatDateTime(primeiro.created_at)}.
                </p>

                <div className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                    <br />
                    Desenvolvido pela RJM Consultórios e Serviços — José Zeferino Chaúque Júnior
                </div>
            </div>
        </div>
    );
}
