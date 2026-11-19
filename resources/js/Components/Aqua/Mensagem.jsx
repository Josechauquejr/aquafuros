import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Droplet,
    ExternalLink,
    Factory,
    FileText,
    MapPinned,
    Plus,
    TriangleAlert,
    UsersRound,
    WalletCards,
} from "lucide-react";
import Mascote from "@/Components/Aqua/Mascote";
import { IlustracaoCarteira, IlustracaoFactura, IlustracaoGrafico } from "@/Components/Aqua/Ilustracoes";
import { BotaoPrimario, BotaoSuave, Cancelar, Cartao, CartaoSucesso, Linha, Opcao, cor } from "@/Components/Aqua/Partes";
import { useState } from "react";
import CartaoResposta, { RastoConsulta } from "@/Components/Aqua/Cartoes";
import { CoberturaDistribuicao, CoberturaPagamento, ContextoLeitura } from "@/Components/Aqua/Fluxos";
import { formatMoney, formatNumero } from "@/lib/utils";

const TIPOS_OCORRENCIA = [
    ["sem_agua", "Falta de água"],
    ["fuga", "Fuga"],
    ["avaria", "Avaria"],
    ["contador", "Contador"],
    ["reclamacao", "Reclamação"],
    ["outro", "Outro"],
];

const METODOS = [
    ["dinheiro", "Dinheiro"],
    ["mpesa", "M-Pesa"],
    ["e-mola", "E-Mola"],
    ["banco", "Banco"],
];

const SUCESSO = ["factura", "pagamento", "zona_criada", "ocorrencia_criada", "producao_guardada"];

const mesAno = (mes, ano) => `${String(mes).padStart(2, "0")}/${ano}`;
const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
/** "11/2026" ou "2026-11" → "Novembro 2026". */
const nomeDoPeriodo = (periodo = "") => {
    const m = String(periodo).match(/^(\d{1,2})\/(\d{4})$/) ?? String(periodo).match(/^(\d{4})-(\d{1,2})$/);
    if (!m) return periodo;
    const [mes, ano] = m[1].length === 4 ? [Number(m[2]), m[1]] : [Number(m[1]), m[2]];
    return `${NOMES_MESES[mes - 1]} ${ano}`;
};
const iniciais = (nome = "") =>
    nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();

/** Humor da mascote que acompanha uma mensagem da Aqua. */
export function humorDaMensagem(item) {
    if (SUCESSO.includes(item.tarefaCard?.tipo)) return "feliz";
    if (item.tarefaCard?.tipo === "previa_pagamento" && Number(item.tarefaCard.previa?.saldo_depois) > 0) return "atencao";
    if (item.tarefaCard?.tipo === "distribuicao_pagamento" && Number(item.tarefaCard.distribuicao?.fica_em_aberto) > 0) return "atencao";
    if (item.resposta?.cartao?.tom === "atencao") return "atencao";
    if (item.resposta?.tipo === "atencao") return "atencao";
    return "ola";
}

export function BolhaUtilizador({ texto }) {
    return <div className="ml-auto max-w-[82%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-[#041A53] px-3.5 py-2.5 text-[15px] leading-snug text-white dark:bg-[#0059FF]">{texto}</div>;
}

/** Uma mensagem da Aqua: texto curto primeiro, depois o cartão que a acompanha. */
export default function Mensagem({ item, ctx }) {
    if (item.papel === "user") return <BolhaUtilizador texto={item.texto} />;

    const resposta = item.resposta;
    const card = item.tarefaCard;
    const texto = item.texto ?? resposta?.mensagem;
    const atencao = resposta?.tipo === "atencao";
    const sucesso = ["factura", "pagamento"].includes(card?.tipo);

    // Canvas "2 · Consulta": a resposta é o cartão, sem texto à volta.
    if (resposta?.cartao) {
        return (
            <div className="flex flex-col gap-2">
                <RastoConsulta texto={resposta.cartao.rasto} tempo={resposta.tempo} />
                <CartaoResposta cartao={resposta.cartao} ctx={ctx} />
            </div>
        );
    }

    // Sucesso: o cartão de celebração já traz a mascote grande.
    if (sucesso) return <CartaoTarefa card={card} ctx={ctx} />;

    if (resposta?.consulta_card) {
        return (
            <div className="flex flex-col gap-2">
                <RastoConsulta texto={`Consultei ${resposta.consulta_card.titulo.toLocaleLowerCase()}`} tempo={resposta.tempo} />
                <CartaoConsulta card={resposta.consulta_card} acoes={resposta.acoes} ctx={ctx} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2.5">
                <Mascote humor={humorDaMensagem(item)} tamanho={32} className="mt-0.5" />
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    {resposta?.destaque ? (
                        <CartaoDestaque resposta={resposta} ctx={ctx} id={item.id} />
                    ) : (
                        texto && (
                            <div className={atencao ? `rounded-[20px] border border-[#F3D29E] p-3.5 dark:border-[#4F2D00] ${cor.superficie}` : ""}>
                                <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${cor.texto}`}>{texto}</p>
                                {atencao && <LinhasEvidencia evidencias={resposta?.evidencias} id={item.id} className="mt-2.5 border-t border-[#F3D29E] pt-2.5 dark:border-[#4F2D00]" />}
                            </div>
                        )
                    )}
                    {resposta?.passos?.length > 0 && <Passos passos={resposta.passos} id={item.id} />}
                    {!atencao && !resposta?.destaque && <Evidencias resposta={resposta} id={item.id} />}
                    {resposta?.consulta_card && <CartaoConsulta card={resposta.consulta_card} acoes={resposta.acoes} ctx={ctx} />}
                    {card && <CartaoTarefa card={card} ctx={ctx} />}
                    {resposta?.acoes?.length > 0 && !resposta?.destaque && <Accoes acoes={resposta.acoes} ctx={ctx} id={item.id} />}
                </div>
            </div>
        </div>
    );
}

/** "Rótulo: valor" → linha alinhada; texto sem ":" fica como linha simples. */
function LinhasEvidencia({ evidencias, id, className = "" }) {
    if (!evidencias?.length) return null;
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {evidencias.map((evidencia, indice) => {
                const corte = evidencia.indexOf(":");
                if (corte > 0 && corte < evidencia.length - 1) {
                    const rotulo = evidencia.slice(0, corte).trim();
                    const valor = evidencia.slice(corte + 1).trim();
                    // Rótulo ou valor longos (ex.: cliente + saldo + dias) ficam empilhados.
                    if (rotulo.length + valor.length > 34) {
                        return (
                            <div key={`${id}-ev-${indice}`} className="flex flex-col">
                                <strong className={`text-sm ${cor.texto}`}>{rotulo}</strong>
                                <span className={`text-[13px] ${cor.texto2}`}>{valor}</span>
                            </div>
                        );
                    }
                    return <Linha key={`${id}-ev-${indice}`} rotulo={rotulo} valor={valor} />;
                }
                return (
                    <p key={`${id}-ev-${indice}`} className={`text-sm ${cor.texto2}`}>
                        {evidencia}
                    </p>
                );
            })}
        </div>
    );
}

const TOM_VARIACAO = {
    bom: "bg-[#E3F2E9] text-[#1E7148] dark:bg-[#11281D] dark:text-[#7DD3A3]",
    mau: "bg-[#FDF1F0] text-[#B42318] dark:bg-[#2D1714] dark:text-[#F4A39A]",
    neutro: "bg-[#EDF1F8] text-[#464F66] dark:bg-[#1E232D] dark:text-[#C9D2E3]",
};

/**
 * Cartão "destaque" (canvas "2 · Consulta"): um só número em grande (efeito
 * Von Restorff), a variação, até três evidências e as acções dentro do cartão.
 */
function CartaoDestaque({ resposta, ctx, id }) {
    const { destaque } = resposta;
    const atencao = resposta.tipo === "atencao";
    return (
        <Cartao tom={atencao ? "atencao" : "normal"} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <IlustracaoFactura className="h-7 w-7" />
                <span className={`text-[13px] font-bold ${cor.texto3}`}>{destaque.rotulo}</span>
            </div>
            <div>
                <div className={`break-words text-[32px] font-extrabold leading-none tracking-tight ${cor.texto}`}>{destaque.valor}</div>
                {destaque.variacao && <span className={`mt-2 inline-flex rounded-full px-2 py-[3px] text-xs font-bold ${TOM_VARIACAO[destaque.tom_variacao] ?? TOM_VARIACAO.neutro}`}>{destaque.variacao}</span>}
            </div>
            <LinhasEvidencia evidencias={resposta.evidencias} id={id} className={`border-t pt-2.5 ${cor.divisor}`} />
            {resposta.acoes?.length > 0 && (
                <div className="flex gap-2">
                    {resposta.acoes.slice(0, 2).map((acao, indice) => {
                        const Botao = indice === 0 ? BotaoPrimario : BotaoSuave;
                        return (
                            <Botao key={`${id}-${acao.tarefa ?? acao.url}`} onClick={() => ctx.executarAccao(acao)} className="flex-1 px-3">
                                {acao.rotulo}
                            </Botao>
                        );
                    })}
                </div>
            )}
        </Cartao>
    );
}

function Passos({ passos, id }) {
    return (
        <ol className={`flex flex-col gap-2 rounded-[20px] border p-3.5 ${cor.borda} ${cor.superficie}`}>
            {passos.map((passo, indice) => (
                <li key={`${id}-passo-${indice}`} className={`flex gap-2.5 text-sm leading-relaxed ${cor.texto}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${cor.suave}`}>{indice + 1}</span>
                    <span className="pt-0.5">{passo}</span>
                </li>
            ))}
        </ol>
    );
}

/** Até três evidências, recolhidas por defeito (divulgação progressiva). */
function Evidencias({ resposta, id, embutido = false }) {
    if (!resposta?.evidencias?.length) return null;
    return (
        <details className={embutido ? "mt-2.5 border-t border-[#F3D29E] pt-2 dark:border-[#4F2D00]" : ""}>
            <summary className={`flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-xs font-bold ${cor.ligacao}`}>
                Dados usados <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </summary>
            <ul className={`mt-1.5 flex flex-col gap-1.5 text-[13px] ${cor.texto2}`}>
                {resposta.evidencias.map((evidencia, indice) => (
                    <li key={`${id}-ev-${indice}`} className="flex gap-2">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#6EA2FF]" />
                        {evidencia}
                    </li>
                ))}
            </ul>
        </details>
    );
}

/** Uma só acção primária por resposta (Von Restorff); as restantes ficam suaves. */
function Accoes({ acoes, ctx, id }) {
    const longos = acoes.some((acao) => acao.rotulo.length > 18);
    return (
        <div className={longos ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}>
            {acoes.map((acao, indice) => {
                const Botao = indice === 0 ? BotaoPrimario : BotaoSuave;
                const Icone = acao.tipo === "workflow" ? Plus : ExternalLink;
                return (
                    <Botao key={`${id}-${acao.tarefa ?? acao.url}`} onClick={() => ctx.executarAccao(acao)} className={longos ? "w-full" : "flex-1 basis-[140px]"}>
                        <Icone className="h-4 w-4" aria-hidden="true" />
                        {acao.rotulo}
                    </Botao>
                );
            })}
        </div>
    );
}

function CartaoConsulta({ card, acoes, ctx }) {
    const temAccaoAbrir = acoes?.some((acao) => acao.url?.split("?")[0] === card.url);
    const resumo = Object.entries(card.resumo ?? {})
        .filter(([, valor]) => valor !== 0 && valor !== null)
        .slice(0, 3);
    return (
        <Cartao className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <IlustracaoGrafico className="h-8 w-8" />
                <span className={`text-sm font-bold ${cor.texto3}`}>{card.titulo}</span>
            </div>
            {resumo.length > 0 && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${resumo.length}, minmax(0, 1fr))` }}>
                    {resumo.map(([chave, valor]) => (
                        <div key={chave} className={`min-w-0 rounded-2xl px-3 py-2.5 ${cor.campo}`}>
                            <div className={`truncate text-[11px] font-bold uppercase tracking-wide ${cor.texto3}`}>{chave.replaceAll("_", " ")}</div>
                            <div className={`mt-0.5 truncate text-lg font-extrabold ${cor.texto}`}>{typeof valor === "number" ? new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 2 }).format(valor) : valor}</div>
                        </div>
                    ))}
                </div>
            )}
            {card.registos?.length ? (
                <div className={`flex flex-col divide-y ${cor.divisor} divide-[#EDF1F8] dark:divide-[#1E232D]`}>
                    {card.registos.map((registo, indice) => (
                        <button
                            key={`${registo.url}-${indice}`}
                            type="button"
                            onClick={() => ctx.irPara(registo.url)}
                            className="flex min-h-11 w-full items-center gap-3 py-2 text-left hover:text-[#0059FF]"
                        >
                            <span className="min-w-0 flex-1">
                                <strong className={`block truncate text-sm ${cor.texto}`}>{registo.titulo}</strong>
                                <span className={`block truncate text-xs ${cor.texto3}`}>{registo.detalhe}</span>
                            </span>
                            <ChevronRight className={`h-4 w-4 shrink-0 ${cor.texto3}`} aria-hidden="true" />
                        </button>
                    ))}
                </div>
            ) : (
                <p className={`text-sm ${cor.texto3}`}>Não encontrei registos para estes critérios.</p>
            )}
            {card.total_paginas > 1 && (
                <div className={`flex items-center justify-between gap-2 border-t pt-2.5 ${cor.divisor}`}>
                    <BotaoSuave disabled={ctx.aEnviar || card.pagina <= 1} onClick={() => ctx.carregarPaginaConsulta(card, card.pagina - 1)} className="min-h-10 px-3">
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
                    </BotaoSuave>
                    <span className={`text-xs font-semibold ${cor.texto3}`}>
                        Página {card.pagina} de {card.total_paginas}
                    </span>
                    <BotaoSuave disabled={ctx.aEnviar || card.pagina >= card.total_paginas} onClick={() => ctx.carregarPaginaConsulta(card, card.pagina + 1)} className="min-h-10 px-3">
                        Seguinte <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </BotaoSuave>
                </div>
            )}
            {!temAccaoAbrir && (
                <BotaoPrimario onClick={() => ctx.irPara(card.url)}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    Abrir {card.titulo.toLocaleLowerCase()}
                </BotaoPrimario>
            )}
        </Cartao>
    );
}

function Confirmacao({ rotulo, onConfirmar, ctx, visivel = true }) {
    if (!visivel) return null;
    return (
        <div className="flex flex-col gap-2 pt-1">
            <p className={`text-xs ${cor.texto3}`}>Nada é gravado até confirmar.</p>
            <div className="flex gap-2">
                <BotaoPrimario grande disabled={ctx.aEnviar} onClick={onConfirmar} className="flex-1">
                    {rotulo}
                </BotaoPrimario>
                <button
                    type="button"
                    disabled={ctx.aEnviar}
                    onClick={ctx.cancelarTarefa}
                    className="min-h-14 rounded-[18px] bg-[#F4F6FB] px-5 text-[15px] font-bold text-[#363E51] hover:bg-[#EDF1F8] disabled:opacity-50 dark:bg-[#1E232D] dark:text-[#C9D2E3] dark:hover:bg-[#262C38]"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}

function CartaoTarefa({ card, ctx }) {
    const { tarefa } = ctx;

    switch (card.tipo) {
        case "escolher_resumo_cliente":
            return (
                <div className="flex flex-col gap-2">
                    {card.clientes.map((cliente) => (
                        <Opcao key={cliente.id} icone={UsersRound} titulo={cliente.nome} detalhe={cliente.numero_cliente} onClick={() => ctx.seleccionarResumoCliente(cliente, card.pergunta, card.historico)} />
                    ))}
                </div>
            );

        case "clientes":
            if (tarefa?.etapa !== "escolher_cliente") return null;
            return (
                <div className="flex flex-col gap-2">
                    {card.clientes.map((cliente) => (
                        <Opcao key={cliente.id} icone={UsersRound} titulo={cliente.nome} detalhe={cliente.numero_cliente} onClick={() => ctx.escolherCliente(cliente, card.periodoActual)} />
                    ))}
                    <Cancelar onClick={ctx.cancelarTarefa} />
                </div>
            );

        case "periodo":
            if (tarefa?.etapa !== "periodo") return null;
            return (
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        <BotaoPrimario onClick={() => ctx.escolherPeriodo(tarefa.periodoActual)} className="min-h-12">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Ciclo actual
                        </BotaoPrimario>
                        <BotaoSuave onClick={ctx.pedirOutroMes} className="min-h-12">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Outro mês
                        </BotaoSuave>
                    </div>
                    <Cancelar onClick={ctx.cancelarTarefa} />
                </div>
            );

        case "tipos_ocorrencia":
            if (tarefa?.etapa !== "tipo") return null;
            return (
                <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                        {TIPOS_OCORRENCIA.map(([tipo, rotulo]) => (
                            <BotaoSuave key={tipo} onClick={() => ctx.escolherTipoOcorrencia(tipo, rotulo)} className="min-h-12 justify-start">
                                <TriangleAlert className="h-4 w-4" aria-hidden="true" /> {rotulo}
                            </BotaoSuave>
                        ))}
                    </div>
                    <Cancelar onClick={ctx.cancelarTarefa} />
                </div>
            );

        case "zonas_producao":
            if (tarefa?.etapa !== "zona") return null;
            return (
                <div className="flex flex-col gap-2">
                    <Opcao icone={Factory} titulo="Sistema todo" onClick={() => ctx.escolherZonaProducao(null)} />
                    {card.zonas.map((zona) => (
                        <Opcao key={zona.id} icone={MapPinned} titulo={zona.nome} onClick={() => ctx.escolherZonaProducao(zona)} />
                    ))}
                    <Cancelar onClick={ctx.cancelarTarefa} />
                </div>
            );

        case "facturas_pagamento":
            if (tarefa?.etapa !== "factura") return null;
            return (
                <div className="flex flex-col gap-2">
                    {card.facturas.map((factura) => (
                        <Opcao key={factura.id} icone={FileText} titulo={`Factura ${factura.numero}`} detalhe={mesAno(factura.mes, factura.ano)} onClick={() => ctx.escolherFacturaPagamento(factura)}>
                            <strong className={`shrink-0 text-sm ${cor.texto}`}>{formatMoney(factura.em_falta + factura.multa_prevista)}</strong>
                        </Opcao>
                    ))}
                    <Cancelar onClick={ctx.cancelarTarefa} />
                </div>
            );

        case "metodos_pagamento":
            if (tarefa?.etapa !== "metodo") return null;
            return (
                <fieldset className="flex flex-col gap-2">
                    <legend className="sr-only">Método de pagamento</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {METODOS.map(([metodo, rotulo]) => (
                            <BotaoSuave key={metodo} onClick={() => ctx.escolherMetodoPagamento(metodo)} className="min-h-12">
                                <WalletCards className="h-4 w-4" aria-hidden="true" /> {rotulo}
                            </BotaoSuave>
                        ))}
                    </div>
                </fieldset>
            );

        case "registos":
            return (
                <div className="flex flex-col gap-2">
                    {card.registos.map((registo) => (
                        <Opcao key={`${registo.url}-${registo.titulo}`} icone={ExternalLink} titulo={registo.titulo} detalhe={registo.detalhe} onClick={() => ctx.irPara(registo.url)} />
                    ))}
                </div>
            );

        case "resumo_cliente":
            return <ResumoCliente cliente={card.cliente} ctx={ctx} />;

        case "zona_previa":
            return (
                <Cartao className="flex flex-col gap-3">
                    <Linha rotulo="Nova zona" valor={card.nome} />
                    <Confirmacao rotulo="Criar zona" onConfirmar={ctx.confirmarTarefaOperacional} ctx={ctx} visivel={tarefa?.etapa === "confirmar"} />
                </Cartao>
            );

        case "ocorrencia_previa":
            return (
                <Cartao className="flex flex-col gap-3">
                    <Linha rotulo="Tipo" valor={card.tipoOcorrencia.replaceAll("_", " ")} />
                    <p className={`whitespace-pre-wrap rounded-2xl p-3 text-sm leading-relaxed ${cor.campo} ${cor.texto}`}>{card.descricao}</p>
                    <Confirmacao rotulo="Registar ocorrência" onConfirmar={ctx.confirmarTarefaOperacional} ctx={ctx} visivel={tarefa?.etapa === "confirmar"} />
                </Cartao>
            );

        case "producao_previa":
            return (
                <Cartao tom={card.previa.vai_substituir ? "atencao" : "normal"} className="flex flex-col gap-3">
                    <div>
                        <div className={`text-[13px] font-bold ${cor.texto3}`}>
                            {card.previa.periodo} · {card.previa.zona}
                        </div>
                        <div className={`mt-1 text-[32px] font-extrabold leading-none tracking-tight ${cor.texto}`}>
                            {formatNumero(card.previa.volume_m3)}
                            <span className={`text-lg font-bold ${cor.texto3}`}> m³</span>
                        </div>
                    </div>
                    {card.previa.vai_substituir && <p className={`rounded-2xl p-3 text-sm ${cor.ambar}`}>O valor guardado ({formatNumero(card.previa.valor_anterior)} m³) será substituído.</p>}
                    <Confirmacao rotulo="Confirmar registo" onConfirmar={ctx.confirmarTarefaOperacional} ctx={ctx} visivel={tarefa?.etapa === "confirmar"} />
                </Cartao>
            );

        case "escolher_mes":
            if (tarefa?.etapa !== "periodo_manual") return null;
            return <EscolherMes periodoActual={card.periodoActual ?? tarefa?.periodoActual} onEscolher={ctx.escolherPeriodo} onCancelar={ctx.cancelarTarefa} />;

        case "contexto_leitura":
            return <ContextoLeitura contexto={card.contexto} />;

        case "previa_leitura":
            return <PreviaLeitura previa={card.previa} ctx={ctx} />;

        case "previa_pagamento":
            return <CoberturaPagamento previa={card.previa} facturas={card.facturas} />;

        case "distribuicao_pagamento":
            return <CoberturaDistribuicao distribuicao={card.distribuicao} />;

        case "factura":
            return (
                <CartaoSucesso
                    titulo="Leitura gravada!"
                    subtitulo={`A factura ${card.factura.numero} já foi emitida com este valor.`}
                    dados={[
                        ["Período", mesAno(card.leitura.mes, card.leitura.ano)],
                        ["Consumo", `${formatNumero(card.leitura.consumo_m3)} m³`],
                        ["Factura", formatMoney(card.factura.total_pagar)],
                    ]}
                    rodape={`Leitura ${card.leitura.numero} · ${card.factura.estado}`}
                >
                    <BotaoPrimario grande onClick={ctx.iniciarRegistoLeitura}>
                        Registar outra leitura <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </BotaoPrimario>
                    <BotaoSuave onClick={() => ctx.irPara(card.factura.url)}>
                        <FileText className="h-4 w-4" aria-hidden="true" /> Abrir factura
                    </BotaoSuave>
                </CartaoSucesso>
            );

        case "pagamento":
            return (
                <CartaoSucesso
                    titulo="Pagamento registado!"
                    subtitulo={card.factura.em_falta > 0 ? `A factura ainda tem ${formatMoney(card.factura.em_falta)} em aberto.` : "A factura ficou liquidada."}
                    dados={[
                        ["Recibo", card.pagamento.numero_recibo],
                        ["Valor", formatMoney(card.pagamento.valor_pago)],
                        ["Em falta", formatMoney(card.factura.em_falta)],
                    ]}
                >
                    <BotaoPrimario grande onClick={() => ctx.irPara(card.recibo_url)}>
                        <FileText className="h-4 w-4" aria-hidden="true" /> Abrir recibo
                    </BotaoPrimario>
                    <BotaoSuave onClick={ctx.iniciarRegistoPagamento}>Registar outro pagamento</BotaoSuave>
                </CartaoSucesso>
            );

        default:
            return null;
    }
}

/** Seletor de mês: os últimos seis meses como botões e um campo de mês para os restantes. */
function EscolherMes({ periodoActual, onEscolher, onCancelar }) {
    const [ano, mes] = String(periodoActual || new Date().toISOString().slice(0, 7)).split("-").map(Number);
    const meses = Array.from({ length: 6 }, (_, recuo) => {
        const data = new Date(ano, mes - 1 - recuo, 1);
        return { valor: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`, rotulo: `${NOMES_MESES[data.getMonth()]} ${data.getFullYear()}` };
    });
    const [outro, setOutro] = useState("");
    return (
        <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
                {meses.map((item, indice) => {
                    const Botao = indice === 0 ? BotaoPrimario : BotaoSuave;
                    return (
                        <Botao key={item.valor} onClick={() => onEscolher(item.valor)} className="min-h-12">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" /> {item.rotulo}
                        </Botao>
                    );
                })}
            </div>
            <div className={`flex items-center gap-2 rounded-2xl border p-1.5 pl-3.5 ${cor.borda} ${cor.superficie}`}>
                <label htmlFor="aqua-outro-mes" className={`shrink-0 text-sm font-semibold ${cor.texto2}`}>
                    Outro mês
                </label>
                <input
                    id="aqua-outro-mes"
                    type="month"
                    value={outro}
                    max={meses[0].valor}
                    onChange={(evento) => setOutro(evento.target.value)}
                    className={`h-10 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-2 text-[15px] focus:ring-0 dark:[color-scheme:dark] ${cor.texto}`}
                />
                <BotaoPrimario disabled={!outro} onClick={() => onEscolher(outro)} className="min-h-10 px-3.5">
                    Usar
                </BotaoPrimario>
            </div>
            <Cancelar onClick={onCancelar} />
        </div>
    );
}

function ResumoCliente({ cliente, ctx }) {
    const calculos = cliente.calculos;
    return (
        <Cartao tom={calculos.saldo_vencido > 0 ? "atencao" : "normal"} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-extrabold ${cor.suave}`}>{iniciais(cliente.nome)}</span>
                <div className="min-w-0">
                    <div className={`truncate text-[15px] font-bold ${cor.texto}`}>{cliente.nome}</div>
                    <div className={`truncate text-xs ${cor.texto3}`}>
                        {cliente.numero_cliente} · {cliente.estado}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                    ["Saldo em aberto", calculos.saldo_em_aberto, false],
                    ["Saldo vencido", calculos.saldo_vencido, calculos.saldo_vencido > 0],
                    ["Multas em falta", calculos.multas_registadas_em_falta, false],
                    ["Multas previstas", calculos.multas_previstas, false],
                ].map(([rotulo, valor, alerta]) => (
                    <div key={rotulo} className={`rounded-2xl px-3 py-2.5 ${alerta ? cor.ambar : cor.campo}`}>
                        <div className={`text-[11px] font-bold uppercase tracking-wide ${alerta ? "" : cor.texto3}`}>{rotulo}</div>
                        <div className={`mt-0.5 text-base font-extrabold ${alerta ? "" : cor.texto}`}>{formatMoney(valor)}</div>
                    </div>
                ))}
            </div>
            <div className={`flex flex-col gap-1.5 border-t pt-3 ${cor.divisor}`}>
                <Linha rotulo="Última factura" valor={cliente.ultima_factura ? `${cliente.ultima_factura.numero} · ${formatMoney(cliente.ultima_factura.saldo)} em aberto` : "Sem factura"} />
                <Linha rotulo="Última leitura" valor={cliente.ultima_leitura ? `${cliente.ultima_leitura.periodo} · ${formatNumero(cliente.ultima_leitura.consumo_m3)} m³` : "Sem leitura"} />
                {cliente.ultimo_pagamento && <Linha rotulo="Último pagamento" valor={`${formatMoney(cliente.ultimo_pagamento.valor)} · ${cliente.ultimo_pagamento.data}`} />}
            </div>
            {cliente.facturas_em_aberto.length > 0 && (
                <div className={`flex flex-col gap-1.5 border-t pt-3 ${cor.divisor}`}>
                    <span className={`text-xs font-bold uppercase tracking-wide ${cor.texto3}`}>Facturas em aberto</span>
                    {cliente.facturas_em_aberto.slice(0, 5).map((factura) => (
                        <Linha key={factura.numero} rotulo={`${factura.numero} · ${factura.periodo}${factura.vencida ? " · vencida" : ""}`} valor={formatMoney(factura.saldo)} destaque={factura.vencida} />
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-2">
                <BotaoPrimario onClick={() => ctx.irPara(cliente.url)} className="flex-1 basis-[140px]">
                    <UsersRound className="h-4 w-4" aria-hidden="true" /> Abrir cliente
                </BotaoPrimario>
                {cliente.ultima_factura && (
                    <BotaoSuave onClick={() => ctx.irPara(cliente.ultima_factura.url)} className="flex-1 basis-[140px]">
                        <FileText className="h-4 w-4" aria-hidden="true" /> Abrir factura
                    </BotaoSuave>
                )}
                {cliente.ultima_leitura && (
                    <BotaoSuave onClick={() => ctx.irPara(cliente.ultima_leitura.url)} className="flex-1 basis-[140px]">
                        <Droplet className="h-4 w-4" aria-hidden="true" /> Abrir leitura
                    </BotaoSuave>
                )}
            </div>
        </Cartao>
    );
}

function PreviaLeitura({ previa, ctx }) {
    const plano = previa.plano;
    const factura = previa.previsao_factura;
    const alerta = plano.retroactiva || previa.avisos.length > 0;
    return (
        <Cartao tom={alerta ? "atencao" : "normal"} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <IlustracaoFactura className="h-8 w-8" />
                <span className={`text-sm font-bold ${cor.texto3}`}>Prévia · {nomeDoPeriodo(plano.periodo)}</span>
            </div>
            <div>
                <div className={`text-xs font-bold uppercase tracking-wide ${cor.texto3}`}>Consumo</div>
                <div className={`text-[32px] font-extrabold leading-none tracking-tight ${cor.texto}`}>
                    {formatNumero(plano.consumo_novo)}
                    <span className={`text-lg font-bold ${cor.texto3}`}> m³</span>
                </div>
                <div className={`mt-1.5 text-sm ${cor.texto2}`}>
                    Contador {formatNumero(plano.leitura_anterior)} → <strong className={cor.texto}>{formatNumero(plano.leitura_anterior + plano.consumo_novo)}</strong>
                </div>
            </div>
            <div className={`flex flex-col gap-1.5 border-t pt-3 ${cor.divisor}`}>
                <Linha rotulo="Valor do consumo" valor={formatMoney(factura.valor_consumo)} />
                <Linha rotulo="Factura estimada" valor={formatMoney(factura.valor_factura_estimado)} />
                {factura.divida_anterior > 0 && <Linha rotulo="Dívida anterior" valor={formatMoney(factura.divida_anterior)} destaque />}
            </div>
            {factura.nota && <p className={`text-xs ${cor.texto3}`}>{factura.nota}</p>}
            {previa.avisos.map((aviso) => (
                <p key={aviso} className={`rounded-2xl p-3 text-sm ${cor.ambar}`}>
                    {aviso}
                </p>
            ))}
            {plano.retroactiva && <p className={`rounded-2xl p-3 text-sm ${cor.ambar}`}>A inserção altera a leitura e pode recalcular a factura do período seguinte.</p>}
            {ctx.tarefa?.etapa === "confirmar" && <p className={`text-xs ${cor.texto3}`}>Nada é gravado até confirmar.</p>}
        </Cartao>
    );
}

function PreviaPagamento({ previa, ctx }) {
    const restante = Math.max(0, Number(previa.saldo_depois) || 0);
    const pago = Math.max(0, Number(previa.valor_pago) || 0);
    const total = pago + restante || 1;
    return (
        <Cartao tom={restante > 0 ? "atencao" : "normal"} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
                <IlustracaoCarteira className="h-8 w-8" />
                <span className={`text-sm font-bold ${cor.texto3}`}>
                    Factura {previa.factura.numero} · {mesAno(previa.factura.mes, previa.factura.ano)}
                </span>
            </div>
            <div>
                <div className={`text-xs font-bold uppercase tracking-wide ${cor.texto3}`}>Valor recebido</div>
                <div className={`text-[32px] font-extrabold leading-none tracking-tight ${cor.texto}`}>{formatMoney(pago)}</div>
                <div className={`mt-1 text-sm ${cor.texto2}`}>Método: {Object.fromEntries(METODOS)[previa.metodo_pagamento] ?? previa.metodo_pagamento}</div>
            </div>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${formatMoney(pago)} pagos, ${formatMoney(restante)} ficam em aberto`}>
                <span className="bg-[#2EA063]" style={{ flex: pago / total }} />
                {restante > 0 && <span className="bg-[#F3C77A]" style={{ flex: restante / total }} />}
            </div>
            <Linha rotulo={restante > 0 ? "Fica em aberto" : "Saldo depois"} valor={formatMoney(restante)} destaque={restante > 0} />
            <Confirmacao rotulo="Confirmar pagamento" onConfirmar={() => ctx.confirmarTarefaPagamento(ctx.tarefa.payload)} ctx={ctx} visivel={ctx.tarefa?.etapa === "confirmar"} />
        </Cartao>
    );
}
