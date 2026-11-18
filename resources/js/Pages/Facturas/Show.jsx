import { Head, Link } from "@inertiajs/react";
import { AlertTriangle, ArrowLeft, Ban, Check, ChevronDown, Gauge, Pencil, Printer, ShieldCheck, Tag, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import SecondaryButton from "@/Components/SecondaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatDate, formatMoney, formatNumero } from "@/lib/utils";
import BarraProgresso from "@/Components/BarraProgresso";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const n = (v) => Number(v ?? 0);
const dinheiro = (v) => formatNumero(v, 2);
const diaMes = (data) => {
    if (!data) return "—";
    const d = new Date(String(data).slice(0, 10) + "T00:00:00");
    return `${d.getDate()} ${ABREV[d.getMonth()]}`;
};
const diasDesde = (data) => {
    const d = new Date(String(data).slice(0, 10) + "T00:00:00");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((hoje - d) / 86400000);
};

function estadoDaFactura(f) {
    if (f.estado === "anulada") return ["Anulada", "slate"];
    if (f.estado === "paga") return ["Paga", "emerald"];
    if (f.data_vencimento && diasDesde(f.data_vencimento) > 0) {
        const d = diasDesde(f.data_vencimento);
        return [`Vencida há ${d} ${d === 1 ? "dia" : "dias"}`, d > 30 ? "rose" : "amber"];
    }
    if (f.estado === "parcial") return ["Parcial", "cyan"];
    return ["Por pagar", "slate"];
}

function Passo({ numero, rotulo, valor, conta, icone: Icone, tom = "neutro", href }) {
    return (
        <li
            className={cn(
                "flex h-[180px] w-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-[16px] border p-4",
                tom === "multa" ? "border-[#F3DDB6] bg-[#FFF8EC] dark:border-[#796747] dark:bg-[#2D2B2C]" : "border-[#E3E8F2] bg-white dark:border-[#2A3140] dark:bg-[#161A22]",
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0059FF] text-xs font-bold text-white">{numero}</span>
                <Icone
                    className={cn(
                        "h-5 w-5",
                        tom === "multa" ? "text-amber-600 dark:text-[#F3C77A]" : tom === "ok" ? "text-emerald-700 dark:text-[#7DD3A3]" : tom === "neutro-cinza" ? "text-slate-500 dark:text-[#A8B3CC]" : "text-[#6EA2FF]",
                    )}
                    aria-hidden="true"
                />
            </div>
            <span className="truncate text-xs font-bold tracking-[0.6px] leading-[14px] text-slate-500 dark:text-slate-400">{rotulo}</span>
            <span className={cn("text-2xl font-extrabold tabular-nums leading-7", tom === "multa" ? "text-amber-700 dark:text-[#F3C77A]" : tom === "neutro-cinza" || tom === "ok" ? "text-slate-500 dark:text-[#A8B3CC]" : "text-ink dark:text-[#F2F5FB]")}>{valor}</span>
            <span className="line-clamp-2 text-[13px] leading-3 text-slate-500 dark:text-[#A8B3CC]">{conta}</span>
            {href && (
                <Link href={href} className="text-[13px] font-semibold leading-4 text-cyan-700 underline underline-offset-2 hover:text-cyan-800 dark:text-[#6EA2FF]">
                    Ver leitura →
                </Link>
            )}
        </li>
    );
}

function Resumo({ rotulo, children }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">{rotulo}</span>
            <span className="text-base font-semibold text-ink dark:text-[#F2F5FB]">{children}</span>
        </div>
    );
}

/**
 * Factura explicada: "Como chegámos a este valor" em 5 passos (do contador ao
 * total), "Se pagar uma parte" (principal → multa), linha do tempo e resumo.
 */
export default function Show({ factura, qrUrl }) {
    const [menuAberto, setMenuAberto] = useState(false);
    const menuRef = useRef(null);
    const cliente = factura.cliente;
    const tarifa = cliente?.tarifa;
    const leitura = factura.leitura;
    const mes = MESES[factura.mes - 1];
    const inicioPeriodo = new Date(Number(factura.ano), Number(factura.mes) - 2, 11);
    const fimPeriodo = new Date(Number(factura.ano), Number(factura.mes) - 1, 10);
    const periodo = `${inicioPeriodo.getDate()} ${ABREV[inicioPeriodo.getMonth()]} – ${fimPeriodo.getDate()} ${ABREV[fimPeriodo.getMonth()]}`;
    const [estado, tomEstado] = estadoDaFactura(factura);
    const emAberto = ["pendente", "parcial"].includes(factura.estado);

    const consumo = n(factura.consumo_m3 ?? (leitura ? n(leitura.leitura_actual) - n(leitura.leitura_anterior) : 0));
    const valorConsumo = n(factura.valor_consumo);
    const dividaAnterior = factura.divida_anterior_incluida ? n(factura.divida_anterior) : 0;
    const multa = n(factura.multa) + n(factura.multa_anterior) + n(factura.multa_prevista);
    const totalFactura = n(factura.total_pagar) + n(factura.multa_prevista);
    const pago = n(factura.total_pago);
    const saldoAposPagamentos = Math.max(0, totalFactura - pago);
    const falta = emAberto ? n(factura.em_falta) + n(factura.multa_prevista) : 0;
    const principal = Math.max(0, falta - (n(factura.multa_em_falta) + n(factura.multa_prevista)));
    const multaFalta = Math.max(0, falta - principal);
    const minimo = tarifa && consumo <= n(tarifa.consumo_minimo_m3);

    const [parte, setParte] = useState(Math.round(falta / 2));
    const pagoPrincipal = Math.min(parte, principal);
    const pagoMulta = Math.max(0, Math.min(parte - principal, multaFalta));

    useEffect(() => {
        if (!menuAberto) return undefined;
        const fechar = (e) => {
            if (e.type === "keydown" ? e.key === "Escape" : !menuRef.current?.contains(e.target)) setMenuAberto(false);
        };
        document.addEventListener("mousedown", fechar);
        document.addEventListener("keydown", fechar);
        return () => {
            document.removeEventListener("mousedown", fechar);
            document.removeEventListener("keydown", fechar);
        };
    }, [menuAberto]);

    const passos = [
        {
            rotulo: "ÁGUA GASTA",
            valor: `${formatNumero(consumo)} m³`,
            conta: leitura ? `${formatNumero(leitura.leitura_actual)} − ${formatNumero(leitura.leitura_anterior)}` : factura.tipo === "ligacao" ? "Taxa de ligação, sem consumo" : "Consumo estimado",
            icone: Gauge,
            href: leitura && !leitura.deleted_at ? `/leituras/${leitura.id}` : null,
        },
        {
            rotulo: factura.tipo === "ligacao" ? "TAXA DE LIGAÇÃO" : "CONSUMO",
            valor: dinheiro(valorConsumo),
            conta: !tarifa || factura.tipo === "ligacao" ? "valor fixo" : minimo ? `mínimo do mês (até ${formatNumero(tarifa.consumo_minimo_m3)} m³)` : `${formatNumero(consumo)} m³ × ${dinheiro(tarifa.preco_m3)}`,
            icone: Tag,
        },
        {
            rotulo: "DÍVIDA ANTERIOR",
            valor: `+ ${dinheiro(dividaAnterior)}`,
            conta: dividaAnterior > 0 ? "meses anteriores por pagar" : "nada em atraso",
            icone: Check,
            tom: dividaAnterior > 0 ? "neutro" : "ok",
        },
        {
            rotulo: "MULTA",
            valor: `+ ${dinheiro(multa)}`,
            conta: multa > 0 ? `${formatNumero(tarifa?.percentagem_multa ?? 0, 0)}% por atraso` : "sem multa",
            icone: AlertTriangle,
            tom: multa > 0 ? "multa" : "neutro-cinza",
        },
        {
            rotulo: "JÁ PAGO",
            valor: `− ${dinheiro(pago)}`,
            conta: (factura.pagamentos ?? []).length ? `${factura.pagamentos.length} ${factura.pagamentos.length === 1 ? "pagamento" : "pagamentos"}` : "sem pagamentos",
            icone: Wallet,
            tom: "neutro-cinza",
        },
    ];

    const linhaTempo = [
        { titulo: "Emitida", quando: diaMes(factura.created_at), cor: "bg-cyan-500" },
        ...(factura.data_vencimento ? [{ titulo: diasDesde(factura.data_vencimento) > 0 ? "Venceu" : "Vence", quando: diaMes(factura.data_vencimento), cor: diasDesde(factura.data_vencimento) > 0 ? "bg-amber-600" : "bg-[#B9CCFF]" }] : []),
        ...(multa > 0 && factura.data_vencimento ? [{ titulo: "Multa", quando: diaMes(new Date(new Date(String(factura.data_vencimento).slice(0, 10)).getTime() + 86400000).toISOString()), cor: "bg-amber-600" }] : []),
        ...(factura.pagamentos ?? []).map((p) => ({ titulo: `Pagou ${formatMoney(p.valor_pago)}`, quando: diaMes(p.pago_em ?? p.created_at), cor: "bg-emerald-600" })),
        ...(factura.anulada_em ? [{ titulo: "Anulada", quando: diaMes(factura.anulada_em), cor: "bg-rose-600" }] : []),
    ];

    const linhaMenu = "flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.06]";

    return (
        <AdminLayout>
            <Head title={`Factura ${factura.numero_factura}`} />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <Link href="/facturas" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Facturas
                </Link>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">
                                {factura.tipo === "ligacao" ? "Taxa de ligação" : `Factura de ${mes}`}
                            </h1>
                            <StatusBadge tone={tomEstado}>{estado}</StatusBadge>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {factura.numero_factura} ·{" "}
                            {cliente ? (
                                <Link href={`/clientes/${cliente.numero_cliente}`} className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    {cliente.nome}
                                </Link>
                            ) : (
                                "Cliente removido"
                            )}
                            {factura.data_vencimento ? ` · vence ${formatDate(factura.data_vencimento)}` : ""}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {emAberto && (
                            <Link
                                href={`/pagamentos?factura_id=${factura.id}`}
                                className="inline-flex min-h-[48px] items-center gap-2 rounded-md bg-brand px-5 text-[15px] font-bold text-white hover:bg-brand-hover dark:bg-cyan-500 dark:hover:bg-cyan-600"
                            >
                                <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                                Receber pagamento
                            </Link>
                        )}
                        <a
                            href={`/facturas/${factura.numero_factura}/imprimir`}
                            className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-semibold text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]"
                        >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            Imprimir
                        </a>
                        {factura.estado !== "anulada" && (
                            <div ref={menuRef} className="relative">
                                <SecondaryButton type="button" onClick={() => setMenuAberto((v) => !v)} aria-haspopup="menu" aria-expanded={menuAberto} className="min-h-[48px]">
                                    Mais
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </SecondaryButton>
                                {menuAberto && (
                                    <div role="menu" className="absolute right-0 top-[56px] z-30 flex w-60 flex-col rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#262C38]">
                                        {factura.estado === "pendente" && (
                                            <Link role="menuitem" href={`/facturas?editar=${factura.id}`} className={cn(linhaMenu, "text-ink dark:text-[#F2F5FB]")}>
                                                <Pencil className="h-4 w-4 text-slate-500" aria-hidden="true" /> Editar multa ou ajuste
                                            </Link>
                                        )}
                                        <Link role="menuitem" href={`/facturas?anular=${factura.id}`} className={cn(linhaMenu, "text-rose-700 dark:text-rose-300")}>
                                            <Ban className="h-4 w-4" aria-hidden="true" /> Anular factura
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {factura.estado === "anulada" && (
                    <p className="rounded-[14px] bg-slate-100 px-[18px] py-3.5 text-[15px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        Esta factura foi anulada{factura.anulada_por ? ` por ${factura.anulada_por.name}` : ""}
                        {factura.anulada_em ? ` a ${formatDate(factura.anulada_em)}` : ""}. {factura.motivo_anulacao ? `Motivo: ${factura.motivo_anulacao}.` : ""} Não foi apagada: continua no histórico.
                    </p>
                )}

                <AnimatedPanel className="flex min-h-[360px] w-full max-w-[1046px] shrink-0 flex-col gap-5 bg-white p-6 dark:border-[#2A3140] dark:bg-[#161A22]">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-bold text-ink dark:text-[#F2F5FB]">Como chegámos a <span className="text-[#0059FF] dark:text-[#6EA2FF]">{formatMoney(saldoAposPagamentos)}</span></h2>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Do contador ao {pago > 0 ? "saldo atual" : "valor final"}, em 5 passos.</span>
                    </div>
                    <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(166px,1fr))] gap-3 p-0">
                        {passos.map((passo, i) => (
                            <Passo key={passo.rotulo} numero={i + 1} {...passo} />
                        ))}
                    </ol>
                    {totalFactura > 0 && (
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">DE QUE É FEITO O TOTAL</span>
                            <div
                                className="flex h-9 w-full max-w-[1046px] overflow-hidden rounded-[10px] bg-[#E8ECF4] text-xs font-bold dark:bg-slate-800"
                                role="img"
                                aria-label={`Composição do total: ${factura.tipo === "ligacao" ? "taxa" : "consumo"} ${dinheiro(valorConsumo)}${dividaAnterior > 0 ? `, dívida anterior ${dinheiro(dividaAnterior)}` : ""}${multa > 0 ? `, multa ${dinheiro(multa)}` : ""}`}
                            >
                                <span
                                    className="flex h-full min-w-0 items-center overflow-hidden whitespace-nowrap bg-[linear-gradient(90deg,#6EA2FF_0%,#0059FF_55%,#041A53_100%)] px-3 text-white dark:bg-[linear-gradient(90deg,#0059FF_0%,#3A7FFE_100%)]"
                                    style={{ width: `${(valorConsumo / totalFactura) * 100}%` }}
                                >
                                    <span className="truncate">{factura.tipo === "ligacao" ? "Taxa" : "Consumo"} {dinheiro(valorConsumo)}</span>
                                </span>
                                {dividaAnterior > 0 && (
                                    <span
                                        className="flex h-full min-w-0 items-center overflow-hidden whitespace-nowrap border-l border-white bg-[#9DBBFF] px-3 text-[#041A53] dark:border-[#0B0D12]"
                                        style={{ width: `${(dividaAnterior / totalFactura) * 100}%` }}
                                    >
                                        <span className="truncate">Dívida {dinheiro(dividaAnterior)}</span>
                                    </span>
                                )}
                                {multa > 0 && (
                                    <span
                                        className="flex h-full min-w-0 items-center justify-center overflow-hidden whitespace-nowrap border-l border-white bg-[linear-gradient(90deg,#F0A93B_0%,#B86A00_60%,#8A4F00_100%)] px-3 text-white dark:border-[#0B0D12] dark:bg-[linear-gradient(90deg,#E9B35B_0%,#E1A140_100%)] dark:text-[#1F232E]"
                                        style={{ width: `${(multa / totalFactura) * 100}%` }}
                                    >
                                        <span className="truncate">Multa {dinheiro(multa)}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </AnimatedPanel>

                <div className="grid items-stretch gap-6 lg:grid-cols-2">
                    {emAberto && falta > 0 ? (
                        <AnimatedPanel className="flex h-full flex-col gap-3 rounded-[16px] border-[#E3E8F2] bg-white p-4 shadow-none dark:border-[#2A3140] dark:bg-[#161A22]">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Se pagar uma parte</h2>
                                <span className="text-sm text-slate-500 dark:text-slate-400">1.º principal → 2.º multa</span>
                            </div>
                            <label className="flex flex-wrap items-center gap-3 text-[13px] text-slate-600 dark:text-slate-300">
                                Paga
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.round(falta)}
                                    step="1"
                                    value={parte}
                                    onChange={(e) => setParte(Number(e.target.value))}
                                    aria-label="Valor pago"
                                    className="min-w-[160px] flex-1 accent-brand dark:accent-cyan-400"
                                />
                                <strong className="text-[20px] font-extrabold tabular-nums leading-6 text-ink dark:text-[#F2F5FB]">{formatMoney(parte)}</strong>
                            </label>
                            <div className="flex flex-col gap-2 text-[13px]">
                                <div className="flex items-center gap-3">
                                    <span className="w-[74px] text-[13px] font-bold text-ink dark:text-[#F2F5FB]">Consumo</span>
                                    <BarraProgresso pct={principal > 0 ? (pagoPrincipal / principal) * 100 : 0} className="h-2 flex-1" />
                                    <span className="w-[120px] text-right text-[13px] tabular-nums text-ink dark:text-[#F2F5FB]">{dinheiro(pagoPrincipal)} / {dinheiro(principal)}</span>
                                </div>
                                {multaFalta > 0 && (
                                    <div className="flex items-center gap-3">
                                        <span className="w-[74px] text-[13px] font-bold text-ink dark:text-[#F2F5FB]">Multa</span>
                                        <BarraProgresso pct={(pagoMulta / multaFalta) * 100} cor="ambar" className="h-2 flex-1" />
                                        <span className="w-[120px] text-right text-[13px] tabular-nums text-ink dark:text-[#F2F5FB]">{dinheiro(pagoMulta)} / {dinheiro(multaFalta)}</span>
                                    </div>
                                )}
                            </div>
                            <p className="rounded-md bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-600 dark:bg-[#1E232D] dark:text-slate-300">
                                {parte >= falta ? "Fica tudo pago." : `Fica a faltar ${formatMoney(falta - parte)}${pagoPrincipal < principal ? ", e a multa continua por pagar" : ""}.`}
                            </p>
                        </AnimatedPanel>
                    ) : null}

                    <AnimatedPanel className="flex h-full flex-col gap-4 p-6">
                        <h2 className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Linha do tempo</h2>
                        <div className="overflow-x-auto pb-1">
                            <ol className="relative flex min-w-max items-start justify-between gap-8 px-3 pt-1 before:absolute before:left-7 before:right-7 before:top-5 before:h-[2px] before:bg-[#DDE2EE] dark:before:bg-[#2A3140]">
                                {linhaTempo.map((t, i) => (
                                    <li key={`${t.titulo}-${i}`} className="relative z-10 flex min-w-[88px] flex-1 flex-col items-center gap-1.5 text-center">
                                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-[2px] bg-white dark:bg-[#161A22]", t.cor === "bg-amber-600" ? "border-amber-500 bg-amber-100 dark:bg-[#3A3327]" : t.cor === "bg-emerald-600" ? "border-emerald-500 bg-emerald-100 dark:bg-[#23372F]" : t.cor === "bg-rose-600" ? "border-rose-500 bg-rose-100 dark:bg-[#3B292D]" : t.cor === "bg-[#B9CCFF]" ? "border-[#6EA2FF] bg-[#DCE7FF] dark:bg-[#26334B]" : "border-[#0059FF] bg-[#DCE7FF] dark:bg-[#182C54]")} aria-hidden="true">
                                            <span className={cn("h-3 w-3 rounded-full", t.cor)} />
                                        </span>
                                        <strong className="text-[13px] leading-4 text-ink dark:text-[#F2F5FB]">{t.titulo}</strong>
                                        <span className="text-xs text-slate-500 dark:text-[#A8B3CC]">{t.quando}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        {qrUrl && (
                            <a href={qrUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-start gap-2.5 rounded-md bg-slate-50 p-3 text-[13px] text-slate-600 hover:bg-slate-100 dark:bg-[#1E232D] dark:text-slate-300">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                                <span>
                                    <strong className="text-ink dark:text-[#F2F5FB]">Código de verificação.</strong> Prova que a factura é verdadeira.
                                </span>
                            </a>
                        )}
                    </AnimatedPanel>
                </div>

                <AnimatedPanel className="flex flex-col gap-5 rounded-[18px] p-[24px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="resumo" className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">RESUMO DA FACTURA</h2>
                        <StatusBadge tone={tomEstado}>{estado}</StatusBadge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <Resumo rotulo="CLIENTE">
                            {cliente ? (
                                <Link href={`/clientes/${cliente.id}`} className="text-[#0059FF] underline underline-offset-2 hover:text-[#0047CC] dark:text-[#6EA2FF] dark:hover:text-[#8AB5FF]">
                                    {cliente.nome}
                                </Link>
                            ) : "—"}
                        </Resumo>
                        <Resumo rotulo="Nº DA FACTURA">{factura.numero_factura}</Resumo>
                        <Resumo rotulo="PERÍODO">{periodo}</Resumo>
                        <Resumo rotulo="LEITURAS">{leitura ? `${formatNumero(leitura.leitura_anterior)} → ${formatNumero(leitura.leitura_actual)} m³` : "—"}</Resumo>
                        <Resumo rotulo="EMITIDA">{formatDate(factura.created_at)}</Resumo>
                        <Resumo rotulo="VENCIMENTO">{factura.data_vencimento ? formatDate(factura.data_vencimento) : "—"}</Resumo>
                        <Resumo rotulo="TARIFA">{tarifa ? `${dinheiro(tarifa.preco_m3)} MT/m³ · mín. ${dinheiro(tarifa.taxa_minima)}` : "—"}</Resumo>
                    </div>
                    <div className="grid grid-cols-1 overflow-hidden rounded-[14px] border border-[#E1E7F3] dark:border-[#2A3140] sm:grid-cols-3">
                        <div className="flex flex-col gap-0.5 border-b border-[#E1E7F3] px-3.5 py-3.5 dark:border-[#2A3140] sm:border-b-0 sm:border-r">
                            <span className="text-xs text-slate-500 dark:text-[#A8B3CC]">Total da factura</span>
                            <strong className="text-[22px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(totalFactura)}</strong>
                            <span className="text-xs text-slate-500 dark:text-[#A8B3CC]">
                                {dinheiro(valorConsumo)}
                                {dividaAnterior > 0 ? ` + d\u00edvida ${dinheiro(dividaAnterior)}` : ""}
                                {multa > 0 ? ` + multa ${dinheiro(multa)}` : ""}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 border-b border-[#E1E7F3] px-3.5 py-3.5 dark:border-[#2A3140] sm:border-b-0 sm:border-r">
                            <span className="text-xs text-slate-500 dark:text-[#A8B3CC]">J\u00e1 pago</span>
                            <strong className="text-[22px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(pago)}</strong>
                            <span className="text-xs text-slate-500 dark:text-[#A8B3CC]">{pago > 0 ? `${factura.pagamentos.length} pagamento(s)` : "sem pagamentos"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 bg-[#FFF0EF] px-3.5 py-3.5 dark:bg-[#342D32]">
                            <span className={cn("text-xs", falta > 0 ? "font-semibold text-rose-700 dark:text-[#F2A09A]" : "text-slate-500 dark:text-[#A8B3CC]")}>Falta pagar</span>
                            <strong className={cn("text-[22px] font-bold tabular-nums", falta > 0 ? "text-rose-700 dark:text-[#F2A09A]" : "text-emerald-700 dark:text-[#7DD3A3]")}>{falta > 0 ? formatMoney(falta) : "Nada"}</strong>
                            {falta > 0 && tarifa && falta >= n(tarifa.limiar_corte) && <span className="text-xs font-medium text-rose-700 dark:text-[#F2A09A]">acima do limiar de corte</span>}
                        </div>
                    </div>
                </AnimatedPanel>

            </div>
        </AdminLayout>
    );
}
