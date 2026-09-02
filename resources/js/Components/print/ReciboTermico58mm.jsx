import { QRCodeSVG } from "qrcode.react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const metodoLabels = {
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
};

const estadoLabels = {
    paga: "PAGA",
    pendente: "PENDENTE",
    parcial: "PARCIAL",
    anulada: "ANULADA",
};

const Linha = () => <div className="my-1.5 border-t border-dashed border-black" />;

/**
 * Recibo de pagamento em formato compacto para impressora térmica de
 * 58mm — preto e branco, o estado da factura é texto + caixa, não cor.
 */
export default function ReciboTermico58mm({ pagamento, primeiraLeitura, qrUrl }) {
    const factura = pagamento.factura;
    const leitura = factura?.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;

    return (
        <div className="w-full text-[12px] font-semibold leading-tight text-black" style={{ breakInside: "avoid" }}>
            <div className="text-center">
                <p className="text-sm font-bold">AQUAFUROS</p>
                <p>Recibo de Pagamento</p>
            </div>
            <Linha />

            <p className="text-center font-bold">{pagamento.numero_recibo}</p>
            <p className="text-center">{formatDateTime(pagamento.created_at)}</p>
            <Linha />

            <p>Cliente: {pagamento.cliente?.nome ?? "Cliente removido"}</p>
            <p>Nº: {pagamento.cliente?.numero_cliente ?? "—"}</p>
            <p>Tel: {pagamento.cliente?.telefone || "—"}</p>
            <p>End: {pagamento.cliente?.endereco || "—"}</p>
            <p>Bairro: {pagamento.cliente?.bairro || "—"}</p>
            <Linha />

            {factura && (
                <>
                    <p>
                        Factura {factura.numero_factura} — {meses[factura.mes - 1]}/{factura.ano}
                    </p>
                    {leitura && (
                        <>
                            <p>
                                Leitura: {Number(leitura.leitura_anterior).toFixed(1)} → {Number(leitura.leitura_actual).toFixed(1)}
                                {primeiraLeitura ? " (inicial)" : ""}
                            </p>
                            {consumo !== null && <p>Consumo: {consumo.toFixed(2)} m3</p>}
                        </>
                    )}
                    <p className="mt-1">
                        Estado da factura:{" "}
                        <span className="border border-black px-1 font-bold">{estadoLabels[factura.estado]}</span>
                    </p>
                    <Linha />
                </>
            )}

            <p>
                Método: <strong>{metodoLabels[pagamento.metodo_pagamento] ?? pagamento.metodo_pagamento}</strong>
            </p>
            {pagamento.referencia_pagamento && <p>Ref: {pagamento.referencia_pagamento}</p>}
            <p>Recebido por: {pagamento.recebido_por?.name ?? "—"}</p>
            <Linha />

            <p className="text-center font-bold">VALOR PAGO</p>
            <p className="text-center text-sm font-bold">{formatCurrency(pagamento.valor_pago)}</p>
            <Linha />

            {qrUrl && (
                <div className="flex flex-col items-center gap-1">
                    <QRCodeSVG value={qrUrl} size={56} level="M" />
                    <p className="text-[9px]">Verificar autenticidade</p>
                    <Linha />
                </div>
            )}

            <p className="text-center leading-snug">
                RJM Consultórios e Serviços
                <br />
                Documento sem necessidade de assinatura
            </p>
        </div>
    );
}
