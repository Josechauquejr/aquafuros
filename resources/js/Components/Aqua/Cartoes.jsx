import { Check, ChevronRight } from "lucide-react";
import Mascote from "@/Components/Aqua/Mascote";
import { IlustracaoCarteira, IlustracaoContador, IlustracaoFactura, IlustracaoGrafico, IlustracaoOcorrencia } from "@/Components/Aqua/Ilustracoes";
import { BotaoPrimario, BotaoSuave, cor } from "@/Components/Aqua/Partes";

const ICONES = { factura: IlustracaoFactura, grafico: IlustracaoGrafico, carteira: IlustracaoCarteira, ocorrencia: IlustracaoOcorrencia, contador: IlustracaoContador };

const TOM_VARIACAO = {
    bom: "bg-[#E3F2E9] text-[#1E7148] dark:bg-[#11281D] dark:text-[#7DD3A3]",
    mau: "bg-[#FDF1F0] text-[#B42318] dark:bg-[#2D1714] dark:text-[#F4A39A]",
    neutro: "bg-[#EDF1F8] text-[#464F66] dark:bg-[#1E232D] dark:text-[#C9D2E3]",
};

/** "✓ Consultei 1 248 facturas de Setembro · 1,2 s" — o que foi feito, sem enfeitar. */
export function RastoConsulta({ texto, tempo }) {
    if (!texto) return null;
    const segundos = typeof tempo === "number" ? ` · ${tempo.toLocaleString("pt-MZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s` : "";
    return (
        <div className={`flex items-center gap-1.5 pl-0.5 text-xs ${cor.texto3}`}>
            <Check className="h-3.5 w-3.5 shrink-0 text-[#2EA063]" strokeWidth={3} aria-hidden="true" />
            <span>
                {texto}
                {segundos}
            </span>
        </div>
    );
}

function Cabecalho({ icone, titulo }) {
    const Icone = ICONES[icone] ?? IlustracaoFactura;
    return (
        <div className="flex items-center gap-2">
            <Icone className="h-7 w-7 shrink-0" />
            <span className={`text-[13px] font-bold ${cor.texto3}`}>{titulo}</span>
        </div>
    );
}

/** Mini-gráfico de 6 meses: barras suaves e o mês pedido em azul. */
function MiniGrafico({ serie }) {
    const maximo = Math.max(...serie.map((ponto) => ponto.valor), 1);
    const largura = serie.length * 18 - 6;
    return (
        <svg width={largura} height="52" viewBox={`0 0 ${largura} 52`} className="shrink-0" role="img" aria-label={`Últimos ${serie.length} meses: ${serie.map((p) => p.rotulo).join(", ")}`}>
            {serie.map((ponto, indice) => {
                const altura = Math.max(4, Math.round((ponto.valor / maximo) * 48));
                return <rect key={ponto.rotulo + indice} x={indice * 18} y={52 - altura} width="12" height={altura} rx="3" className={ponto.actual ? "fill-[#0059FF]" : "fill-[#D6E2FF] dark:fill-[#1B2F66]"} />;
            })}
        </svg>
    );
}

function Botoes({ acoes, ctx }) {
    const visiveis = (acoes ?? []).filter((acao) => acao.tipo !== "workflow" || ctx.podeTarefa?.(acao.tarefa)).slice(0, 2);
    if (!visiveis.length) return null;
    const executar = (acao) => (acao.tipo === "pergunta" ? ctx.enviar(acao.pergunta) : ctx.executarAccao(acao));
    return (
        <div className="flex gap-2">
            {visiveis.map((acao, indice) => {
                const Botao = indice === 0 ? BotaoPrimario : BotaoSuave;
                return (
                    <Botao key={acao.rotulo} onClick={() => executar(acao)} disabled={ctx.aEnviar} className="min-w-0 flex-1 px-3">
                        <span className="truncate">{acao.rotulo}</span>
                    </Botao>
                );
            })}
        </div>
    );
}

function moldura(tom) {
    return `rounded-[22px] border p-4 ${tom === "atencao" ? "border-[#F3D29E] dark:border-[#4F2D00]" : "border-[#E1E7F3] dark:border-[#262C38]"} ${cor.superficie}`;
}

/** Canvas "2 · Consulta": um número em destaque (Von Restorff), variação, gráfico, três linhas e duas acções. */
function CartaoNumero({ cartao, ctx }) {
    return (
        <article className={`flex flex-col gap-3 ${moldura(cartao.tom)}`}>
            <Cabecalho icone={cartao.icone} titulo={cartao.titulo} />
            <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                    <div className={`text-[32px] font-extrabold leading-none tracking-[-0.02em] ${cor.texto}`}>
                        {cartao.valor}
                        {cartao.unidade && <span className={`text-lg font-bold tracking-normal ${cor.texto3}`}> {cartao.unidade}</span>}
                    </div>
                    {cartao.variacao?.texto && <span className={`mt-2 inline-flex rounded-full px-2 py-[3px] text-xs font-bold ${TOM_VARIACAO[cartao.variacao.tom] ?? TOM_VARIACAO.neutro}`}>{cartao.variacao.texto}</span>}
                </div>
                {cartao.serie?.length > 1 && <MiniGrafico serie={cartao.serie} />}
            </div>
            {typeof cartao.progresso === "number" && (
                <div className="h-2 overflow-hidden rounded-full bg-[#EDF1F8] dark:bg-[#1E232D]" role="img" aria-label={`${cartao.progresso}% concluído`}>
                    <div className="h-full rounded-full bg-[#0059FF]" style={{ width: `${Math.max(2, Math.min(100, cartao.progresso))}%` }} />
                </div>
            )}
            {cartao.linhas?.length > 0 && (
                <div className={`flex flex-col gap-2 border-t pt-2.5 ${cor.divisor}`}>
                    {cartao.linhas.map(([rotulo, valor]) => (
                        <div key={rotulo} className="flex items-baseline justify-between gap-3 text-sm">
                            <span className={cor.texto2}>{rotulo}</span>
                            <strong className={`text-right ${cor.texto}`}>{valor}</strong>
                        </div>
                    ))}
                </div>
            )}
            <Botoes acoes={cartao.acoes} ctx={ctx} />
        </article>
    );
}

/** Lista (cobrança, zonas): frase de recomendação e itens, numerados quando são prioridades. */
function CartaoLista({ cartao, ctx }) {
    return (
        <article className={`flex flex-col gap-3 ${moldura(cartao.tom)}`}>
            <Cabecalho icone={cartao.icone} titulo={cartao.titulo} />
            {cartao.intro && <p className={`text-[15px] leading-relaxed ${cor.texto}`}>{cartao.intro}</p>}
            <div className="flex flex-col gap-2">
                {cartao.itens.map((item, indice) => (
                    <button
                        key={item.titulo + indice}
                        type="button"
                        disabled={!item.url}
                        onClick={() => item.url && ctx.irPara(item.url)}
                        className="flex w-full items-center gap-2.5 rounded-xl text-left enabled:hover:bg-[#F4F6FB] disabled:cursor-default dark:enabled:hover:bg-[#1E232D]"
                    >
                        {cartao.numerada && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FCEFD9] text-xs font-extrabold text-[#8A4F00] dark:bg-[#2A2212] dark:text-[#F3C77A]">{indice + 1}</span>
                        )}
                        <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-bold ${cor.texto}`}>{item.titulo}</span>
                            {item.detalhe && <span className={`block truncate text-xs ${cor.texto3}`}>{item.detalhe}</span>}
                            {typeof item.proporcao === "number" && (
                                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#EDF1F8] dark:bg-[#1E232D]">
                                    <span className="block h-full rounded-full bg-[#0059FF]" style={{ width: `${Math.max(3, item.proporcao * 100)}%` }} />
                                </span>
                            )}
                        </span>
                        <strong className={`shrink-0 text-sm ${cor.texto}`}>{item.valor}</strong>
                        {item.url && <ChevronRight className={`h-4 w-4 shrink-0 ${cor.texto3}`} aria-hidden="true" />}
                    </button>
                ))}
            </div>
            <Botoes acoes={cartao.acoes} ctx={ctx} />
        </article>
    );
}

/** Sem dados: a Aqua diz que ainda não há, em vez de um cartão cheio de zeros. */
export function CartaoVazio({ cartao, ctx }) {
    return (
        <article className={`flex flex-col items-center gap-1.5 rounded-[22px] border px-5 pb-5 pt-4 text-center ${cor.borda} ${cor.superficie}`}>
            <Mascote humor={cartao.humor ?? "ola"} tamanho={96} />
            <h3 className={`mt-1 text-lg font-extrabold leading-snug ${cor.texto}`}>{cartao.titulo}</h3>
            {cartao.texto && <p className={`text-sm leading-relaxed ${cor.texto2}`}>{cartao.texto}</p>}
            {cartao.acoes?.length > 0 && (
                <div className="mt-2 w-full">
                    <Botoes acoes={cartao.acoes} ctx={ctx} />
                </div>
            )}
        </article>
    );
}

export default function CartaoResposta({ cartao, ctx }) {
    if (cartao.tipo === "numero") return <CartaoNumero cartao={cartao} ctx={ctx} />;
    if (cartao.tipo === "lista") return <CartaoLista cartao={cartao} ctx={ctx} />;
    return <CartaoVazio cartao={cartao} ctx={ctx} />;
}
