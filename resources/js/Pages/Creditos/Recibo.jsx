import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Droplets, Printer } from "lucide-react";
import AnimatedButton from "@/Components/AnimatedButton";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const metodoLabels = { dinheiro: "Dinheiro", banco: "Transferência bancária", mpesa: "M-Pesa", "e-mola": "e-Mola" };

/** Recibo de um adiantamento: dinheiro recebido por conta de facturas futuras (crédito do cliente). */
export default function Recibo({ credito, saldo }) {
    const { empresa } = usePage().props;

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Recibo ${credito.numero_recibo}`} />

            <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 px-4 print:hidden">
                <Link href="/pagamentos" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <AnimatedButton variant="primary" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Imprimir
                </AnimatedButton>
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
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold uppercase tracking-wide">Recibo de adiantamento</p>
                        <p className="text-sm text-slate-600">{credito.numero_recibo}</p>
                        <p className="text-sm text-slate-600">{formatDateTime(credito.pago_em ?? credito.created_at)}</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                        <p className="mt-1 font-semibold">{credito.cliente?.nome}</p>
                        <p className="text-xs text-slate-500">{credito.cliente?.numero_cliente}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Método</p>
                        <p className="mt-1 font-semibold">{metodoLabels[credito.metodo_pagamento] ?? credito.metodo_pagamento}</p>
                        {credito.referencia_pagamento && <p className="text-xs text-slate-500">Ref.: {credito.referencia_pagamento}</p>}
                    </div>
                </div>

                <table className="mt-8 w-full border-collapse text-sm">
                    <tbody>
                        <tr className="border-b border-slate-200">
                            <td className="py-3 text-base font-bold">Valor recebido</td>
                            <td className="py-3 text-right text-base font-bold">{formatCurrency(credito.valor)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-slate-600">Crédito total do cliente</td>
                            <td className="py-2 text-right">{formatCurrency(saldo)}</td>
                        </tr>
                    </tbody>
                </table>
                <p className="mt-4 text-xs text-slate-500">
                    Este valor fica como crédito a favor do cliente e é abatido às próximas facturas. Recebido por {credito.recebido_por?.name ?? "—"}.
                </p>

                <div className="mt-10 border-t border-slate-300 pt-4 text-center text-xs text-slate-400">
                    Documento gerado electronicamente pelo sistema Aquafuros — sem necessidade de assinatura.
                </div>
            </div>
        </div>
    );
}
