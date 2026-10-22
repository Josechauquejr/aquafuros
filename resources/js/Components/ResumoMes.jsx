import { AlertTriangle, Banknote, CheckCircle2, CircleCheck, Clock, FileText, Receipt, Smartphone, Waves } from "lucide-react";
import KpiCard from "@/Components/KpiCard";
import SeletorMes from "@/Components/SeletorMes";
import { formatMoney } from "@/lib/utils";

const metodoLabel = (metodo) => ({
    dinheiro: "Dinheiro",
    banco: "Transferência bancária",
    mpesa: "M-Pesa",
    "e-mola": "e-Mola",
}[metodo] ?? metodo);

/** Resumo mensal com indicadores próprios de cada área. */
export default function ResumoMes({ rota, mesReferencia, tipo = "facturas", dados, filtros = {}, children }) {
    const cartoes = tipo === "leituras" ? [
        { label: "Leituras do mês", value: dados.total, icon: Waves, tone: "cyan" },
        { label: "Confirmadas", value: dados.confirmadas, icon: CircleCheck, tone: "emerald" },
        { label: "Pendentes de confirmação", value: dados.pendentes, icon: Clock, tone: "amber" },
        { label: "Confirmadas sem factura", value: dados.semFactura, icon: FileText, tone: "rose" },
    ] : tipo === "pagamentos" ? [
        { label: "Total recebido", value: formatMoney(dados.totalRecebido), detail: `recebido em ${mesReferencia.rotulo}`, icon: CheckCircle2, tone: "emerald" },
        { label: "Pagamentos registados", value: dados.totalRegistados, detail: `recibos emitidos em ${mesReferencia.rotulo}`, icon: Receipt, tone: "cyan" },
        { label: "Método mais usado", value: dados.metodoMaisUsado ? metodoLabel(dados.metodoMaisUsado) : "Sem dados", icon: Smartphone, tone: "amber" },
    ] : [
        {
            label: "Total facturado",
            value: formatMoney(dados.totalFacturado),
            detail: `${dados.numeroFacturas} factura(s) emitida(s) em ${mesReferencia.rotulo}`,
            icon: FileText,
            tone: "cyan",
        },
        {
            label: "Em aberto",
            value: formatMoney(dados.emAberto),
            detail: "falta pagar das facturas emitidas no mês",
            icon: Banknote,
            tone: "amber",
        },
        {
            label: "Facturas por pagar",
            value: dados.pendentesCount + dados.parciaisCount,
            detail: dados.vencidasCount > 0
                ? `${dados.vencidasCount} já vencida(s)`
                : dados.parciaisCount > 0
                  ? `${dados.parciaisCount} parcialmente paga(s)`
                  : "Nenhuma vencida",
            icon: AlertTriangle,
            tone: dados.vencidasCount > 0 ? "rose" : "amber",
        },
    ];

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {mesReferencia.eActual ? "Este mês" : "Mês consultado"}: {mesReferencia.rotulo}
                </p>
                <SeletorMes rota={rota} mesReferencia={mesReferencia} extra={filtros} />
            </div>
            <div className={`grid grid-cols-2 gap-4 ${tipo === "leituras" ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
                {cartoes.map((cartao, indice) => (
                    <KpiCard key={cartao.label} {...cartao} delay={indice * 0.06} />
                ))}
            </div>
            {children}
        </section>
    );
}
