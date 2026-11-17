import { Head, Link, router, usePage } from "@inertiajs/react";
import { ArrowLeft, CheckCircle2, Pencil, Undo2 } from "lucide-react";
import { useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import ConfirmDialog from "@/Components/ConfirmDialog";
import PrimaryButton from "@/Components/PrimaryButton";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatDateTime, formatMoney, formatNumero } from "@/lib/utils";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
// O mesmo critério do aviso ao registar/confirmar (Leituras/Index): acima de 150% da média.
const FACTOR_ALERTA = 1.5;
const diaMes = (data) => {
    const d = new Date(String(data).replace(" ", "T"));
    return `${d.getDate()} ${ABREV[d.getMonth()]}`;
};

function Bloco({ rotulo, valor, destaque }) {
    return (
        <div className={cn("flex flex-1 flex-col gap-1 rounded-[14px] border p-4", destaque ? "border-[#B9CCFF] bg-[#F7F9FF] dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(0,89,255,0.10)]" : "border-[#E3E8F2] dark:border-slate-800")}>
            <span className={cn("text-[13px]", destaque ? "font-semibold text-brand dark:text-cyan-300" : "text-slate-500 dark:text-slate-400")}>{rotulo}</span>
            <strong className={cn("text-2xl tabular-nums", destaque ? "text-brand dark:text-cyan-300" : "text-ink dark:text-[#F2F5FB]")}>{valor}</strong>
        </div>
    );
}

/**
 * Leitura explicada: anterior → actual → consumo; régua do normal deste
 * cliente (média e limite de alerta); valor previsto na factura; e o que
 * acontece a seguir.
 */
export default function Show({ leitura, consumo, confirmadaPor, anteriores = [], tarifa, previsto, facturarAoConfirmar }) {
    const { auth } = usePage().props;
    const [confirmarAberto, setConfirmarAberto] = useState(false);
    const [desfazerAberto, setDesfazerAberto] = useState(false);
    const ehAdministrador = auth.roles?.includes("administrador");
    const cliente = leitura.cliente;
    const mes = MESES[leitura.mes - 1];
    const confirmada = Boolean(leitura.confirmado);
    const anterior = anteriores[0];
    const consumos = anteriores.map((a) => Number(a.consumo));
    const media = consumos.length ? consumos.reduce((t, c) => t + c, 0) / consumos.length : null;
    const alerta = media ? media * FACTOR_ALERTA : null;
    const escala = Math.max(consumo, alerta ?? 0, 1) * 1.15;
    const anormal = alerta !== null && consumo > alerta;
    const diferenca = media !== null ? consumo - media : null;

    const confirmar = () =>
        router.put(`/leituras/${leitura.id}`, { leitura_actual: leitura.leitura_actual, confirmado: true }, { preserveScroll: true, onFinish: () => setConfirmarAberto(false) });

    const passos = [
        { titulo: "Confirmar.", texto: "Um gestor ou técnico confere o número.", estado: confirmada ? "feito" : "agora" },
        {
            titulo: leitura.factura ? "Facturada." : facturarAoConfirmar ? "A factura sai ao confirmar." : "Facturar no fim do mês.",
            texto: leitura.factura ? `Entrou na factura ${leitura.factura.numero_factura}.` : `Entra no lote de facturas de ${mes}.`,
            estado: leitura.factura ? "feito" : confirmada ? "agora" : "depois",
        },
        { titulo: "O cliente paga até ao dia 10.", texto: tarifa?.percentagem_multa ? `Depois disso aplica-se a multa de ${formatNumero(tarifa.percentagem_multa, 0)}%.` : "Depois disso aplica-se a multa por atraso.", estado: "depois" },
    ];

    return (
        <AdminLayout>
            <Head title={`Leitura de ${mes} · ${cliente?.nome ?? ""}`} />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                <Link href="/leituras" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Leituras
                </Link>

                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">Leitura de {mes}</h1>
                            <StatusBadge tone={confirmada ? "emerald" : "amber"}>{confirmada ? "Confirmada" : "Por confirmar"}</StatusBadge>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {cliente ? (
                                <Link href={`/clientes/${cliente.numero_cliente}`} className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                    {cliente.nome} · {cliente.numero_cliente}
                                </Link>
                            ) : (
                                "Cliente removido"
                            )}{" "}
                            · registada a {formatDateTime(leitura.created_at)}
                            {leitura.registado_por ? ` por ${leitura.registado_por.name}` : ""}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {!confirmada && (
                            <PrimaryButton type="button" onClick={() => setConfirmarAberto(true)} className="min-h-[48px] px-6">
                                <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
                                Confirmar leitura
                            </PrimaryButton>
                        )}
                        {confirmada && !leitura.factura && ehAdministrador && (
                            <button
                                type="button"
                                onClick={() => setDesfazerAberto(true)}
                                className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-semibold text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]"
                            >
                                <Undo2 className="h-4 w-4" aria-hidden="true" />
                                Desfazer confirmação
                            </button>
                        )}
                        {(!confirmada || ehAdministrador) && (
                            <Link
                                href={`/leituras?search=${encodeURIComponent(cliente?.nome ?? "")}${confirmada ? "&estado=confirmadas" : "&estado=pendente"}`}
                                className="inline-flex min-h-[48px] items-center gap-2 rounded-md border border-[#DDE2EE] bg-white px-5 text-[15px] font-semibold text-ink hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]"
                            >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                {confirmada ? "Corrigir (administrador)" : "Corrigir valor"}
                            </Link>
                        )}
                    </div>
                </div>

                {confirmada && !leitura.factura && (
                    <p className="rounded-[14px] bg-emerald-50 px-[18px] py-3.5 text-[15px] text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300">
                        Leitura confirmada. Fica pronta para a facturação do fim do mês. A partir de agora só o administrador a pode corrigir.
                    </p>
                )}
                {leitura.correccao_activa && (
                    <p className="rounded-[14px] bg-cyan-100 px-[18px] py-3.5 text-[15px] text-brand dark:bg-[rgba(0,89,255,0.18)] dark:text-cyan-300">
                        Corrigida de {formatNumero(leitura.correccao_activa.leitura_antes)} para {formatNumero(leitura.correccao_activa.leitura_depois)} m³ por {leitura.correccao_activa.user?.name} — {leitura.correccao_activa.motivo}
                    </p>
                )}

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <AnimatedPanel className="flex flex-col gap-5 p-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-xl font-bold text-ink dark:text-[#F2F5FB]">O que esta leitura diz</h2>
                            <span className="text-sm text-slate-500 dark:text-slate-400">O consumo é a diferença entre o que o contador marca agora e o que marcava no mês passado.</span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Bloco rotulo={`Leitura anterior${anterior ? ` · ${diaMes(anterior.data)}` : ""}`} valor={`${formatNumero(leitura.leitura_anterior)} m³`} />
                            <Bloco rotulo={`Leitura deste mês · ${diaMes(leitura.created_at)}`} valor={`${formatNumero(leitura.leitura_actual)} m³`} />
                            <Bloco rotulo="Consumo do mês" valor={`${formatNumero(consumo)} m³`} destaque />
                        </div>

                        {media !== null ? (
                            <div className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8F2] p-4 dark:border-slate-800">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <strong className="text-[15px] text-ink dark:text-[#F2F5FB]">Comparado com o normal deste cliente</strong>
                                    <StatusBadge tone={anormal ? "amber" : "emerald"}>{anormal ? "Acima do normal" : "Dentro do normal"}</StatusBadge>
                                </div>
                                <div className="relative mt-4 h-3 rounded-full bg-[#E8ECF4] dark:bg-slate-800" role="img" aria-label={`Consumo ${formatNumero(consumo)} m³; média ${formatNumero(media)} m³; alerta acima de ${formatNumero(alerta)} m³`}>
                                    <span className="absolute inset-y-0 left-0 rounded-full bg-emerald-50 dark:bg-[rgba(46,160,99,0.16)]" style={{ width: `${(alerta / escala) * 100}%` }} />
                                    <span className="absolute -top-1 h-5 w-0.5 bg-slate-500" style={{ left: `${(media / escala) * 100}%` }} aria-hidden="true" />
                                    <span className="absolute -top-1 h-5 w-0.5 bg-amber-600" style={{ left: `${(alerta / escala) * 100}%` }} aria-hidden="true" />
                                    <span className={cn("absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white", anormal ? "bg-amber-600" : "bg-cyan-500")} style={{ left: `${Math.min(100, (consumo / escala) * 100)}%` }} aria-hidden="true" />
                                </div>
                                <div className="flex flex-wrap justify-between gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                                    <span>0 m³</span>
                                    <span>Média: {formatNumero(media)} m³</span>
                                    <span className="text-amber-700 dark:text-amber-300">Alerta acima de {formatNumero(alerta)} m³</span>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    {formatNumero(consumo)} m³ é {formatNumero(Math.abs(diferenca))} m³ {diferenca >= 0 ? "acima" : "abaixo"} da média dos últimos {consumos.length} {consumos.length === 1 ? "mês" : "meses"} ({consumos.map((c) => formatNumero(c)).join(", ")} m³). Só é marcado como anormal a partir de {formatNumero(alerta)} m³ (150% da média).
                                </p>
                            </div>
                        ) : (
                            <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-[#1E232D] dark:text-slate-300">É a primeira leitura deste cliente: ainda não há média para comparar.</p>
                        )}

                        {previsto !== null && (
                            <div className="flex flex-col gap-1 rounded-[14px] bg-slate-50 p-4 dark:bg-[#1E232D]">
                                <span className="text-sm text-slate-600 dark:text-slate-300">{leitura.factura ? `Valor na factura de ${mes}` : `Valor previsto na factura de ${mes}`}</span>
                                <strong className="text-[28px] tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(leitura.factura ? leitura.factura.valor_consumo : previsto)}</strong>
                                <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                    {consumo <= (tarifa?.consumo_minimo_m3 ?? 0)
                                        ? `Mínimo do mês (até ${formatNumero(tarifa.consumo_minimo_m3)} m³) · tarifa ${tarifa.nome.toLowerCase()}.`
                                        : `${formatNumero(consumo)} m³ × ${formatNumero(tarifa?.preco_m3 ?? 0)} MT (tarifa ${tarifa?.nome?.toLowerCase() ?? ""}).`}{" "}
                                    {!leitura.factura && "Pode mudar se houver dívida ou multas no dia da emissão."}
                                </span>
                            </div>
                        )}
                    </AnimatedPanel>

                    <div className="flex flex-col gap-4">
                        <AnimatedPanel className="flex flex-col gap-3.5 p-5">
                            <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">O QUE ACONTECE A SEGUIR</span>
                            <ol className="flex flex-col gap-3">
                                {passos.map((p, i) => (
                                    <li key={p.titulo} className="flex gap-3">
                                        <span
                                            className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                                p.estado === "feito" && "bg-emerald-50 text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300",
                                                p.estado === "agora" && "bg-brand text-white dark:bg-cyan-500",
                                                p.estado === "depois" && "bg-[#ECEFF5] text-slate-500 dark:bg-white/[0.06] dark:text-slate-400",
                                            )}
                                        >
                                            {i + 1}
                                        </span>
                                        <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                            <strong className="text-ink dark:text-[#F2F5FB]">{p.titulo}</strong> {p.texto}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </AnimatedPanel>
                        <AnimatedPanel className="flex flex-col gap-3 p-5">
                            <span className="text-xs font-bold tracking-[0.6px] text-slate-500 dark:text-slate-400">REGISTO</span>
                            {[
                                ["Registada por", leitura.registado_por?.name ?? "—"],
                                ["Quando", formatDateTime(leitura.created_at)],
                                ["Confirmada por", confirmada ? `${confirmadaPor ?? "—"}${leitura.confirmado_em ? ` · ${formatDateTime(leitura.confirmado_em)}` : ""}` : "—"],
                                ["Nº da leitura", leitura.numero_leitura ?? "—"],
                                ["Factura", leitura.factura ? leitura.factura.numero_factura : "Ainda não"],
                            ].map(([rotulo, valor]) => (
                                <div key={rotulo} className="flex justify-between gap-3 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">{rotulo}</span>
                                    {rotulo === "Factura" && leitura.factura ? (
                                        <Link href={`/facturas/${leitura.factura.numero_factura}`} className="font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                                            {valor}
                                        </Link>
                                    ) : (
                                        <strong className="text-right text-ink dark:text-[#F2F5FB]">{valor}</strong>
                                    )}
                                </div>
                            ))}
                        </AnimatedPanel>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                show={desfazerAberto}
                onClose={() => setDesfazerAberto(false)}
                onConfirm={() => router.put(`/leituras/${leitura.id}/desfazer-confirmacao`, {}, { preserveScroll: true, onFinish: () => setDesfazerAberto(false) })}
                tone="primary"
                ilustracao="contador"
                title="Desfazer a confirmação?"
                description="A leitura volta a ficar por confirmar e sai do lote de facturação até ser confirmada outra vez."
                confirmLabel="Desfazer"
            />
            <ConfirmDialog
                show={confirmarAberto}
                onClose={() => setConfirmarAberto(false)}
                onConfirm={confirmar}
                title={`Confirmar ${formatNumero(leitura.leitura_actual)} m³?`}
                description={`Consumo de ${formatNumero(consumo)} m³ para ${cliente?.nome ?? "o cliente"}.${anormal ? " Atenção: está acima do normal deste cliente." : ""} Depois de confirmada, só o administrador a pode corrigir.`}
                confirmLabel="Confirmar leitura"
            />
        </AdminLayout>
    );
}
