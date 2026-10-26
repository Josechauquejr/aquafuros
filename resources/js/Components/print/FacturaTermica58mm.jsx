import { usePage } from "@inertiajs/react";
import { QRCodeSVG } from "qrcode.react";
import { formatDate } from "@/lib/format";
import { avisoPenalizacao, moedaDocumento as formatCurrency, resumoDocumento, estadoDocumento, telefonePagamento } from "@/lib/facturaDocumento";
import { consumoLeitura } from "@/lib/consumoLeitura";

const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const estadoLabels = {
    paga: "PAGA",
    pendente: "PENDENTE",
    parcial: "PARCIAL",
    anulada: "ANULADA",
    transferida: "TRANSFERIDA",
};

const Linha = () => <div className="my-1.5 border-t border-dashed border-black" />;

/**
 * Recibo de factura em formato compacto para impressora térmica de 58mm.
 * Preto e branco por natureza — o estado é comunicado por texto + caixa,
 * nunca só por cor (as impressoras térmicas não imprimem a cores).
 */
export default function FacturaTermica58mm({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const { empresa } = usePage().props;
    const resumo = resumoDocumento(factura);
    const ehLigacao = factura.tipo === "ligacao";
    const leitura = factura.leitura;
    const consumo = leitura ? consumoLeitura(leitura) : (factura.consumo_m3 ?? null);
    const estimada = factura.tipo === "consumo_estimado";
    const tarifa = factura.cliente?.tarifa;
    const ehTarifaMinima = consumo !== null && tarifa && consumo <= Number(tarifa.consumo_minimo_m3);

    return (
        <div className="w-full text-[12px] font-semibold leading-tight text-black" style={{ breakInside: "avoid" }}>
            <div className="text-center">
                <p className="text-sm font-bold">{empresa?.nome ?? "AQUAFUROS"}</p>
                {empresa?.nuit && <p>NUIT: {empresa.nuit}</p>}
                <p>{empresa?.localizacao || "Gestão de Furos de Água"}</p>
            </div>
            <Linha />

            <p className="text-center font-bold">FACTURA {factura.numero_factura}</p>
            {ehLigacao && <p className="text-center">TAXA DE LIGAÇÃO DE ÁGUA</p>}
            <p className="text-center">Emitida {formatDate(factura.created_at)}</p>
            <Linha />

            <p className="text-[15px] font-black leading-snug">Cliente: {factura.cliente?.nome ?? "Cliente removido"}</p>
            <p>Nº: {factura.cliente?.numero_cliente ?? "—"}</p>
            <p>Tel: {factura.cliente?.telefone || "—"}</p>
            <p>End: {factura.cliente?.endereco || "—"}</p>
            <p>Bairro: {factura.cliente?.bairro || "—"}</p>
            <p>Tarifa: {factura.cliente?.tarifa?.nome ?? "—"}</p>
            {factura.cliente?.data_adesao && <p>Cliente desde: {formatDate(factura.cliente.data_adesao)}</p>}
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
                        <p>N.º da leitura: {leitura.numero_leitura ?? "—"}</p>
                    )}
                    {leitura && (
                        <p>
                            Leitura: {Number(leitura.leitura_anterior).toFixed(1)} → {Number(leitura.leitura_actual).toFixed(1)}
                            {primeiraLeitura ? " (inicial)" : ""}
                        </p>
                    )}
            {estimada ? <p>Consumo estimado: {Number(consumo ?? 0).toFixed(2)} m3 · sem leitura do visor</p> : consumo !== null && <p>Consumo actual: {consumo.toFixed(2)} m3</p>}
                    {!estimada && <p>
                        Consumo mês ant.:{" "}
                        {consumoAnterior !== null && consumoAnterior !== undefined
                            ? `${Number(consumoAnterior).toFixed(2)} m3`
                            : "—"}
                    </p>}
                </>
            )}
            <Linha />

            <div className="flex justify-between">
                    <span>Valor consumo</span>
                <span>{formatCurrency(resumo.consumoEmitido)}</span>
            </div>
            {resumo.acertoLeitura > 0 && <div className="flex justify-between"><span>Acerto de estimativas</span><span>{formatCurrency(resumo.acertoLeitura)}</span></div>}
            {ehTarifaMinima && (
                <p className="text-[9px] font-normal">
                    Tarifa mínima até {Number(tarifa.consumo_minimo_m3).toFixed(0)} m³
                </p>
            )}
            {resumo.anterior > 0 && (
                <div className="flex justify-between">
                    <span>Dívida anterior</span>
                    <span>{formatCurrency(resumo.anterior)}</span>
                </div>
            )}
            {resumo.penalizacoesAnteriores > 0 && (
                <div className="flex justify-between">
                    <span>Multas anteriores (incluídas)</span>
                    <span>{formatCurrency(resumo.penalizacoesAnteriores)}</span>
                </div>
            )}
            <div className="flex justify-between">
                <span>Multa na emissão</span>
                <span>{formatCurrency(resumo.multaEmitida)}</span>
            </div>
            <p>Total na emissão: {formatCurrency(resumo.totalEmitido)}</p>
            {resumo.pago > 0 && <p>Pagamentos posteriores: {formatCurrency(resumo.pago)}</p>}
            {resumo.ajustesPosteriores !== 0 && <p>Penalizações e ajustes posteriores: {formatCurrency(resumo.ajustesPosteriores)}</p>}
            {resumo.multasPrevistas > 0 && (
                <div className="flex justify-between">
                    <span>Multa prevista (a confirmar)</span>
                    <span>{formatCurrency(resumo.multasPrevistas)}</span>
                </div>
            )}
            <Linha />

            <p className="text-center font-bold">SALDO ACTUAL A PAGAR</p>
            <p className="text-center text-sm font-bold">{formatCurrency(resumo.aPagar)}</p>
            <div className="my-2 border-2 border-black px-2 py-1 text-center font-bold">
                <p className="text-[13px] uppercase">Aviso: multas e corte do fornecimento</p>
                <p className="mt-1 text-[12px]">{avisoPenalizacao}</p>
            </div>
            {!factura.cobranca && !factura.divida_anterior_incluida && Number(factura.divida_anterior) > 0 && (
                <>
                    <Linha />
                    <div className="flex justify-between">
                        <span>Facturas anteriores</span>
                        <span>{formatCurrency(factura.divida_anterior)}</span>
                    </div>
                    <p className="text-center font-bold">TOTAL EM DÍVIDA</p>
                    <p className="text-center text-sm font-bold">
                        {formatCurrency(Number(factura.total_pagar) + Number(factura.divida_anterior))}
                    </p>
                </>
            )}
            {resumo.origens.map(origem => <p key={origem.id} className="mt-1 text-[10px]">{origem.numero_factura}: {formatCurrency(origem.principal)} + multa {formatCurrency(origem.multa)}</p>)}
            <Linha />

            <p className="text-center">
                Estado: <span className="border border-black px-1 font-bold">{estadoDocumento(factura).label}</span>
            </p>
            <Linha />

            <p className="font-bold">Formas de pagamento:</p>
            {empresa?.mpesa_numero && <p>M-Pesa: {telefonePagamento(empresa.mpesa_numero)}{empresa.mpesa_titular ? ` - ${empresa.mpesa_titular}` : ""}</p>}
            {empresa?.emola_numero && <p>E-Mola: {telefonePagamento(empresa.emola_numero)}{empresa.emola_titular ? ` - ${empresa.emola_titular}` : ""}</p>}
            <Linha />

            {qrUrl && (
                <div className="flex flex-col items-center gap-1">
                    <QRCodeSVG value={qrUrl} size={56} level="M" />
                    <p className="text-[9px]">Verificar autenticidade</p>
                    <Linha />
                </div>
            )}

            <p className="text-center leading-snug">
                Software desenvolvido por RJM CONSULTORIA LDA
                <br />
                Documento sem necessidade de assinatura
            </p>
        </div>
    );
}
