import { Head, Link } from "@inertiajs/react";
import {
    AlertTriangle,
    AreaChart as AreaChartIcon,
    ArrowLeft,
    Award,
    Banknote,
    Clock,
    Download,
    Droplets,
    FileText,
    Percent,
    Receipt,
    Scissors,
    Hammer,
    MapPin,
    MessageCircle,
    ShieldAlert,
    TrendingDown,
    Users,
    TrendingUp,
    UserPlus,
    Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";
import KpiCard from "@/Components/KpiCard";
import DevedoresChart from "@/Components/charts/DevedoresChart";
import SeletorMes from "@/Components/SeletorMes";
import StatusBadge from "@/Components/StatusBadge";
import DistribuicaoMetodoChart from "@/Components/charts/DistribuicaoMetodoChart";
import GraficoSerie, { FILTROS_MESES, formatarCompacto, rotuloMensal } from "@/Components/charts/GraficoSerie";
import { formatCurrency, formatMoney, formatVolume } from "@/lib/utils";
import { itemVariants, listVariants } from "@/lib/motion";

const metodoRotulo = { dinheiro: "Dinheiro", banco: "Transferência", mpesa: "M-Pesa", "e-mola": "e-Mola" };

const pct = (valor) => (valor === null || valor === undefined ? "—" : `${Number(valor).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`);
const num = (valor, casas = 1) => (valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-PT", { maximumFractionDigits: casas }));

function formatarM3(valor) {
    return `${Number(valor).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} m³`;
}

// Variação face a outro mês: subir é bom para facturado/recebido, e é só informação para o resto.
function Variacao({ valor }) {
    if (valor === null || valor === undefined) return <span className="text-slate-400">novo</span>;
    const cor = valor === 0 ? "text-slate-500" : valor > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
    return (
        <span className={`font-semibold ${cor}`}>
            {valor > 0 ? "+" : ""}
            {num(valor)}%
        </span>
    );
}

function Seccao({ titulo, descricao, children }) {
    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</h3>
                {descricao && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
            </div>
            {children}
        </section>
    );
}

function Painel({ titulo, descricao, icone: Icone, delay = 0.1, children }) {
    return (
        <AnimatedPanel delay={delay} className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                    {Icone && <Icone className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
                    {titulo}
                </h3>
                {descricao && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descricao}</p>}
            </div>
            {children}
        </AnimatedPanel>
    );
}

const Vazio = ({ children }) => <p className="px-6 py-6 text-sm text-slate-500 dark:text-slate-400">{children}</p>;

export default function Kpis({
    mes,
    anterior,
    homologo,
    variacoes,
    cobranca,
    antiguidadeDivida,
    consumo,
    clientes,
    facturacao,
    desempenhoFuncionarios,
    evolucaoMensal,
    consumoMensal,
    maioresDevedores,
    risco,
    ciclo,
    previsao,
    evolucaoDivida,
    mensal,
    acumuladoAno,
    controlo,
    perdas,
    porZona,
    cobrancaOp,
    ocorrencias,
    credito,
    mensagens,
    mesReferencia,
    filtros,
}) {
    const ultimos = evolucaoMensal.slice(-6);
    const consumos = consumoMensal.slice(-6);
    const maxAntiguidade = Math.max(1, ...antiguidadeDivida.map((b) => b.valor));
    const dividaEmAtraso = antiguidadeDivida.filter((b) => b.chave !== "aVencer").reduce((s, b) => s + b.valor, 0);
    const detalheVariacao = (chave) => `ano passado: ${variacoes[chave].homologo === null ? "novo" : `${variacoes[chave].homologo > 0 ? "+" : ""}${num(variacoes[chave].homologo)}%`}`;

    const principais = [
        {
            label: "Total facturado",
            value: formatCurrency(mes.totalFacturado),
            detail: `${mes.numeroFacturas} factura(s) · ${detalheVariacao("totalFacturado")}`,
            icon: FileText,
            tone: "cyan",
            variacao: variacoes.totalFacturado.anterior,
            grafico: { tipo: "spark", serie: ultimos.map((d) => d.facturado), rotulos: ultimos.map(rotuloMensal), formatar: formatMoney },
        },
        {
            label: "Total recebido",
            value: formatCurrency(mes.totalRecebido),
            detail: `${mes.numeroPagamentos} pagamento(s) · ${detalheVariacao("totalRecebido")}`,
            icon: Receipt,
            tone: "emerald",
            variacao: variacoes.totalRecebido.anterior,
            grafico: { tipo: "spark", serie: ultimos.map((d) => d.recebido), rotulos: ultimos.map(rotuloMensal), formatar: formatMoney },
        },
        {
            label: "Taxa de cobrança",
            value: pct(cobranca.taxaMes),
            detail: `acumulada: ${pct(cobranca.taxaAcumulada)} · mês anterior: ${pct(anterior.taxaCobranca)}`,
            icon: TrendingUp,
            tone: "amber",
            grafico: { tipo: "radial", valor: cobranca.taxaMes ?? 0 },
        },
        {
            label: "Consumo de água",
            value: formatarM3(mes.consumoM3),
            detail: `${consumo.clientesComLeitura} cliente(s) · ${detalheVariacao("consumoM3")}`,
            icon: Droplets,
            tone: "cyan",
            variacao: variacoes.consumoM3.anterior,
            grafico: { tipo: "spark", serie: consumos.map((d) => d.consumo), rotulos: consumos.map(rotuloMensal), formatar: formatVolume },
        },
    ];

    const eficiencia = [
        {
            label: "Tempo médio até pagar",
            value: cobranca.tempoMedioPagamentoDias === null ? "—" : `${num(cobranca.tempoMedioPagamentoDias)} dias`,
            detail: `${cobranca.facturasPagasNoMes} factura(s) ficaram pagas no mês`,
            icon: Clock,
            tone: "cyan",
        },
        {
            label: "Dívida antiga recuperada",
            value: formatMoney(cobranca.recuperacaoDividaAntiga),
            detail: "recebido de facturas de meses anteriores",
            icon: Banknote,
            tone: "emerald",
        },
        {
            label: "Ticket médio por factura",
            value: facturacao.ticketMedio === null ? "—" : formatMoney(facturacao.ticketMedio),
            detail: `multas: ${pct(facturacao.pesoMulta)} · taxa de ligação: ${pct(facturacao.pesoLigacao)} do facturado`,
            icon: Percent,
            tone: "amber",
        },
        {
            label: "Taxa de corte",
            value: pct(clientes.taxaCorte),
            detail: `${clientes.cortados} cortado(s) de ${clientes.total} clientes`,
            icon: Scissors,
            tone: clientes.cortados > 0 ? "rose" : "emerald",
        },
    ];

    const comparacao = [
        { rotulo: "Facturado", chave: "totalFacturado", f: formatMoney },
        { rotulo: "Recebido", chave: "totalRecebido", f: formatMoney },
        { rotulo: "Consumo", chave: "consumoM3", f: formatarM3 },
        { rotulo: "Clientes novos", chave: "clientesNovos", f: (v) => String(v) },
    ];

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link
                            href="/admin/dashboard"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            Voltar ao painel
                        </Link>
                        <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 dark:text-white">KPIs e Estatísticas</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Análise de {mesReferencia.rotulo}: cobrança, consumo, clientes, facturação e equipa, comparados com o mês anterior e com o ano passado.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <SeletorMes rota="/admin/kpis" mesReferencia={mesReferencia} extra={filtros} />
                        <a
                            href={`/admin/kpis/exportar${mesReferencia.eActual ? "" : `?mes=${mesReferencia.valor}`}`}
                            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            title="Exportar esta análise em CSV"
                        >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Exportar
                        </a>
                    </div>
                </div>
            }
        >
            <Head title="KPIs e Estatísticas" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
                    <Seccao titulo="Resumo do mês" descricao="A variação (setas) é face ao mês anterior; o texto mostra a do mesmo mês do ano passado.">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {principais.map((metric, index) => (
                                <KpiCard key={metric.label} {...metric} delay={index * 0.06} />
                            ))}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {eficiencia.map((metric, index) => (
                                <KpiCard key={metric.label} {...metric} delay={0.24 + index * 0.05} />
                            ))}
                        </div>
                        <Painel titulo="Comparação entre períodos" icone={TrendingUp} delay={0.3}>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3">Indicador</th>
                                            <th className="px-6 py-3 text-right">{mesReferencia.rotulo}</th>
                                            <th className="px-6 py-3 text-right">Mês anterior</th>
                                            <th className="px-6 py-3 text-right">Ano passado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {comparacao.map((linha) => (
                                            <tr key={linha.chave}>
                                                <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{linha.rotulo}</td>
                                                <td className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-white">{linha.f(mes[linha.chave])}</td>
                                                <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">
                                                    {linha.f(anterior[linha.chave])} <Variacao valor={variacoes[linha.chave].anterior} />
                                                </td>
                                                <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">
                                                    {linha.f(homologo[linha.chave])} <Variacao valor={variacoes[linha.chave].homologo} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Painel>
                    </Seccao>

                    <Seccao titulo="Tendências" descricao="Últimos meses até ao mês escolhido; as linhas claras são a média móvel de 3 meses.">
                        <GraficoSerie
                            titulo="Facturado vs. recebido"
                            icone={AreaChartIcon}
                            dados={evolucaoMensal}
                            series={[
                                { chave: "facturado", label: "Facturado", cor: "#2a78d6" },
                                { chave: "recebido", label: "Recebido", cor: "#1baf7a" },
                                { chave: "facturadoMedia", label: "Média móvel — facturado", cor: "#93c5fd" },
                                { chave: "recebidoMedia", label: "Média móvel — recebido", cor: "#6ee7b7" },
                            ]}
                            tipo="line"
                            filtros={FILTROS_MESES}
                            formatar={formatMoney}
                            formatarEixo={formatarCompacto}
                        />
                    </Seccao>

                    <Seccao titulo="Cobrança" descricao="Quanto do facturado se recebe, como se paga e há quanto tempo está em dívida.">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <DistribuicaoMetodoChart
                                dados={cobranca.porMetodo}
                                descricao={`Valor recebido em ${mesReferencia.rotulo}, por método`}
                            />
                            <Painel titulo="Eficiência por método" icone={Banknote} delay={0.2}>
                                {cobranca.porMetodo.length === 0 ? (
                                    <Vazio>Nenhum pagamento neste mês.</Vazio>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Método</th>
                                                <th className="px-3 py-3 text-right">Pagamentos</th>
                                                <th className="px-3 py-3 text-right">Ticket médio</th>
                                                <th className="px-6 py-3 text-right">% do total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {cobranca.porMetodo.map((linha) => (
                                                <tr key={linha.metodo}>
                                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{metodoRotulo[linha.metodo] ?? linha.metodo}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{linha.quantidade}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{formatMoney(linha.ticketMedio)}</td>
                                                    <td className="px-6 py-3 text-right font-semibold text-slate-900 dark:text-white">{pct(linha.percentagem)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Painel>
                        </div>

                        <Painel
                            titulo="Antiguidade da dívida"
                            icone={AlertTriangle}
                            descricao={`Situação de agora (não depende do mês escolhido) — ${formatMoney(dividaEmAtraso)} em atraso`}
                            delay={0.25}
                        >
                            <div className="space-y-4 px-6 py-5">
                                {antiguidadeDivida.map((balde) => (
                                    <div key={balde.chave}>
                                        <div className="flex items-baseline justify-between text-sm">
                                            <span className="font-medium text-slate-900 dark:text-white">{balde.rotulo}</span>
                                            <span className="text-slate-600 dark:text-slate-300">
                                                {formatMoney(balde.valor)} · {balde.quantidade} factura(s)
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={balde.chave === "aVencer" ? "h-full bg-cyan-500" : balde.chave === "d30" ? "h-full bg-amber-400" : "h-full bg-rose-500"}
                                                style={{ width: `${(balde.valor / maxAntiguidade) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Painel>
                    </Seccao>


                    <Seccao titulo="Previsão de caixa e evolução da dívida" descricao="Estimativas construídas com o histórico de pagamentos da empresa — os componentes estão à vista.">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Painel titulo="Previsão para os próximos 30 dias" icone={TrendingUp} descricao="Quanto se espera receber, e de onde vem" delay={0.1}>
                                <div className="space-y-4 px-6 py-5">
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(previsao.previsto)}</p>
                                    {!previsao.fiavel && (
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Ainda há pouco histórico (facturas de há 2 a 6 meses) para estimar os pagamentos a prazo: só conta a dívida em atraso.
                                        </p>
                                    )}
                                    <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                        <div className="flex justify-between gap-4 py-2">
                                            <dt className="text-slate-500 dark:text-slate-400">
                                                A vencer em 30 dias ({previsao.aVencer.facturas} factura(s)) · {formatMoney(previsao.aVencer.valor)}
                                            </dt>
                                            <dd className="font-semibold text-slate-900 dark:text-white">
                                                × {previsao.aVencer.taxa === null ? "—" : pct(previsao.aVencer.taxa * 100)} costuma pagar a prazo
                                            </dd>
                                        </div>
                                        <div className="flex justify-between gap-4 py-2">
                                            <dt className="text-slate-500 dark:text-slate-400">
                                                Já em atraso ({previsao.emAtraso.facturas} factura(s)) · {formatMoney(previsao.emAtraso.valor)}
                                            </dt>
                                            <dd className="font-semibold text-slate-900 dark:text-white">
                                                × {previsao.emAtraso.taxa === null ? "—" : pct(previsao.emAtraso.taxa * 100)} recuperado por mês
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </Painel>

                            <GraficoSerie
                                titulo="Evolução da dívida"
                                descricao="Valor por receber no fim de cada mês (facturado próprio − pago)"
                                icone={AreaChartIcon}
                                dados={evolucaoDivida}
                                series={[{ chave: "divida", label: "Por receber", cor: "#e11d48" }]}
                                tipo="area"
                                filtros={FILTROS_MESES}
                                formatar={formatMoney}
                                formatarEixo={formatarCompacto}
                            />
                        </div>
                    </Seccao>

                    <Seccao titulo="Risco de cobrança e cobertura" descricao="Quem está em risco, quanto das facturas do mês já entrou e se o ciclo leitura → factura está completo.">
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard
                                label="Eficácia de cobrança"
                                value={pct(mensal.eficaciaCoorte)}
                                detail={`das facturas de ${mesReferencia.rotulo} já recebido: ${formatMoney(mensal.recebidoCoorte)} de ${formatMoney(mensal.facturadoCoorte)}`}
                                icon={TrendingUp}
                                tone="emerald"
                            />
                            <KpiCard
                                label="Facturas do mês em atraso"
                                value={pct(mensal.incumprimento)}
                                detail={`${mensal.facturasEmAtraso} já vencida(s) e por pagar`}
                                icon={AlertTriangle}
                                tone={mensal.incumprimento > 30 ? "rose" : "amber"}
                            />
                            <KpiCard
                                label="Clientes em atraso"
                                value={risco.clientesEmAtraso}
                                detail={`${pct(risco.percentagemEmAtraso)} dos activos · ${risco.com2Vencidas} com 2+ vencidas · ${risco.com3Vencidas} com 3+`}
                                icon={Users}
                                tone={risco.clientesEmAtraso > 0 ? "rose" : "emerald"}
                            />
                            <KpiCard
                                label="Em risco de corte"
                                value={risco.emRiscoCorte.total}
                                detail={`${formatMoney(risco.emRiscoCorte.valor)} em atraso, acima do limiar da tarifa`}
                                icon={Scissors}
                                tone={risco.emRiscoCorte.total > 0 ? "rose" : "emerald"}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard
                                label="Cobertura de leituras"
                                value={pct(mensal.cobertura.percentagemLeituras)}
                                detail={`${mensal.cobertura.leituras} leituras para ${mensal.cobertura.clientesActivos} clientes activos`}
                                icon={Droplets}
                                tone={mensal.cobertura.percentagemLeituras !== null && mensal.cobertura.percentagemLeituras < 95 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label="Leituras já facturadas"
                                value={pct(mensal.cobertura.percentagemFacturadas)}
                                detail={`${mensal.cobertura.facturasConsumo} factura(s) para ${mensal.cobertura.leiturasConfirmadas} leitura(s) confirmada(s)`}
                                icon={FileText}
                                tone={mensal.cobertura.percentagemFacturadas !== null && mensal.cobertura.percentagemFacturadas < 100 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label={`Facturado no ano`}
                                value={formatMoney(acumuladoAno.actual.facturado)}
                                detail={`ano passado até aqui: ${formatMoney(acumuladoAno.anoPassado.facturado)}`}
                                icon={FileText}
                                tone="cyan"
                                variacao={acumuladoAno.variacaoFacturado}
                            />
                            <KpiCard
                                label="Recebido no ano"
                                value={formatMoney(acumuladoAno.actual.recebido)}
                                detail={`ano passado até aqui: ${formatMoney(acumuladoAno.anoPassado.recebido)}`}
                                icon={Receipt}
                                tone="emerald"
                                variacao={acumuladoAno.variacaoRecebido}
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Painel titulo="Em risco de corte" icone={Scissors} descricao="Clientes activos com dívida em atraso igual ou acima do limiar da tarifa" delay={0.1}>
                                {risco.emRiscoCorte.clientes.length === 0 ? (
                                    <Vazio>Nenhum cliente em risco de corte.</Vazio>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {risco.emRiscoCorte.clientes.map((linha) => (
                                            <div key={linha.cliente} className="flex items-center justify-between gap-3 px-6 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-900 dark:text-white">{linha.cliente}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{linha.facturas} factura(s) vencida(s)</p>
                                                </div>
                                                <span className="shrink-0 font-semibold text-rose-600 dark:text-rose-400">{formatMoney(linha.valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Painel>
                            <Painel
                                titulo="Sem pagar há 3 meses"
                                icone={Users}
                                descricao={`${risco.semPagar3Meses.total} cliente(s) activo(s) com facturas em aberto e nenhum pagamento nos últimos 3 meses`}
                                delay={0.15}
                            >
                                {risco.semPagar3Meses.clientes.length === 0 ? (
                                    <Vazio>Nenhum cliente nesta situação.</Vazio>
                                ) : (
                                    <p className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                        {risco.semPagar3Meses.clientes.join(", ")}
                                        {risco.semPagar3Meses.total > risco.semPagar3Meses.clientes.length && ` e mais ${risco.semPagar3Meses.total - risco.semPagar3Meses.clientes.length}…`}
                                    </p>
                                )}
                            </Painel>
                        </div>
                    </Seccao>

                    <Seccao titulo="Ciclo de leituras e facturação" descricao={`Prazo das leituras: dia ${ciclo.diaLimite} de cada mês (configurável em Tarifas > Prazos e limites).`}>
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard
                                label="Leituras fora do prazo"
                                value={pct(ciclo.percentagemForaDoPrazo)}
                                detail={`${ciclo.foraDoPrazo} de ${ciclo.leituras} registadas depois do dia ${ciclo.diaLimite}`}
                                icon={Clock}
                                tone={ciclo.foraDoPrazo > 0 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label="Por ler após o prazo"
                                value={ciclo.semLeituraAposLimite}
                                detail="clientes activos ainda sem leitura (só no mês actual)"
                                icon={UserPlus}
                                tone={ciclo.semLeituraAposLimite > 0 ? "rose" : "emerald"}
                            />
                            <KpiCard
                                label="Da leitura à confirmação"
                                value={ciclo.horasLeituraAteConfirmar === null ? "—" : `${num(ciclo.horasLeituraAteConfirmar)} h`}
                                detail="tempo médio (leituras confirmadas desde esta funcionalidade)"
                                icon={Clock}
                                tone="cyan"
                            />
                            <KpiCard
                                label="Da confirmação à factura"
                                value={ciclo.horasConfirmarAteFacturar === null ? "—" : `${num(ciclo.horasConfirmarAteFacturar)} h`}
                                detail="tempo médio até a factura ser emitida"
                                icon={FileText}
                                tone={ciclo.horasConfirmarAteFacturar > 72 ? "amber" : "cyan"}
                            />
                        </div>
                    </Seccao>

                    <Seccao titulo="Consumo e perdas" descricao="O que foi medido, o que foi facturado e onde há anomalias.">
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard label="Consumo medido" value={formatarM3(consumo.medidoM3)} detail={`${num(consumo.m3PorCliente, 2)} m³ por cliente`} icon={Droplets} tone="cyan" />
                            <KpiCard
                                label="Consumo facturado"
                                value={pct(consumo.percentagemFacturado)}
                                detail={`${formatarM3(consumo.facturadoM3)} de ${formatarM3(consumo.medidoM3)}`}
                                icon={FileText}
                                tone={consumo.percentagemFacturado !== null && consumo.percentagemFacturado < 90 ? "rose" : "emerald"}
                            />
                            <KpiCard
                                label="Consumos anormais"
                                value={consumo.totalAnomalias}
                                detail="≥ 150% da média dos 3 meses anteriores (ou zero)"
                                icon={AlertTriangle}
                                tone={consumo.totalAnomalias > 0 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label="Sem leitura no mês"
                                value={consumo.semLeitura.total}
                                detail="clientes activos por ler"
                                icon={UserPlus}
                                tone={consumo.semLeitura.total > 0 ? "rose" : "emerald"}
                            />
                        </div>

                        <GraficoSerie
                            titulo="Consumo de água"
                            descricao="Metros cúbicos registados por mês"
                            icone={Droplets}
                            dados={consumoMensal}
                            series={[{ chave: "consumo", label: "Consumo", cor: "#2a78d6" }]}
                            tipo="line"
                            filtros={FILTROS_MESES}
                            formatar={formatVolume}
                            formatarEixo={formatarCompacto}
                        />

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Painel titulo="Consumos anormais" icone={AlertTriangle} descricao="Possíveis fugas, avarias de contador ou erros de leitura" delay={0.2}>
                                {consumo.anomalias.length === 0 ? (
                                    <Vazio>Nenhum consumo fora do normal neste mês.</Vazio>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {consumo.anomalias.map((linha, indice) => (
                                            <div key={`${linha.cliente}-${indice}`} className="flex items-center justify-between gap-3 px-6 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-slate-900 dark:text-white">{linha.cliente}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">média habitual {formatarM3(linha.media)}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{formatarM3(linha.consumo)}</p>
                                                    <StatusBadge tone={linha.variacao > 0 ? "rose" : "amber"}>
                                                        {linha.variacao > 0 ? "+" : ""}
                                                        {linha.variacao}%
                                                    </StatusBadge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Painel>

                            <Painel titulo="Maiores consumidores" icone={Droplets} descricao="No mês seleccionado" delay={0.25}>
                                {consumo.maiores.length === 0 ? (
                                    <Vazio>Nenhuma leitura registada neste mês.</Vazio>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {consumo.maiores.map((linha, indice) => (
                                            <div key={`${linha.cliente}-${indice}`} className="flex items-center justify-between gap-3 px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                        {indice + 1}
                                                    </span>
                                                    <p className="font-medium text-slate-900 dark:text-white">{linha.cliente}</p>
                                                </div>
                                                <span className="font-semibold text-cyan-700 dark:text-cyan-300">{formatarM3(linha.consumo)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Painel>
                        </div>

                        {consumo.semLeitura.total > 0 && (
                            <Painel titulo="Clientes sem leitura" icone={UserPlus} descricao={`${consumo.semLeitura.total} cliente(s) activo(s) sem leitura em ${mesReferencia.rotulo}`} delay={0.3}>
                                <p className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                    {consumo.semLeitura.clientes.join(", ")}
                                    {consumo.semLeitura.total > consumo.semLeitura.clientes.length && ` e mais ${consumo.semLeitura.total - consumo.semLeitura.clientes.length}…`}
                                </p>
                            </Painel>
                        )}
                    </Seccao>


                    <Seccao titulo="Perdas de água e resultado por zona" descricao="Quanta água se produz face à que se factura, e como vai cada zona.">
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard label="Água produzida" value={formatVolume(perdas.produzidoM3)} detail={perdas.temDados ? mesReferencia.rotulo : "registar em Produção de água"} icon={Droplets} tone="cyan" />
                            <KpiCard label="Água facturada" value={formatVolume(perdas.facturadoM3)} detail="leituras com factura válida" icon={Droplets} tone="emerald" />
                            <KpiCard label="Perdas" value={perdas.perdasM3 === null ? "—" : formatVolume(perdas.perdasM3)} detail="produzida − facturada" icon={TrendingDown} tone={perdas.perdasPct > 30 ? "rose" : "amber"} />
                            <KpiCard label="Perdas (%)" value={pct(perdas.perdasPct)} detail="acima de 30% é preocupante" icon={TrendingDown} tone={perdas.perdasPct > 30 ? "rose" : "emerald"} />
                        </div>
                        <Painel titulo="Resultado por zona" icone={MapPin} descricao={`Em ${mesReferencia.rotulo} (a dívida em atraso é a de agora)`} delay={0.1}>
                            {porZona.length === 0 ? (
                                <Vazio>Ainda não há zonas. Crie-as em Zonas e ligue os clientes.</Vazio>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Zona</th>
                                                <th className="px-3 py-3 text-right">Clientes</th>
                                                <th className="px-3 py-3 text-right">Facturado</th>
                                                <th className="px-3 py-3 text-right">Recebido</th>
                                                <th className="px-3 py-3 text-right">Consumo</th>
                                                <th className="px-3 py-3 text-right">Em atraso</th>
                                                <th className="px-6 py-3 text-right">Ocorrências</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {porZona.map((z) => (
                                                <tr key={z.zona}>
                                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{z.zona}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{z.clientes}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{formatMoney(z.facturado)}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{formatMoney(z.recebido)}</td>
                                                    <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{formatarM3(z.consumoM3)}</td>
                                                    <td className="px-3 py-3 text-right font-semibold text-rose-600 dark:text-rose-400">{formatMoney(z.emAtraso)}</td>
                                                    <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300">{z.ocorrenciasAbertas}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Painel>
                    </Seccao>

                    <Seccao titulo="Cobrança activa, ocorrências e crédito" descricao="O que a equipa faz para cobrar, quanto demora a resolver problemas e o crédito dos clientes.">
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard label="Contactos de cobrança" value={cobrancaOp.contactos} detail={`${cobrancaOp.semContacto15d} em atraso sem contacto há 15 dias`} icon={Users} tone={cobrancaOp.semContacto15d > 0 ? "amber" : "emerald"} />
                            <KpiCard label="Promessas cumpridas" value={pct(cobrancaOp.taxaCumprimento)} detail={`${cobrancaOp.promessasCumpridas} cumpridas, ${cobrancaOp.promessasFalhadas} falhadas, ${cobrancaOp.promessasPendentes} pendentes`} icon={TrendingUp} tone="emerald" />
                            <KpiCard label="Ocorrências abertas" value={ocorrencias.abertasAgora} detail={`${ocorrencias.maisDe48h} há mais de 48 h · ${ocorrencias.reportadas} reportadas no mês`} icon={Hammer} tone={ocorrencias.maisDe48h > 0 ? "rose" : "amber"} />
                            <KpiCard label="Tempo até resolver" value={ocorrencias.horasAteResolver === null ? "—" : `${num(ocorrencias.horasAteResolver)} h`} detail={ocorrencias.horasAteIniciar === null ? "média das resolvidas no mês" : `até começar: ${num(ocorrencias.horasAteIniciar)} h`} icon={Clock} tone="cyan" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard label="Crédito de clientes" value={formatMoney(credito.saldoTotal)} detail={`${credito.clientesComCredito} cliente(s) com saldo a favor`} icon={Wallet} tone="cyan" />
                            <KpiCard label="Adiantamentos do mês" value={formatMoney(credito.entradasMes)} detail={`usado a pagar facturas: ${formatMoney(credito.usadoMes)}`} icon={Banknote} tone="emerald" />
                            <KpiCard label="Mensagens por enviar" value={mensagens.pendentes} detail={`${mensagens.enviadasMes} enviadas no mês · ${mensagens.falhadas} falharam`} icon={MessageCircle} tone={mensagens.pendentes > 0 ? "amber" : "emerald"} />
                        </div>
                        {Object.keys(ocorrencias.porZona).length > 0 && (
                            <Painel titulo="Ocorrências por zona" icone={Hammer} descricao={`Reportadas em ${mesReferencia.rotulo}`} delay={0.1}>
                                <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                    {Object.entries(ocorrencias.porZona).map(([zona, total]) => (
                                        <div key={zona} className="flex justify-between gap-4 px-6 py-3">
                                            <span className="text-slate-700 dark:text-slate-300">{zona}</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{total}</span>
                                        </div>
                                    ))}
                                </div>
                            </Painel>
                        )}
                    </Seccao>

                    <Seccao titulo="Clientes e facturação">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Painel titulo="Clientes" icone={UserPlus} delay={0.1}>
                                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                    {[
                                        ["Novos no mês", `${clientes.novos}`],
                                        ["Activos", `${clientes.activos} de ${clientes.total}`],
                                        ["Cortados (agora)", `${clientes.cortados} (${pct(clientes.taxaCorte)})`],
                                        ["Cortados no mês", `${clientes.movimentos.cortados}`],
                                        ["Desactivados no mês", `${clientes.movimentos.inactivados}`],
                                        ["Reactivados no mês", `${clientes.movimentos.reactivados}`],
                                        ["Saldo de clientes no mês", `${clientes.movimentos.saldo > 0 ? "+" : ""}${clientes.movimentos.saldo}`],
                                        ["Dívida total em atraso", formatMoney(clientes.dividaTotal)],
                                        ["Dívida nos 10 maiores devedores", pct(clientes.concentracaoTop10)],
                                    ].map(([rotulo, valor]) => (
                                        <div key={rotulo} className="flex justify-between gap-4 px-6 py-3">
                                            <dt className="text-slate-500 dark:text-slate-400">{rotulo}</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-white">{valor}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </Painel>

                            <Painel titulo="Facturação" icone={FileText} delay={0.15}>
                                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                    {[
                                        ["Ticket médio por factura", facturacao.ticketMedio === null ? "—" : formatMoney(facturacao.ticketMedio)],
                                        ["Multas", `${formatMoney(facturacao.multas)} (${pct(facturacao.pesoMulta)})`],
                                        ["Taxa de ligação", `${formatMoney(facturacao.taxaLigacao)} (${pct(facturacao.pesoLigacao)})`],
                                        ["Facturas anuladas", `${facturacao.anuladas.quantidade} (${formatMoney(facturacao.anuladas.valor)})`],
                                    ].map(([rotulo, valor]) => (
                                        <div key={rotulo} className="flex justify-between gap-4 px-6 py-3">
                                            <dt className="text-slate-500 dark:text-slate-400">{rotulo}</dt>
                                            <dd className="font-semibold text-slate-900 dark:text-white">{valor}</dd>
                                        </div>
                                    ))}
                                    {facturacao.anuladas.motivos.length > 0 && (
                                        <div className="px-6 py-3">
                                            <dt className="text-slate-500 dark:text-slate-400">Motivos de anulação</dt>
                                            <dd className="mt-1 space-y-1">
                                                {facturacao.anuladas.motivos.map((m) => (
                                                    <p key={m.motivo} className="flex justify-between gap-4 text-slate-700 dark:text-slate-300">
                                                        <span className="truncate">{m.motivo}</span>
                                                        <span className="font-semibold">{m.quantidade}</span>
                                                    </p>
                                                ))}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </Painel>
                        </div>
                    </Seccao>

                    <Seccao titulo="Equipa">
                        <Painel
                            titulo="Desempenho por colaborador"
                            icone={Award}
                            descricao="Pagamentos recebidos, facturas geradas e leituras registadas no mês — ranking de produtividade."
                            delay={0.1}
                        >
                            {desempenhoFuncionarios.length === 0 ? (
                                <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhuma actividade registada neste mês.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                            <tr>
                                                <th className="px-6 py-3">Colaborador</th>
                                                <th className="px-6 py-3 text-right">Pagamentos</th>
                                                <th className="px-6 py-3 text-right">Valor recebido</th>
                                                <th className="px-6 py-3 text-right">Facturas geradas</th>
                                                <th className="px-6 py-3 text-right">Leituras registadas</th>
                                                <th className="px-6 py-3 text-right">Total de acções</th>
                                            </tr>
                                        </thead>
                                        <motion.tbody variants={listVariants} initial="hidden" animate="show" className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {desempenhoFuncionarios.map((linha, index) => (
                                                <motion.tr key={linha.utilizador} variants={itemVariants}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                                                {index + 1}
                                                            </span>
                                                            <span className="font-medium text-slate-900 dark:text-white">{linha.utilizador}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">{linha.pagamentosQuantidade}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{formatCurrency(linha.pagamentosTotal)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">{linha.facturasQuantidade}</td>
                                                    <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">{linha.leiturasQuantidade}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <StatusBadge tone="cyan">{linha.totalAcoes}</StatusBadge>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </motion.tbody>
                                    </table>
                                </div>
                            )}
                        </Painel>
                    </Seccao>


                    {controlo && (
                    <Seccao titulo="Controlo e auditoria" descricao="Sinais de erro ou abuso: quem anula, quem estorna e que pagamentos não se conseguem verificar.">
                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard
                                label="Anuladas com pagamentos"
                                value={controlo.anuladasComPagamentos.total}
                                detail={`${formatMoney(controlo.anuladasComPagamentos.valor)} recebido sem factura válida`}
                                icon={ShieldAlert}
                                tone={controlo.anuladasComPagamentos.total > 0 ? "rose" : "emerald"}
                            />
                            <KpiCard
                                label="Electrónicos sem referência"
                                value={controlo.electronicosSemReferencia.quantidade}
                                detail={`${formatMoney(controlo.electronicosSemReferencia.valor)} · ${pct(controlo.electronicosSemReferencia.percentagem)} dos pagamentos electrónicos`}
                                icon={ShieldAlert}
                                tone={controlo.electronicosSemReferencia.quantidade > 0 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label="Caixas por fechar"
                                value={controlo.caixasSemFecho.total}
                                detail="dias com pagamentos e sem fecho de caixa (sem contar hoje)"
                                icon={Clock}
                                tone={controlo.caixasSemFecho.total > 0 ? "amber" : "emerald"}
                            />
                            <KpiCard
                                label="Edições manuais de facturas"
                                value={controlo.edicoesManuais.reduce((soma, l) => soma + l.quantidade, 0)}
                                detail="alterações a multa, dívida ou total no mês"
                                icon={FileText}
                                tone="slate"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                            <KpiCard
                                label="Diferenças de caixa"
                                value={controlo.diferencasCaixa.total}
                                detail={`fecho(s) com diferença · total ${formatMoney(controlo.diferencasCaixa.soma)}`}
                                icon={Banknote}
                                tone={controlo.diferencasCaixa.total > 0 ? "rose" : "emerald"}
                            />
                            <KpiCard
                                label="Registou e confirmou"
                                value={ciclo.mesmoUtilizador.quantidade}
                                detail={`leituras confirmadas por quem as registou (${pct(ciclo.mesmoUtilizador.percentagem)})`}
                                icon={ShieldAlert}
                                tone={ciclo.mesmoUtilizador.quantidade > 0 ? "amber" : "emerald"}
                            />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Painel titulo="Anulações e estornos por utilizador" icone={ShieldAlert} descricao={`Em ${mesReferencia.rotulo}`} delay={0.1}>
                                {controlo.anulacoes.length + controlo.estornos.length === 0 ? (
                                    <Vazio>Nenhuma anulação nem estorno neste mês.</Vazio>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {controlo.anulacoes.map((l) => (
                                            <div key={`a-${l.utilizador}`} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                                                <span className="font-medium text-slate-900 dark:text-white">{l.utilizador} <span className="font-normal text-slate-500">anulou</span></span>
                                                <span className="text-slate-700 dark:text-slate-300">{l.quantidade} factura(s) · {formatMoney(l.valor)}</span>
                                            </div>
                                        ))}
                                        {controlo.estornos.map((l) => (
                                            <div key={`e-${l.utilizador}`} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                                                <span className="font-medium text-slate-900 dark:text-white">{l.utilizador} <span className="font-normal text-slate-500">estornou</span></span>
                                                <span className="text-slate-700 dark:text-slate-300">{l.quantidade} pagamento(s) · {formatMoney(l.valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Painel>

                            <Painel titulo="Para verificar" icone={AlertTriangle} descricao="Casos concretos que merecem uma olhadela" delay={0.15}>
                                <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                                    {controlo.anuladasComPagamentos.facturas.map((f) => (
                                        <p key={f.factura} className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                            Factura <strong>{f.factura}</strong> ({f.cliente}) anulada com {formatMoney(f.pago)} já pagos
                                        </p>
                                    ))}
                                    {controlo.electronicosSemReferencia.recibos.length > 0 && (
                                        <p className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                            Recibos electrónicos sem referência: {controlo.electronicosSemReferencia.recibos.join(", ")}
                                        </p>
                                    )}
                                    {controlo.caixasSemFecho.dias.map((d) => (
                                        <p key={`${d.utilizador}-${d.data}`} className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                            {d.utilizador} recebeu {formatMoney(d.total)} em {d.data} e não fechou a caixa
                                        </p>
                                    ))}
                                    {controlo.diferencasCaixa.fechos.map((f) => (
                                        <p key={`${f.utilizador}-${f.data}`} className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                            {f.utilizador}, {f.data}: contou {formatMoney(f.contado)} — diferença de{" "}
                                            <strong className={f.diferenca < 0 ? "text-rose-600" : "text-amber-600"}>{f.diferenca > 0 ? "+" : ""}{formatMoney(f.diferenca)}</strong>
                                        </p>
                                    ))}
                                    {controlo.edicoesManuais.map((l) => (
                                        <p key={l.utilizador} className="px-6 py-3 text-slate-700 dark:text-slate-300">
                                            {l.utilizador} editou {l.quantidade} factura(s) à mão
                                        </p>
                                    ))}
                                    {controlo.anuladasComPagamentos.facturas.length +
                                        controlo.electronicosSemReferencia.recibos.length +
                                        controlo.caixasSemFecho.dias.length +
                                        controlo.diferencasCaixa.fechos.length +
                                        controlo.edicoesManuais.length ===
                                        0 && <Vazio>Nada a verificar neste mês.</Vazio>}
                                </div>
                            </Painel>
                        </div>
                    </Seccao>
                    )}

                    <Seccao titulo="Maiores devedores">
                        <DevedoresChart
                            largo
                            devedores={maioresDevedores}
                            delay={0.1}
                            descricao={`Dívida em atraso total: ${formatCurrency(clientes.dividaTotal)} — os 10 maiores concentram ${pct(clientes.concentracaoTop10)}`}
                        />
                    </Seccao>
                </div>
            </div>
        </AdminLayout>
    );
}
