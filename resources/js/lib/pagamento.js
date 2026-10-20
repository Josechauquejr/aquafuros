export const centavosPagamento = valor => Math.round((Number(valor) || 0) * 100);
// Valor efectivamente aplicado à factura, excluindo recibos estornados.
export const pagoFacturaCentavos = factura => centavosPagamento(factura?.total_pago ?? factura?.pagamentos_sum_valor_pago
    ?? (factura?.pagamentos ?? []).filter(pagamento => !pagamento.deleted_at).reduce((soma, pagamento) => soma + Number(pagamento.valor_pago || 0), 0));
export const multaFacturaCentavos = factura => centavosPagamento(Number(factura?.multa_em_falta ?? 0) + Number(factura?.multa_prevista ?? 0));
export const principalFacturaCentavos = factura => centavosPagamento(factura?.em_falta_sem_multa ?? Math.max(0, Number(factura?.em_falta ?? factura?.total_pagar ?? 0) - Number(factura?.multa_em_falta ?? 0)));
export const saldoFacturaCentavos = factura => centavosPagamento(factura?.em_falta_com_multa ?? (principalFacturaCentavos(factura) + multaFacturaCentavos(factura)) / 100);
export const ordenarFacturasPagamento = (a, b) => a.ano - b.ano || a.mes - b.mes || a.id - b.id;

/** Distribui em centavos, por antiguidade, aplicando primeiro o crédito disponível. */
export function distribuirPagamento(facturas, recebido, credito) {
    let dinheiroRestante = Math.max(0, recebido);
    let creditoRestante = Math.max(0, credito);
    return [...facturas].sort(ordenarFacturasPagamento).map(factura => {
        const saldo = saldoFacturaCentavos(factura);
        const creditoAplicado = Math.min(creditoRestante, saldo);
        creditoRestante -= creditoAplicado;
        const dinheiro = Math.min(dinheiroRestante, saldo - creditoAplicado);
        dinheiroRestante -= dinheiro;
        const total = creditoAplicado + dinheiro;
        return {factura, saldo, credito: creditoAplicado, dinheiro, total,
            multa: Math.max(0, total - principalFacturaCentavos(factura)), remanescente: saldo - total};
    });
}
