import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, CornerDownLeft, Mic, Plus, X } from "lucide-react";
import Mascote from "@/Components/Aqua/Mascote";
import { IlustracaoCarteira, IlustracaoContador, IlustracaoFuga, IlustracaoGrafico, IlustracaoOcorrencia, Ondas } from "@/Components/Aqua/Ilustracoes";
import { cor } from "@/Components/Aqua/Partes";

function saudacao() {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 19) return "Boa tarde";
    return "Boa noite";
}

const ILUSTRACOES = { grafico: IlustracaoGrafico, carteira: IlustracaoCarteira, fuga: IlustracaoFuga, ocorrencia: IlustracaoOcorrencia };

const TONS_HOJE = {
    ambar: "bg-[#FCEFD9] text-[#8A4F00] dark:bg-[#2A2212] dark:text-[#F3C77A]",
    azul: "bg-[#E6EEFF] text-[#0047CC] dark:bg-[#0E1C3F] dark:text-[#6EA2FF]",
    vermelho: "bg-[#FDF1F0] text-[#B42318] dark:bg-[#2D1714] dark:text-[#F4A39A]",
};

/**
 * Início da conversa (canvas "1 · Início"): saudação com o resumo do dia,
 * cartão "Hoje" com dados reais, "continuar onde ficou" (só quando existe de
 * facto uma conversa anterior) e no máximo três sugestões (lei de Hick).
 */
export function EcraInicial({ nome, hoje = [], conversaAnterior, sugestoes }) {
    const primeiroNome = (nome ?? "").trim().split(/\s+/)[0];
    const resumo =
        hoje.length === 0
            ? "Pergunte sobre qualquer área ou peça uma tarefa. Mostro tudo antes de gravar."
            : `Vi o painel de hoje. ${hoje.length === 1 ? "Há 1 coisa que merece" : `Há ${hoje.length} coisas que merecem`} atenção.`;
    return (
        <div className="flex flex-col gap-3.5">
            <section className="relative flex items-center gap-3.5 overflow-hidden rounded-3xl bg-[#041A53] px-5 pb-[22px] pt-5 text-white dark:bg-[#10204A]">
                <div className="relative z-10 shrink-0">
                    <Mascote humor="ola" tamanho={96} sobreEscuro />
                </div>
                <div className="relative z-10 min-w-0">
                    <h2 className="text-[22px] font-extrabold leading-tight">
                        {saudacao()}
                        {primeiroNome ? `, ${primeiroNome}` : ""}.
                    </h2>
                    <p className="mt-1.5 text-sm leading-snug text-[#D6E2FF]">{resumo}</p>
                </div>
                <Ondas />
            </section>

            {hoje.length > 0 && (
                <section aria-label="Hoje" className={`rounded-[20px] border p-1.5 ${cor.borda} ${cor.superficie}`}>
                    {hoje.map((item) => (
                        <button key={item.titulo} type="button" onClick={item.onClick} className={`flex min-h-14 w-full items-center gap-3 rounded-[14px] p-2.5 text-left transition hover:bg-[#F4F6FB] dark:hover:bg-[#1E232D] ${cor.texto}`}>
                            <span className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-1 font-extrabold ${item.valor.length > 3 ? "text-[11px]" : "text-sm"} ${TONS_HOJE[item.tom] ?? TONS_HOJE.azul}`}>{item.valor}</span>
                            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <span className="text-sm font-semibold leading-snug">{item.titulo}</span>
                                {item.progresso !== undefined && (
                                    <span className="h-[5px] overflow-hidden rounded-full bg-[#E1E7F3] dark:bg-[#262C38]">
                                        <span className="block h-full rounded-full bg-[#0059FF]" style={{ width: `${Math.min(100, Math.max(2, item.progresso))}%` }} />
                                    </span>
                                )}
                            </span>
                            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#8C97B0] dark:text-[#5B6478]" aria-hidden="true" />
                        </button>
                    ))}
                </section>
            )}

            {conversaAnterior && (
                <section aria-label="Continuar onde ficou" className={`flex items-center gap-3 rounded-[20px] border p-3.5 ${cor.borda} ${cor.superficie}`}>
                    <IlustracaoContador />
                    <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-bold uppercase tracking-wide ${cor.ligacao}`}>Continuar onde ficou</span>
                        <span className={`mt-0.5 block truncate text-sm font-bold ${cor.texto}`}>{conversaAnterior.titulo}</span>
                    </span>
                    <button type="button" onClick={conversaAnterior.onAbrir} className={`flex h-11 shrink-0 items-center rounded-[14px] px-4 text-sm font-bold ${cor.primario}`}>
                        Continuar
                    </button>
                </section>
            )}

            {sugestoes.length > 0 && (
                <section aria-label="Sugestões">
                    <h3 className={`mx-1 mb-2.5 text-[13px] font-bold ${cor.texto3}`}>Ou pergunte</h3>
                    <div className="grid grid-cols-3 gap-2.5">
                        {sugestoes.map((sugestao) => {
                            const Ilustracao = ILUSTRACOES[sugestao.ilustracao] ?? IlustracaoGrafico;
                            return (
                                <button
                                    key={sugestao.titulo}
                                    type="button"
                                    onClick={sugestao.onClick}
                                    className={`flex min-h-[112px] flex-col gap-2.5 rounded-[18px] border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#9DBBFF] ${cor.borda} ${cor.superficie}`}
                                >
                                    <Ilustracao />
                                    <span className={`text-[13px] font-bold leading-snug ${cor.texto}`}>{sugestao.titulo}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}

const ONDA_BASE = [10, 16, 24, 32, 20, 36, 44, 28, 40, 24, 46, 34, 20, 38, 30, 44, 26, 16, 34, 42, 22, 30, 14, 24, 10, 16, 8, 6];

const FASES_VOZ = {
    ouvir: { humor: "ouvir", rotulo: "A OUVIR" },
    transcrever: { humor: "processar", rotulo: "A TRANSCREVER…" },
    pensar: { humor: "pensar", rotulo: "A PENSAR…" },
    resposta: { humor: "ola", rotulo: "" },
};

/**
 * Canvas "6 · Voz": uma conversa por voz no mesmo ecrã. A mascote ouve e as
 * ondas seguem o som real do microfone; ao silêncio pára sozinha, transcreve,
 * mostra o que percebeu e a resposta. O botão grande (76 px, lei de Fitts)
 * pára ou volta a ouvir.
 */
export function EcraVoz({ fase, segundos, nivel = 0, titulo, subtitulo, transcricao, resposta, humorResposta, aviso, onParar, onFalar, onCancelar, onEscrever }) {
    const config = FASES_VOZ[fase] ?? FASES_VOZ.ouvir;
    const minutos = Math.floor(segundos / 60);
    const resto = String(segundos % 60).padStart(2, "0");
    const aOuvir = fase === "ouvir";
    const humor = fase === "resposta" ? (humorResposta ?? "ola") : config.humor;
    // As barras crescem com o volume da voz; as da direita ficam mais suaves.
    const escala = aOuvir ? 0.18 + Math.min(1, nivel) * 1.1 : 0.35;

    return (
        <div className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#041A53] text-white dark:bg-[#0B0D12]">
            <div className="flex items-center gap-3 px-5 pb-2 pt-4">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-extrabold">{titulo}</div>
                    <div className="truncate text-xs text-[#9DBBFF]">{subtitulo}</div>
                </div>
                <button type="button" onClick={onCancelar} aria-label="Fechar a conversa por voz" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/10 hover:bg-white/15">
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center gap-3.5 overflow-y-auto px-5 pb-4">
                {!transcricao && (
                    <p className="self-stretch rounded-2xl bg-white/[0.08] px-3.5 py-3 text-sm leading-relaxed text-[#D6E2FF] dark:bg-[#161A22]">
                        Pergunte ou diga o que aconteceu. Eu oiço, transcrevo e respondo aqui.
                    </p>
                )}
                <div className={fase === "resposta" ? "mt-1" : "mt-3"}>
                    <Mascote humor={humor} tamanho={fase === "resposta" ? 96 : 168} sobreEscuro />
                </div>
                {fase !== "resposta" && (
                    <>
                        <div className="flex h-12 items-center gap-1" aria-hidden="true">
                            {ONDA_BASE.map((altura, indice) => (
                                <span
                                    key={indice}
                                    className={`w-1 rounded-full transition-[height] duration-75 ${aOuvir ? "" : "aqua-barra-voz"} ${indice < 20 ? "bg-[#6EA2FF]" : "bg-[#9DBBFF]/35"}`}
                                    style={{ height: Math.max(4, Math.round(altura * escala * (0.75 + ((indice * 37) % 10) / 20))), animationDelay: `${(indice % 7) * 0.12}s` }}
                                />
                            ))}
                        </div>
                        <div className="text-[13px] font-bold tracking-wide text-[#9DBBFF]" aria-live="polite">
                            {config.rotulo}
                            {aOuvir && ` · ${minutos}:${resto}`}
                        </div>
                    </>
                )}
                {transcricao && <p className="self-stretch text-center text-[19px] font-semibold leading-snug">“{transcricao}”</p>}
                {aviso && <p className="self-stretch rounded-2xl bg-[#FCEFD9] px-3.5 py-3 text-sm text-[#8A4F00]">{aviso}</p>}
                {fase === "resposta" && resposta && <div className="w-full rounded-[22px] bg-[#F4F6FB] p-3 text-left dark:bg-[#0B0D12]">{resposta}</div>}
            </div>

            <svg viewBox="0 0 390 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] w-full" aria-hidden="true">
                <path d="M0 50 Q49 30 98 50 T195 50 T293 50 T390 50 V120 H0 Z" className="fill-[#0A2A78] dark:fill-[#10204A]" />
                <path d="M0 78 Q49 62 98 78 T195 78 T293 78 T390 78 V120 H0 Z" fill="#0059FF" opacity="0.45" />
            </svg>
            <div className="relative z-10 flex items-center justify-between px-5 pb-6 pt-4">
                <button type="button" onClick={onCancelar} className="min-h-12 w-24 rounded-2xl text-[15px] font-bold text-[#D6E2FF] hover:bg-white/10">
                    {aOuvir ? "Cancelar" : "Fechar"}
                </button>
                {aOuvir ? (
                    <button
                        type="button"
                        onClick={onParar}
                        aria-label="Parar de ouvir"
                        className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/25 bg-white bg-clip-padding text-[#041A53] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6EA2FF]"
                    >
                        <span className="h-6 w-6 rounded-[6px] bg-current" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onFalar}
                        disabled={fase !== "resposta"}
                        aria-label="Falar outra vez"
                        className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-white/25 bg-white bg-clip-padding text-[#041A53] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6EA2FF]"
                    >
                        <Mic className="h-7 w-7" aria-hidden="true" />
                    </button>
                )}
                <button type="button" onClick={onEscrever} className="min-h-12 w-24 rounded-2xl text-[15px] font-bold text-[#D6E2FF] hover:bg-white/10">
                    Escrever
                </button>
            </div>
        </div>
    );
}

/**
 * Botão flutuante com a mascote (desktop). Mostra no máximo uma sugestão
 * contextual de cada vez, sempre dispensável — nunca pressão nem urgência.
 */
export function Lancador({ aberto, onAbrir, onFalar, sugestao, onAceitar, onDispensar, accionadorRef, pendente = false }) {
    // Toque abre o chat; manter premido (0,45 s) abre a conversa por voz em ecrã inteiro.
    const temporizador = useRef(null);
    const longo = useRef(false);
    const premir = () => {
        longo.current = false;
        temporizador.current = window.setTimeout(() => {
            longo.current = true;
            onFalar?.();
        }, 450);
    };
    const largar = () => window.clearTimeout(temporizador.current);
    return (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[64] hidden items-end gap-3.5 md:flex">
            {sugestao && !aberto && (
                <div role="status" className={`pointer-events-auto w-[300px] rounded-[20px] rounded-br-md border p-3.5 shadow-[0_24px_60px_rgba(4,26,83,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55)] ${cor.borda} bg-white dark:bg-[#262C38]`}>
                    <div className="flex items-start gap-2">
                        <p className={`flex-1 text-sm leading-relaxed ${cor.texto}`}>{sugestao.texto}</p>
                        <button type="button" onClick={onDispensar} aria-label="Dispensar sugestão" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-[#F4F6FB] dark:hover:bg-[#1E232D] ${cor.texto3}`}>
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                        <button type="button" onClick={onAceitar} className={`h-9 rounded-xl px-3.5 text-[13px] font-bold ${cor.primario}`}>
                            {sugestao.aceitar}
                        </button>
                        <button type="button" onClick={onDispensar} className={`h-9 rounded-xl border px-3.5 text-[13px] font-semibold ${cor.borda} ${cor.texto2}`}>
                            Agora não
                        </button>
                    </div>
                </div>
            )}
            <button
                ref={accionadorRef}
                type="button"
                onPointerDown={premir}
                onPointerUp={largar}
                onPointerLeave={largar}
                onContextMenu={(evento) => evento.preventDefault()}
                onClick={() => {
                    if (longo.current) {
                        longo.current = false;
                        return;
                    }
                    onAbrir();
                }}
                aria-label={aberto ? "Fechar a Aqua" : "Abrir a Aqua (Ctrl + K). Mantenha premido para falar"}
                aria-expanded={aberto}
                aria-controls="aqua-guia"
                title="Toque para abrir · mantenha premido para falar"
                className="pointer-events-auto relative flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-[#041A53] shadow-[0_14px_32px_rgba(4,26,83,0.35)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#6EA2FF] dark:shadow-[0_14px_32px_rgba(0,0,0,0.5)]"
            >
                <Mascote humor={sugestao && !aberto ? "ideia" : "ola"} tamanho={64} sobreEscuro />
                {(sugestao || pendente) && !aberto && <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-[3px] border-[#EDF1F8] bg-[#D98A00] px-1 text-[11px] font-extrabold text-white dark:border-[#0B0D12]">1</span>}
            </button>
        </div>
    );
}

/**
 * Notificação de uma resposta que chegou com o chat fechado: a pergunta, o
 * cartão da resposta (com os seus botões) e "Abrir conversa". Acompanha o som
 * de gota. Fica até a pessoa a abrir ou dispensar.
 */
export function NotificacaoAqua({ notificacao, humor, onAbrir, onDispensar, children }) {
    return (
        <section
            role="status"
            aria-label="Resposta da Aqua"
            className={`fixed inset-x-3 bottom-[calc(108px+env(safe-area-inset-bottom))] z-[64] flex max-h-[min(70dvh,560px)] flex-col overflow-hidden rounded-[24px] border shadow-[0_24px_60px_rgba(4,26,83,0.25)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)] md:inset-x-auto md:bottom-[112px] md:right-6 md:w-[380px] ${cor.borda} ${cor.fundo}`}
        >
            <div className={`flex items-center gap-2.5 border-b px-3.5 py-2.5 ${cor.borda} ${cor.superficie}`}>
                <Mascote humor={humor} tamanho={32} />
                <div className="min-w-0 flex-1">
                    <div className={`text-sm font-extrabold ${cor.texto}`}>A Aqua respondeu</div>
                    <div className={`truncate text-xs ${cor.texto3}`}>“{notificacao.pergunta}”</div>
                </div>
                <button type="button" onClick={onDispensar} aria-label="Dispensar notificação" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-[#F4F6FB] dark:hover:bg-[#1E232D] ${cor.texto3}`}>
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
            <div className={`border-t p-2.5 ${cor.borda} ${cor.superficie}`}>
                <button type="button" onClick={onAbrir} className={`flex h-11 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-bold ${cor.suave}`}>
                    Abrir conversa <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </section>
    );
}

/**
 * Paleta Ctrl + K: escrever e Enter pergunta à Aqua; a mesma caixa leva a
 * páginas e inicia tarefas. Tab passa o texto para o painel sem enviar.
 */
export function Paleta({ onFechar, onPerguntar, onAbrirNoPainel, destinos, tarefas, onTarefa, onIrPara }) {
    const [texto, setTexto] = useState("");
    const [activo, setActivo] = useState(0);
    const campo = useRef(null);

    useEffect(() => {
        requestAnimationFrame(() => campo.current?.focus());
    }, []);

    const itens = useMemo(() => {
        const termo = texto.trim().toLocaleLowerCase();
        const lista = [];
        if (termo) lista.push({ grupo: "Perguntar à Aqua", rotulo: texto.trim(), accao: () => onPerguntar(texto.trim()), tipo: "pergunta" });
        else
            ["Resume a situação geral do sistema.", "Que clientes têm saldo vencido?"].forEach((pergunta) =>
                lista.push({ grupo: "Perguntar à Aqua", rotulo: pergunta, accao: () => onPerguntar(pergunta), tipo: "pergunta" }),
            );
        destinos
            .filter((destino) => !termo || destino.label.toLocaleLowerCase().includes(termo))
            .slice(0, termo ? 4 : 3)
            .forEach((destino) => lista.push({ grupo: "Ir para", rotulo: destino.label, accao: () => onIrPara(destino.href), tipo: "pagina" }));
        tarefas
            .filter((tarefa) => !termo || tarefa.rotulo.toLocaleLowerCase().includes(termo))
            .slice(0, 3)
            .forEach((tarefa) => lista.push({ grupo: "Fazer com a Aqua", rotulo: tarefa.rotulo, accao: () => onTarefa(tarefa.tarefa), tipo: "tarefa" }));
        return lista;
    }, [texto, destinos, tarefas, onPerguntar, onIrPara, onTarefa]);

    useEffect(() => setActivo(0), [texto]);

    const teclas = (evento) => {
        if (evento.key === "Escape") {
            evento.preventDefault();
            onFechar();
        } else if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setActivo((indice) => Math.min(itens.length - 1, indice + 1));
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setActivo((indice) => Math.max(0, indice - 1));
        } else if (evento.key === "Enter") {
            evento.preventDefault();
            itens[activo]?.accao();
        } else if (evento.key === "Tab" && texto.trim()) {
            evento.preventDefault();
            onAbrirNoPainel(texto.trim());
        }
    };

    let grupoAnterior = null;
    return (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(3,9,35,0.42)] px-4 pt-[12vh] dark:bg-black/60" onMouseDown={onFechar}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Paleta da Aqua"
                onMouseDown={(evento) => evento.stopPropagation()}
                className={`w-full max-w-[640px] overflow-hidden rounded-3xl border shadow-[0_24px_60px_rgba(4,26,83,0.25)] ${cor.borda} bg-white dark:bg-[#262C38]`}
            >
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${cor.borda}`}>
                    <Mascote humor={texto.trim() ? "pensar" : "ideia"} tamanho={40} />
                    <label htmlFor="aqua-paleta" className="sr-only">
                        Perguntar à Aqua ou procurar
                    </label>
                    <input
                        id="aqua-paleta"
                        ref={campo}
                        value={texto}
                        onChange={(evento) => setTexto(evento.target.value)}
                        onKeyDown={teclas}
                        placeholder="Pergunte à Aqua ou procure uma página…"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="aqua-paleta-lista"
                        aria-activedescendant={itens[activo] ? `aqua-paleta-${activo}` : undefined}
                        autoComplete="off"
                        maxLength={1200}
                        className={`h-11 min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[#8C97B0] focus:!border-0 focus:!shadow-none focus:ring-0 ${cor.texto}`}
                    />
                    <kbd className={`rounded-md border px-1.5 py-0.5 font-sans text-[11px] font-bold ${cor.borda} ${cor.texto3}`}>Esc</kbd>
                </div>
                <ul id="aqua-paleta-lista" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
                    {itens.map((item, indice) => {
                        const cabecalho = item.grupo !== grupoAnterior ? item.grupo : null;
                        grupoAnterior = item.grupo;
                        const Icone = item.tipo === "pagina" ? ArrowRight : item.tipo === "tarefa" ? Plus : null;
                        return (
                            <li key={`${item.grupo}-${item.rotulo}`} role="presentation">
                                {cabecalho && <div className={`px-2.5 pb-1 pt-2.5 text-[11px] font-extrabold uppercase tracking-wider ${cor.texto3}`}>{cabecalho}</div>}
                                <button
                                    id={`aqua-paleta-${indice}`}
                                    type="button"
                                    role="option"
                                    aria-selected={indice === activo}
                                    onMouseEnter={() => setActivo(indice)}
                                    onClick={item.accao}
                                    className={`flex min-h-11 w-full items-center gap-3 rounded-[14px] px-2.5 text-left text-[15px] ${indice === activo ? `bg-[#F0F4FF] font-bold dark:bg-[#0E1C3F] ${cor.texto}` : cor.texto2}`}
                                >
                                    {Icone ? (
                                        <Icone className={`h-[18px] w-[18px] shrink-0 ${cor.texto3}`} aria-hidden="true" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
                                            <path d="M12 3 C12 3 19 11 19 15 A7 7 0 0 1 5 15 C5 11 12 3 12 3 Z" fill={indice === activo ? "#0059FF" : "#9DBBFF"} />
                                        </svg>
                                    )}
                                    <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                                    {indice === activo && <CornerDownLeft className={`h-4 w-4 shrink-0 ${cor.texto3}`} aria-hidden="true" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className={`flex flex-wrap gap-4 border-t px-4 py-2.5 text-xs ${cor.borda} ${cor.texto3}`}>
                    <span>↑ ↓ navegar</span>
                    <span>Enter escolher</span>
                    <span>Tab abrir no painel</span>
                </div>
            </section>
        </div>
    );
}
