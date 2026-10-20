import { moedaDocumento } from "@/lib/facturaDocumento";

export default function DiscriminacaoRecibo({ pagamento, compacto = false }) {
    const parcelas = pagamento?.imputacoes ?? [];
    if (!parcelas.length) return null;
    return <section className={compacto ? "mt-2 text-[10px]" : "mt-5 text-sm"}>
        <h2 className="mb-1 font-semibold">Aplicação do pagamento nas facturas de origem</h2>
        <table className="w-full border-collapse">
            <thead><tr className="border-b border-slate-300 text-left text-slate-600">
                <th className="py-1">Factura</th><th className="py-1 text-right">Principal</th><th className="py-1 text-right">Multa</th><th className="py-1 text-right">Total aplicado</th>
            </tr></thead>
            <tbody>{parcelas.map(parcela => <tr key={parcela.id} className="border-b border-slate-200">
                <td className="py-1 pr-2">{parcela.factura?.numero_factura ?? "—"}</td>
                <td className="whitespace-nowrap py-1 text-right">{moedaDocumento(parcela.valor_principal)}</td>
                <td className="whitespace-nowrap py-1 text-right">{moedaDocumento(parcela.valor_multa)}</td>
                <td className="whitespace-nowrap py-1 text-right font-semibold">{moedaDocumento(Number(parcela.valor_principal) + Number(parcela.valor_multa))}</td>
            </tr>)}</tbody>
        </table>
    </section>;
}
