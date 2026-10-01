import { AlertTriangle, Banknote, CheckCircle2, FileText } from "lucide-react";
import KpiCard from "@/Components/KpiCard";
import SeletorMes from "@/Components/SeletorMes";
import { formatMoney } from "@/lib/utils";

/**
 * Os mesmos 4 indicadores do mês que o painel principal mostra — facturado,
 * recebido, em aberto e pendentes — com o seletor de mês, para as páginas de
 * Facturas, Pagamentos e Leituras. `resumo` vem de ResumoMensal::facturas().
 * `filtros` (opcional) são os filtros da lista, para a troca de mês não os perder.
 */
export default function ResumoMes({ rota, mesReferencia, resumo, filtros = {}, children }) {
    const cartoes = [
        {
            label: "Total facturado",
            value: formatMoney(resumo.totalFacturado),
            detail: `${resumo.numeroFacturas} factura(s) emitida(s) em ${mesReferencia.rotulo}`,
            icon: FileText,
            tone: "cyan",
        },
        {
            label: "Recebido",
            value: formatMoney(resumo.recebidoNoMes),
            detail: "dinheiro recebido nesse mês",
            icon: CheckCircle2,
            tone: "emerald",
        },
        {
            label: "Em aberto",
            value: formatMoney(resumo.emAberto),
            detail: "falta pagar das facturas do mês",
            icon: Banknote,
            tone: "amber",
        },
        {
            label: "Facturas pendentes",
            value: resumo.pendentesCount + resumo.parciaisCount,
            detail:
                resumo.vencidasCount > 0
                    ? `${resumo.vencidasCount} já vencida(s)`
                    : resumo.parciaisCount > 0
                      ? `${resumo.parciaisCount} parcialmente paga(s)`
                      : "Nenhuma vencida",
            icon: AlertTriangle,
            tone: resumo.vencidasCount > 0 ? "rose" : "amber",
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
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {cartoes.map((cartao, indice) => (
                    <KpiCard key={cartao.label} {...cartao} delay={indice * 0.06} />
                ))}
            </div>
            {children}
        </section>
    );
}
