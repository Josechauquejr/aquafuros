import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const formatUrl = new URL("../../resources/js/lib/format.js", import.meta.url).href;
const source = readFileSync(new URL("../../resources/js/lib/facturaDocumento.js", import.meta.url), "utf8").replace("@/lib/format", formatUrl);
const { resumoDocumento, moedaDocumento, estadoDocumento } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const factura = { estado: "pendente", total_pagar: 1944, divida_anterior_incluida: true, divida_anterior: 1200, multa_anterior: 144, multa: 0, pagamentos: [] };

test("o saldo anterior inclui a penalização uma vez e o total respeita os pagamentos", () => {
    assert.equal(resumoDocumento(factura).saldoAnterior, 1344);
    assert.equal(resumoDocumento(factura).aPagar, 1944);
    assert.equal(resumoDocumento({ ...factura, estado: "parcial", pagamentos: [{ valor_pago: "600.00" }, { valor_pago: "44.00" }] }).aPagar, 1300);
});

test("facturas encerradas não apresentam um montante a cobrar", () => {
    for (const estado of ["paga", "anulada", "transferida"]) assert.equal(resumoDocumento({ ...factura, estado }).aPagar, 0);
    assert.equal(resumoDocumento({ ...factura, divida_anterior_incluida: false, multa_anterior: 0 }).saldoAnterior, 0);
});

test("os estados vencidos e a moeda são consistentes nos dois formatos", () => {
    assert.equal(estadoDocumento({ ...factura, esta_vencida: true }).label, "Vencida");
    assert.equal(estadoDocumento({ ...factura, estado: "paga", esta_vencida: true }).label, "Paga");
    assert.equal(moedaDocumento(1944), "1.944,00\u00a0MT");
});

test("a consulta conserva a emissão e apresenta o saldo actualizado das origens", () => {
    const actual = resumoDocumento({ ...factura, total_pagar: 600, cobranca: {
        total_emitido: 2616, principal_anterior_emitido: 1800, multas_anteriores_emitidas: 216,
        saldo_anterior_actual: 672, saldo_actual: 1272, pagamentos_apos_emissao: 1344,
        consumo_emitido: 600, multa_emitida: 0, ajustamentos_posteriores: 0,
    } });
    assert.equal(actual.totalEmitido, 2616);
    assert.equal(actual.saldoAnterior, 672);
    assert.equal(actual.pago, 1344);
    assert.equal(actual.aPagar, 1272);
});
