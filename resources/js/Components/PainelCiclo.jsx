import { Link, usePage } from "@inertiajs/react";
import { AlertTriangle, ArrowRight, Check, Droplet, Info, Waves } from "lucide-react";
import Ilustracao from "@/Components/Ilustracao";
import StatusBadge from "@/Components/StatusBadge";
import { cn, formatMoney } from "@/lib/utils";
import BarraProgresso from "@/Components/BarraProgresso";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const cartao = "rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function saudacao(hora) {
    if (hora < 12) return "Bom dia";
    if (hora < 19) return "Boa tarde";
    return "Boa noite";
}

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/**
 * Em que passo do ciclo estamos: ler → confirmar → facturar → receber → cobrar.
 * Os passos para trás já estão feitos; só o actual tem cor (Von Restorff).
 */
function passoActual({ ciclo, contadores, mes }) {
    if (ciclo.lidas < ciclo.clientes) return 1;
    if (contadores.leiturasPendentes > 0) return 2;
    if (contadores.leiturasSemFactura > 0 || mes.numeroFacturas === 0) return 3;
    return 4;
}

function proximaAccao(passo, ciclo) {
    return [
        null,
        { frase: <>Hoje o mais importante são as <strong className="text-ink dark:text-[#F2F5FB]">leituras de {ciclo.mes}</strong>.</>, rotulo: "Continuar leituras", href: "/leituras" },
        { frase: <>As leituras estão feitas. Falta <strong className="text-ink dark:text-[#F2F5FB]">confirmá-las</strong> para poder facturar.</>, rotulo: "Confirmar leituras", href: "/leituras?estado=pendente" },
        { frase: <>Leituras confirmadas. Está na hora de <strong className="text-ink dark:text-[#F2F5FB]">facturar {ciclo.mes}</strong>.</>, rotulo: `Facturar ${ciclo.mes}`, href: "/facturas" },
        { frase: <>As facturas de {ciclo.mes} estão emitidas. Agora é <strong className="text-ink dark:text-[#F2F5FB]">receber até {ciclo.vence}</strong>.</>, rotulo: "Receber pagamento", href: "/pagamentos?novo=1" },
    ][passo];
}

function Passo({ numero, titulo, estado, children }) {
    const activo = estado === "activo";
    const feito = estado === "feito";

    return (
        <li
            aria-current={activo ? "step" : undefined}
            className={cn(
                "flex flex-col gap-2 rounded-[14px] border p-4",
                activo
                    ? "border-[#B9CCFF] bg-[#F7F9FF] dark:border-[rgba(110,162,255,0.32)] dark:bg-[rgba(0,89,255,0.10)]"
                    : "border-[#E3E8F2] text-slate-500 dark:border-slate-800 dark:text-slate-400",
            )}
        >
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        activo && "bg-brand text-white dark:bg-cyan-500",
                        feito && "bg-emerald-50 text-emerald-700 dark:bg-[rgba(46,160,99,0.16)] dark:text-emerald-300",
                        !activo && !feito && "bg-[#E8ECF4] dark:bg-slate-800",
                    )}
                >
                    {feito ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : numero}
                </span>
                <strong className={cn("text-[15px]", activo ? "text-ink dark:text-[#F2F5FB]" : "text-slate-600 dark:text-slate-300")}>{titulo}</strong>
            </div>
            {children}
        </li>
    );
}

function FaixaCiclo({ ciclo, contadores, mes, passo }) {
    const mesNum = MESES.indexOf(ciclo.mes);
    const seguinte = ABREV[(mesNum + 1) % 12];
    const inicio = `11 ${ABREV[mesNum]}`;
    const progresso = ciclo.clientes > 0 ? Math.round((ciclo.lidas / ciclo.clientes) * 100) : 0;
    const estado = (n) => (n < passo ? "feito" : n === passo ? "activo" : "por-fazer");
    const atrasado = ciclo.diasParaLimite < 0;
    const linhaActiva = "text-[13px] font-semibold text-brand dark:text-cyan-300";
    const numero = "text-[22px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]";
    const deTotal = "text-[15px] font-medium text-slate-600 dark:text-slate-300";

    return (
        <section aria-labelledby="ciclo" className={cn(cartao, "flex flex-col gap-[18px] p-6")}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="ciclo" className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Ciclo de {ciclo.mes}</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {inicio} – {ciclo.vence} · estamos no passo {passo} de 5
                </span>
            </div>
            <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 p-0">
                <Passo numero={1} titulo="Ler contadores" estado={estado(1)}>
                    {passo === 1 ? (
                        <>
                            <span className={numero}>
                                {ciclo.lidas} <span className={deTotal}>de {ciclo.clientes}</span>
                            </span>
                            <BarraProgresso pct={Math.max(progresso, 2)} className="h-1.5" fundo="bg-cyan-200 dark:bg-slate-800" />
                            <span className={cn(linhaActiva, atrasado && "text-amber-700 dark:text-amber-300")}>
                                {atrasado ? `Atrasado · o limite era ${ciclo.leiturasAte}` : `Em curso · até ${ciclo.leiturasAte}`}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm">{ciclo.clientes} lidas</span>
                    )}
                </Passo>
                <Passo numero={2} titulo="Confirmar" estado={estado(2)}>
                    {passo === 2 ? (
                        <>
                            <span className={numero}>
                                {contadores.leiturasPendentes} <span className={deTotal}>por confirmar</span>
                            </span>
                            <span className={linhaActiva}>Em curso</span>
                        </>
                    ) : (
                        <span className="text-sm">{passo > 2 ? "Todas confirmadas" : "Depois das leituras"}</span>
                    )}
                </Passo>
                <Passo numero={3} titulo="Facturar" estado={estado(3)}>
                    {passo === 3 ? (
                        <>
                            <span className={numero}>
                                {contadores.leiturasSemFactura} <span className={deTotal}>prontas</span>
                            </span>
                            <span className={linhaActiva}>Em curso · fim do mês</span>
                        </>
                    ) : (
                        <span className="text-sm">{passo > 3 ? plural(mes.numeroFacturas, "factura emitida", "facturas emitidas") : "Fim do mês"}</span>
                    )}
                </Passo>
                <Passo numero={4} titulo="Receber" estado={estado(4)}>
                    {passo === 4 ? (
                        <>
                            <span className={numero}>{mes.taxaCobranca ?? 0}%</span>
                            <span className={linhaActiva}>Em curso · vence {ciclo.vence}</span>
                        </>
                    ) : (
                        <span className="text-sm">Vence a {ciclo.vence}</span>
                    )}
                </Passo>
                <Passo numero={5} titulo="Cobrar" estado={estado(5)}>
                    <span className="text-sm">A partir de 11 {seguinte}</span>
                </Passo>
            </ol>
        </section>
    );
}

const NIVEIS = {
    alto: { etiqueta: "Risco", tom: "rose", icone: AlertTriangle, caixa: "bg-rose-100 text-rose-700 dark:bg-[rgba(244,163,154,0.14)] dark:text-rose-300" },
    medio: { etiqueta: "Atenção", tom: "amber", icone: AlertTriangle, caixa: "bg-amber-50 text-amber-700 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300" },
    leitura: { etiqueta: "Atenção", tom: "amber", icone: Droplet, caixa: "bg-amber-50 text-amber-700 dark:bg-[rgba(243,199,122,0.14)] dark:text-amber-300" },
    lembrete: { etiqueta: "Lembrete", tom: "cyan", icone: Waves, caixa: "bg-cyan-100 text-brand dark:bg-[#1E232D] dark:text-cyan-300" },
    info: { etiqueta: "Informação", tom: "cyan", icone: Info, caixa: "bg-cyan-100 text-brand dark:bg-[#1E232D] dark:text-cyan-300" },
};

function AtencaoLista({ itens, verTodos }) {
    return (
        <section aria-labelledby="atencao" className={cn(cartao, "min-w-0 flex-[3_1_420px] overflow-hidden")}>
            <div className="flex items-baseline justify-between gap-2 px-6 py-5">
                <h2 id="atencao" className="text-lg font-bold text-ink dark:text-[#F2F5FB]">
                    A precisar de atenção{" "}
                    {itens.length > 0 && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">· {itens.length}</span>}
                </h2>
                {verTodos && itens.length > 0 && (
                    <Link href="/notificacoes-sistema" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                        Ver todos
                    </Link>
                )}
            </div>
            {itens.length === 0 ? (
                <div className="flex flex-wrap items-center gap-4 border-t border-[#E8ECF4] px-6 py-6 dark:border-slate-800">
                    <Ilustracao nome="sucesso" largura={96} />
                    <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                        <strong className="text-base text-ink dark:text-[#F2F5FB]">Nada por tratar</strong>
                        <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            Quando houver clientes em risco, promessas falhadas ou leituras em atraso, aparecem aqui.
                        </span>
                    </div>
                </div>
            ) : (
                itens.map((item) => {
                    const nivel = NIVEIS[item.nivel] ?? NIVEIS.info;
                    const Icone = nivel.icone;
                    return (
                        <div key={item.chave} className="flex flex-wrap items-start gap-4 border-t border-[#E8ECF4] px-6 py-5 dark:border-slate-800">
                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", nivel.caixa)}>
                                <Icone className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                            </span>
                            <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                                <strong className="text-base text-ink dark:text-[#F2F5FB]">{item.titulo}</strong>
                                <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.detalhe}</span>
                                <span
                                    className={cn(
                                        "text-[13px] font-semibold",
                                        nivel.tom === "rose" && "text-rose-700 dark:text-rose-300",
                                        nivel.tom === "amber" && "text-amber-700 dark:text-amber-300",
                                        nivel.tom === "cyan" && "text-brand dark:text-cyan-300",
                                    )}
                                >
                                    {nivel.etiqueta}
                                </span>
                            </div>
                            {item.href && (
                                <Link
                                    href={item.href}
                                    className="inline-flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#DDE2EE] px-4 text-sm font-semibold text-ink hover:bg-slate-50 dark:border-slate-800 dark:text-[#F2F5FB] dark:hover:bg-[#1E232D]"
                                >
                                    <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                                    {item.accao ?? "Ver"}
                                </Link>
                            )}
                        </div>
                    );
                })
            )}
        </section>
    );
}

function DinheiroDoMes({ ciclo, mes, dividaTotal, facturasVencidas, contadores }) {
    const mesAnterior = MESES[(MESES.indexOf(ciclo.mes) + 11) % 12];
    const meta = 90;
    const taxa = mes.taxaCobranca ?? 0;

    return (
        <section aria-labelledby="dinheiro" className={cn(cartao, "flex min-w-0 flex-[2_1_300px] flex-col gap-[18px] p-6")}>
            <h2 id="dinheiro" className="text-lg font-bold text-ink dark:text-[#F2F5FB]">Dinheiro de {ciclo.mes}</h2>
            <div className="flex flex-col gap-1.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">Dívida em atraso (todos os meses)</span>
                <span className="text-[30px] font-bold tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(dividaTotal)}</span>
                {facturasVencidas.quantidade > 0 ? (
                    <Link href="/facturas?estado=vencida" className="self-start">
                        <StatusBadge tone="rose" className="px-2.5 py-1 text-[13px]">
                            {plural(facturasVencidas.quantidade, "factura vencida", "facturas vencidas")}
                        </StatusBadge>
                    </Link>
                ) : (
                    <StatusBadge tone="emerald" className="self-start text-[13px]">Ninguém em atraso</StatusBadge>
                )}
            </div>

            {mes.numeroFacturas === 0 ? (
                <div className="flex items-center gap-3.5 rounded-md bg-slate-50 p-4 dark:bg-[#1E232D]">
                    <Ilustracao nome="factura" largura={72} />
                    <span className="flex flex-col gap-1.5">
                        <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            Ainda não há facturas de {ciclo.mes}. O facturado e o recebido aparecem aqui depois do passo 3.
                        </span>
                        <Link href="/facturas" className="text-sm font-bold text-cyan-700 hover:text-cyan-800 dark:text-cyan-400">
                            Ver facturas de {mesAnterior} →
                        </Link>
                    </span>
                </div>
            ) : (
                <div className="flex flex-col gap-3 rounded-md bg-slate-50 p-4 dark:bg-[#1E232D]">
                    <div className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">Facturado</span>
                        <strong className="tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(mes.totalFacturado)}</strong>
                    </div>
                    <div className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">Recebido</span>
                        <strong className="tabular-nums text-ink dark:text-[#F2F5FB]">{formatMoney(mes.totalRecebido)}</strong>
                    </div>
                    <div className="relative h-2 rounded-full bg-cyan-200 dark:bg-slate-800" role="img" aria-label={`Cobrança ${taxa}%, meta ${meta}%`}>
                        <BarraProgresso pct={taxa} className="h-full" fundo="" />
                        <span className="absolute -top-1 h-4 w-0.5 rounded bg-ink dark:bg-[#F2F5FB]" style={{ left: `${meta}%` }} aria-hidden="true" />
                    </div>
                    <span className="text-[13px] text-slate-600 dark:text-slate-300">
                        <strong className={cn(taxa >= meta ? "text-emerald-700 dark:text-emerald-300" : "text-ink dark:text-[#F2F5FB]")}>{taxa}% cobrado</strong> · meta {meta}%
                    </span>
                </div>
            )}

            <div className="flex flex-col gap-1 border-t border-[#E8ECF4] pt-4 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">Clientes</span>
                <span className="text-[15px] text-ink dark:text-[#F2F5FB]">
                    <strong className="tabular-nums">{contadores.clientesActivos}</strong> activos · <strong className="tabular-nums">{contadores.clientesCortados}</strong> cortados · {contadores.clientesTotal} no total
                </span>
            </div>
        </section>
    );
}

/**
 * O Painel do administrador e do gestor: saudação com a próxima acção, a faixa
 * do ciclo do mês em 5 passos, "A precisar de atenção" (também o que antes eram
 * as Notificações do sistema) e o dinheiro do mês.
 */
export default function PainelCiclo({ alertas = [], contadores, mes, dividaTotal, facturasVencidas }) {
    const { auth, ciclo } = usePage().props;
    const agora = new Date();
    const primeiroNome = (auth?.user?.name ?? "").trim().split(/\s+/)[0];
    const passo = passoActual({ ciclo, contadores, mes });
    const accao = proximaAccao(passo, ciclo);
    const faltam = ciclo.clientes - ciclo.lidas;

    // A lista de atenção começa pelo que o ciclo pede agora; depois os alertas do sistema.
    const itens = [];
    if (passo === 1 && faltam > 0) {
        const dias = Math.max(ciclo.diasParaLimite, 0);
        itens.push({
            chave: "ciclo-leituras",
            nivel: "leitura",
            titulo: `${plural(faltam, "cliente ainda sem leitura", "clientes ainda sem leitura")}`,
            detalhe:
                ciclo.diasParaLimite >= 0 ? (
                    <>
                        {dias === 0 ? "Hoje é o dia limite." : `Faltam ${plural(dias, "dia", "dias")} para o dia limite.`} Ritmo necessário:{" "}
                        <strong className="text-ink dark:text-[#F2F5FB]">{plural(Math.ceil(faltam / Math.max(dias, 1)), "leitura", "leituras")} por dia</strong>.
                    </>
                ) : (
                    `O dia limite (${ciclo.leiturasAte}) já passou. Sem leitura, a factura sai estimada.`
                ),
            href: "/leituras",
            accao: "Ver por zona",
        });
    }
    if (!ciclo.producaoRegistada) {
        itens.push({
            chave: "ciclo-producao",
            nivel: "lembrete",
            titulo: `Produção de água de ${ciclo.mes} por registar`,
            detalhe: "Sem ela não dá para saber quanta água se perde em fugas.",
            href: "/producao",
            accao: "Registar",
        });
    }
    alertas
        .filter((alerta) => alerta.chave !== "leituras-atraso" || passo !== 1)
        .forEach((alerta) => itens.push({ ...alerta, titulo: `${alerta.titulo} · ${alerta.quantidade}`, accao: "Ver" }));

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-[18px]">
                    <Ilustracao nome="contador" largura={120} className="hidden sm:block" />
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            {DIAS[agora.getDay()]}, {agora.getDate()} de {MESES[agora.getMonth()]}
                        </span>
                        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink sm:text-4xl dark:text-[#F2F5FB]">
                            {saudacao(agora.getHours())}
                            {primeiroNome ? `, ${primeiroNome}` : ""}
                        </h1>
                        <span className="text-base text-slate-600 dark:text-slate-300">{accao.frase}</span>
                    </div>
                </div>
                <Link
                    href={accao.href}
                    className="inline-flex min-h-[48px] items-center gap-2.5 rounded-md bg-brand px-[22px] text-[15px] font-bold text-white transition hover:bg-brand-hover active:translate-y-px dark:bg-cyan-500 dark:hover:bg-cyan-600"
                >
                    {accao.rotulo}
                    <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
                </Link>
            </div>

            <FaixaCiclo ciclo={ciclo} contadores={contadores} mes={mes} passo={passo} />

            <div className="flex flex-wrap items-start gap-6">
                <AtencaoLista itens={itens.slice(0, 5)} verTodos={alertas.length > 0} />
                <DinheiroDoMes ciclo={ciclo} mes={mes} dividaTotal={dividaTotal} facturasVencidas={facturasVencidas} contadores={contadores} />
            </div>
        </div>
    );
}
