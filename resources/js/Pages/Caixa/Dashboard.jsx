import { Head, Link } from "@inertiajs/react";
import { ClipboardCheck } from "lucide-react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import { ListaTrabalho, SaudacaoPainel } from "@/Components/PainelPapel";
import StatusBadge from "@/Components/StatusBadge";
import { formatDateTime, formatMoney } from "@/lib/utils";

const METODOS = { dinheiro: "Dinheiro", mpesa: "M-Pesa", "e-mola": "E-Mola", banco: "Banco" };
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Painel do caixa: quanto entrou hoje, quem tem facturas em aberto e os últimos recibos. */
export default function Dashboard({ resumoHoje, ultimosPagamentos = [], facturasEmAberto = [], contadorFacturasEmAberto = 0 }) {
    const emFalta = (f) => Math.max(0, Number(f.total_pagar) - Number(f.total_pago ?? f.pagamentos_sum_valor_pago ?? 0));

    return (
        <AdminLayout>
            <Head title="Painel" />
            <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8">
                <SaudacaoPainel
                    ilustracao="pagamento"
                    frase={
                        contadorFacturasEmAberto > 0 ? (
                            <>
                                Há <strong className="text-ink dark:text-[#F2F5FB]">{contadorFacturasEmAberto} facturas em aberto</strong> para receber.
                            </>
                        ) : (
                            "Não há facturas em aberto."
                        )
                    }
                    accao={{ rotulo: "Receber pagamento", href: "/pagamentos?novo=1" }}
                />

                <AnimatedPanel className="flex flex-wrap items-center justify-between gap-4 p-6">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Caixa de hoje</span>
                        <strong className="text-[30px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(resumoHoje.totalRecebido)}</strong>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {resumoHoje.quantidade} {resumoHoje.quantidade === 1 ? "recibo emitido" : "recibos emitidos"} hoje
                        </span>
                    </div>
                    <Link
                        href="/pagamentos/fecho-caixa"
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-bold text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                    >
                        <ClipboardCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                        Fazer fecho do dia
                    </Link>
                </AnimatedPanel>

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <ListaTrabalho
                        titulo="Facturas em aberto"
                        contagem={contadorFacturasEmAberto}
                        verTodos="/pagamentos"
                        vazio="Ninguém tem nada para pagar."
                        itens={facturasEmAberto.map((f) => ({
                            chave: f.id,
                            href: `/pagamentos?factura_id=${f.id}`,
                            titulo: f.cliente?.nome ?? "Cliente removido",
                            detalhe: `${f.numero_factura} · ${ABREV[f.mes - 1]}/${f.ano}`,
                            direita: <strong className="text-[15px] tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(emFalta(f))}</strong>,
                        }))}
                    />
                    <ListaTrabalho
                        titulo="Últimos recibos"
                        verTodos="/pagamentos?aba=recibos"
                        vazio="Ainda não emitiu recibos."
                        itens={ultimosPagamentos.map((p) => ({
                            chave: p.id,
                            href: `/pagamentos/${p.numero_recibo}/imprimir`,
                            titulo: p.cliente?.nome ?? "Cliente removido",
                            detalhe: `${p.numero_recibo} · ${formatDateTime(p.created_at)} · ${METODOS[p.metodo_pagamento] ?? p.metodo_pagamento}`,
                            direita: <StatusBadge tone="emerald">{formatMoney(p.valor_pago)}</StatusBadge>,
                        }))}
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
