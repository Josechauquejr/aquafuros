import { formatNumero } from "@/lib/format";
import { consumoLeitura } from "@/lib/consumoLeitura";

export const mesesFactura = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const numeroDocumento = (valor) => formatNumero(valor).replaceAll("\u00a0", ".");
export const moedaDocumento = (valor) => `${numeroDocumento(valor)}\u00a0MT`;
export const volumeDocumento = (valor) => valor == null ? "—" : `${numeroDocumento(valor)}\u00a0m³`;
export const periodoOrigem = origem => Number(origem.mes) >= 1 && Number(origem.mes) <= 12 && Number(origem.ano) > 0
    ? `${mesesFactura[Number(origem.mes) - 1]} de ${origem.ano}` : "Período não disponível";
export function telefonePagamento(valor) {
    let digitos = String(valor ?? "").replace(/\D/g, "");
    if (digitos.startsWith("258") && digitos.length > 9) digitos = digitos.slice(3);
    return digitos.length === 9 ? digitos.match(/.{3}/g).join(" ") : valor;
}
export const avisoPenalizacao = "O pagamento após a data de vencimento poderá resultar em multas e corte do fornecimento, nos termos das condições aplicáveis.";

export function estadoDocumento(factura) {
    const estados = {
        paga: ["Paga", "border-emerald-200 bg-emerald-50 text-emerald-700"],
        pendente: ["Pendente", "border-amber-200 bg-amber-50 text-amber-800"],
        parcial: ["Parcialmente paga", "border-cyan-200 bg-cyan-50 text-cyan-800"],
        anulada: ["Anulada", "border-slate-200 bg-slate-50 text-slate-500"],
        transferida: ["Transferida", "border-slate-200 bg-slate-50 text-slate-500"],
    };
    if (factura.esta_vencida && ["pendente", "parcial"].includes(factura.estado)) {
        return { label: factura.estado === "parcial" ? "Vencida · parcialmente paga" : "Vencida", classes: "border-rose-200 bg-rose-50 text-rose-700" };
    }
    const [label, classes] = estados[factura.estado] ?? [factura.estado, "border-slate-200 text-slate-600"];
    return { label, classes };
}

export function resumoDocumento(factura) {
    const cobranca = factura.cobranca;
    const pago = cobranca?.pagamentos_apos_emissao ?? (factura.pagamentos ?? []).reduce((soma, pagamento) => soma + Number(pagamento.valor_pago || 0), 0);
    const anterior = cobranca?.principal_anterior_emitido ?? (factura.divida_anterior_incluida ? Number(factura.divida_anterior || 0) : 0);
    const penalizacoesAnteriores = cobranca?.multas_anteriores_emitidas ?? Number(factura.multa_anterior || 0);
    const consumo = factura.leitura ? consumoLeitura(factura.leitura) : (factura.consumo_m3 ?? null);
    return {
        consumo, pago, anterior, penalizacoesAnteriores,
        saldoAnterior: cobranca?.saldo_anterior_actual ?? anterior + penalizacoesAnteriores,
        aPagar: cobranca?.saldo_actual ?? (["paga", "anulada", "transferida"].includes(factura.estado) ? 0 : Math.max(0, Number(factura.total_pagar) - pago)),
        totalEmitido: cobranca?.total_emitido ?? Number(factura.total_pagar),
        consumoEmitido: cobranca?.consumo_emitido ?? Number(factura.valor_consumo),
        acertoLeitura: Number(factura.valor_acerto_leitura ?? factura.emissao_original?.valor_acerto_leitura ?? 0),
        multaEmitida: cobranca?.multa_emitida ?? Number(factura.multa),
        ajustesPosteriores: cobranca?.ajustamentos_posteriores ?? 0,
        multaPeriodoPosterior: cobranca?.multa_periodo_posterior ?? 0,
        multasAnterioresPosteriores: cobranca?.multas_anteriores_posteriores ?? 0,
        outrosAjustamentosPosteriores: cobranca?.outros_ajustamentos_posteriores ?? cobranca?.ajustamentos_posteriores ?? 0,
        multasPrevistas: cobranca?.multas_previstas ?? Number(factura.multa_prevista ?? 0),
        origens: cobranca?.origens ?? [],
        tarifaMinima: consumo !== null && factura.cliente?.tarifa && consumo <= Number(factura.cliente.tarifa.consumo_minimo_m3),
    };
}
