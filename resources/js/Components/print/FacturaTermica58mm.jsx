import { QRCodeSVG } from "qrcode.react";
import { formatCurrency, formatDate } from "@/lib/utils";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const estadoLabels = {
    paga: "PAGA",
    pendente: "PENDENTE",
    parcial: "PARCIAL",
    anulada: "ANULADA",
};

const Linha = () => <div className="my-1.5 border-t border-dashed border-black" />;

/**
 * Recibo de factura em formato compacto para impressora térmica de 58mm.
 * Preto e branco por natureza — o estado é comunicado por texto + caixa,
 * nunca só por cor (as impressoras térmicas não imprimem a cores).
 */
export default function FacturaTermica58mm({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const ehLigacao = factura.tipo === "ligacao";
    const leitura = factura.leitura;
    const consumo = leitura ? Number(leitura.leitura_actual) - Number(leitura.leitura_anterior) : null;

    return (
        <div className="w-full text-[12px] font-semibold leading-tight text-black" style={{ breakInside: "avoid" }}>
            <div className="text-center">
                <p className="text-sm font-bold">AQUAFUROS</p>
                <p>Gestão de Furos de Água</p>
            </div>
            <Linha />

            <p className="text-center font-bold">FACTURA {factura.numero_factura}</p>
            {ehLigacao && <p className="text-center">TAXA DE LIGAÇÃO DE ÁGUA</p>}
            <p className="text-center">Emitida {formatDate(factura.created_at)}</p>
            <Linha />

            <p>Cliente: {factura.cliente?.nome ?? "Cliente removido"}</p>
            <p>Nº: {factura.cliente?.numero_cliente ?? "—"}</p>
            <p>Tel: {factura.cliente?.telefone || "—"}</p>
            <p>End: {factura.cliente?.endereco || "—"}</p>
            <p>Bairro: {factura.cliente?.bairro || "—"}</p>
            <p>Tarifa: {factura.cliente?.tarifa?.nome ?? "—"}</p>
            <Linha />

            {ehLigacao ? (
                <>
                    <p>Taxa única de novo contrato de água.</p>
                    <p>Sem leitura de consumo associada.</p>
                </>
            ) : (
                <>
                    <p>Período: {meses[factura.mes - 1]}/{factura.ano}</p>
                    {leitura && (
                        <p>
                            Leitura: {Number(leitura.leitura_anterior).toFixed(1)} → {Number(leitura.leitura_actual).toFixed(1)}
                            {primeiraLeitura ? " (inicial)" : ""}
                        </p>
                    )}
                    {consumo !== null && <p>Consumo actual: {consumo.toFixed(2)} m3</p>}
                    <p>
                        Consumo mês ant.:{" "}
                        {consumoAnterior !== null && consumoAnterior !== undefined
                            ? `${Number(consumoAnterior).toFixed(2)} m3`
                            : "—"}
                    </p>
                </>
            )}
            <Linha />

            <div className="flex justify-between">
                <span>Valor consumo</span>
                <span>{formatCurrency(factura.valor_consumo)}</span>
            </div>
            <div className="flex justify-between">
                <span>Dívida anterior</span>
                <span>{formatCurrency(factura.divida_anterior)}</span>
            </div>
            <div className="flex justify-between">
                <span>Multa</span>
                <span>{formatCurrency(factura.multa)}</span>
            </div>
            <Linha />

            <p className="text-center font-bold">TOTAL A PAGAR</p>
            <p className="text-center text-sm font-bold">{formatCurrency(factura.total_pagar)}</p>
            <Linha />

            <p className="text-center">
                Estado: <span className="border border-black px-1 font-bold">{estadoLabels[factura.estado]}</span>
            </p>
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
