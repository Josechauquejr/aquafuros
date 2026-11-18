import { ArrowUp, Check, ChevronDown, LoaderCircle, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import MascoteAqua from "@/Components/MascoteAqua";
import { previewPost } from "@/lib/previewPost";

const AREAS = [
    { chave: "leituras", rotulo: "Leituras", rotas: ["/leituras", "/leituras-estimadas"], sugestoes: ["O que falta confirmar neste ciclo?", "O que devo verificar antes de confirmar uma leitura?"] },
    { chave: "facturas", rotulo: "Facturação", rotas: ["/facturas"], sugestoes: ["O que falta para fechar a facturação?", "Quantas facturas continuam pendentes?"] },
    { chave: "cobranca", rotulo: "Cobrança", rotas: ["/cobranca"], sugestoes: ["Como devo priorizar a cobrança?", "Qual é o saldo vencido neste momento?"] },
    { chave: "pagamentos", rotulo: "Caixa", rotas: ["/pagamentos", "/creditos", "/caixa"], sugestoes: ["Resume os recebimentos de hoje.", "O que devo conferir antes do fecho de caixa?"] },
    { chave: "clientes", rotulo: "Clientes", rotas: ["/clientes"], sugestoes: ["Resume a situação actual dos clientes.", "Como encontro clientes sem leitura no ciclo?"] },
    { chave: "ocorrencias", rotulo: "Ocorrências", rotas: ["/ocorrencias"], sugestoes: ["Que ocorrências continuam por resolver?", "O que devo incluir no registo de uma avaria?"] },
    { chave: "producao", rotulo: "Produção de água", rotas: ["/producao"], sugestoes: ["Há produção registada neste ciclo?", "Como interpretar o volume produzido?"] },
];

function contextoDaPagina(url = "") {
    const caminho = url.split("?")[0];
    return AREAS.find((area) => area.rotas.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`)))
        ?? { chave: "geral", rotulo: "Painel", sugestoes: ["Resume o ciclo actual.", "O que devo acompanhar hoje?"] };
}

function textoDoAssistente(mensagem) {
    if (typeof mensagem.texto === "string") return mensagem.texto;
    const resposta = mensagem.resposta;
    return [resposta?.mensagem, ...(resposta?.passos ?? [])].filter(Boolean).join("\n");
}

export default function AquaGuia() {
    const pagina = usePage();
    const { assistenteDisponivel = false } = pagina.props;
    const url = pagina.url;
    const caminho = (url ?? "").split("?")[0];
    const periodo = new URLSearchParams((url ?? "").split("?")[1] ?? "").get("mes") ?? "";
    const area = useMemo(() => contextoDaPagina(caminho), [caminho]);
    const reduzirMovimento = useReducedMotion();
    const [aberto, setAberto] = useState(false);
    const [pergunta, setPergunta] = useState("");
    const [aEnviar, setAEnviar] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagens, setMensagens] = useState([]);
    const listaRef = useRef(null);
    const campoRef = useRef(null);
    const accionadorRef = useRef(null);
    const contextoActualRef = useRef("");

    const fechar = () => {
        setAberto(false);
        requestAnimationFrame(() => accionadorRef.current?.focus());
    };

    useEffect(() => {
        contextoActualRef.current = `${area.chave}:${periodo}`;
        setMensagens([{
            id: "boas-vindas",
            papel: "assistant",
            texto: `Olá! Sou a Aqua. Posso ajudar com ${area.rotulo.toLocaleLowerCase()}. Uso indicadores desta área e não altero registos.`,
        }]);
        setPergunta("");
        setErro("");
    }, [area.chave, area.rotulo, periodo]);

    useEffect(() => {
        const lista = listaRef.current;
        if (lista) lista.scrollTo({ top: lista.scrollHeight, behavior: reduzirMovimento ? "auto" : "smooth" });
    }, [mensagens, aEnviar, aberto, reduzirMovimento]);

    useEffect(() => {
        if (aberto) requestAnimationFrame(() => campoRef.current?.focus());
    }, [aberto]);

    const enviar = async (texto = pergunta) => {
        const mensagem = texto.trim();
        if (!mensagem || aEnviar) return;
        const contextoDoPedido = `${area.chave}:${periodo}`;

        const historico = mensagens
            .filter((item) => item.papel === "user" || item.papel === "assistant")
            .slice(-8)
            .map((item) => ({ papel: item.papel === "user" ? "user" : "assistant", mensagem: textoDoAssistente(item).slice(0, 1200) }));
        const utilizador = { id: `${Date.now()}-user`, papel: "user", texto: mensagem };
        setMensagens((anteriores) => [...anteriores, utilizador]);
        setPergunta("");
        setErro("");
        setAEnviar(true);

        try {
            const resultado = await previewPost("/assistente/perguntar", { pagina: area.chave, periodo: periodo || null, mensagem, historico });
            if (contextoActualRef.current === contextoDoPedido) {
                setMensagens((anteriores) => [...anteriores, { id: `${Date.now()}-assistant`, papel: "assistant", resposta: resultado.resposta }]);
            }
        } catch (falha) {
            if (contextoActualRef.current === contextoDoPedido) setErro(falha.message || "Não foi possível obter uma resposta. Tenta novamente.");
        } finally {
            setAEnviar(false);
        }
    };

    if (!assistenteDisponivel) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[65] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
            <AnimatePresence>
                {aberto && (
                    <motion.aside
                        id="aqua-guia"
                        key="aqua-guia"
                        initial={reduzirMovimento ? false : { opacity: 0, transform: "translateY(8px) scale(0.985)" }}
                        animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
                        exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px) scale(0.99)" }}
                        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                        className="flex max-h-[min(78dvh,680px)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(4,26,83,0.2)] dark:border-slate-800 dark:bg-[#161A22] dark:shadow-[0_18px_55px_rgba(0,0,0,0.42)]"
                        aria-label={`Ajuda da Aqua para ${area.rotulo}`}
                        onKeyDown={(evento) => { if (evento.key === "Escape") fechar(); }}
                    >
                        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
                            <MascoteAqua pequeno />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-sm font-bold text-ink dark:text-[#F2F5FB]">
                                    Aqua <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Disponível</span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">Ajuda contextual · {area.rotulo}</p>
                            </div>
                            <button type="button" onClick={fechar} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#262C38]" aria-label="Fechar ajuda">
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#F7F9FD] px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#1E232D] dark:text-slate-300">
                            <Sparkles className="h-3.5 w-3.5 text-brand dark:text-cyan-300" aria-hidden="true" />
                            <span className="truncate">Contexto: {area.rotulo} · indicadores agregados</span>
                            <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-label="Contexto carregado" />
                        </div>

                        <div ref={listaRef} className="min-h-24 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-relevant="additions text">
                            {mensagens.map((item) => (
                                <div key={item.id} className={`flex gap-2.5 ${item.papel === "user" ? "justify-end" : "items-start"}`}>
                                    {item.papel === "assistant" && <MascoteAqua pequeno />}
                                    <div className={`max-w-[87%] rounded-[13px] px-3.5 py-2.5 text-[13px] leading-relaxed ${item.papel === "user" ? "rounded-tr-[4px] bg-brand text-white dark:bg-[#1B3A85]" : "rounded-tl-[4px] bg-slate-50 text-slate-700 dark:bg-[#1E232D] dark:text-slate-200"}`}>
                                        <p className="whitespace-pre-wrap">{item.texto ?? item.resposta?.mensagem}</p>
                                        {item.resposta?.passos?.length > 0 && (
                                            <ol className="mt-2.5 list-decimal space-y-1.5 border-t border-slate-200/80 pt-2.5 pl-4 dark:border-slate-700">
                                                {item.resposta.passos.map((passo, indice) => <li key={`${item.id}-passo-${indice}`}>{passo}</li>)}
                                            </ol>
                                        )}
                                        {item.resposta?.evidencias?.length > 0 && (
                                            <details className="mt-2.5 border-t border-slate-200/80 pt-2 dark:border-slate-700">
                                                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-brand dark:text-cyan-300">
                                                    Dados usados <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                                </summary>
                                                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                                                    {item.resposta.evidencias.map((evidencia, indice) => <li key={`${item.id}-evidencia-${indice}`}>{evidencia}</li>)}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {aEnviar && (
                                <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400" role="status">
                                    <MascoteAqua pequeno />
                                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-[#1E232D]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Aqua está a analisar o contexto…</span>
                                </div>
                            )}
                        </div>

                        {mensagens.length === 1 && !aEnviar && (
                            <div className="flex flex-wrap gap-2 px-4 pb-3">
                                {area.sugestoes.map((sugestao) => (
                                    <button key={sugestao} type="button" onClick={() => enviar(sugestao)} className="rounded-full border border-[#CBD8F3] bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#173B86] transition-colors hover:bg-[#F0F4FF] dark:border-slate-700 dark:bg-[#1E232D] dark:text-cyan-200 dark:hover:bg-[#262C38]">
                                        {sugestao}
                                    </button>
                                ))}
                            </div>
                        )}

                        {erro && <p role="alert" className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{erro}</p>}

                        <form onSubmit={(evento) => { evento.preventDefault(); enviar(); }} className="border-t border-slate-100 p-3 dark:border-slate-800">
                            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 dark:border-slate-700 dark:bg-[#1E232D] dark:focus-within:border-cyan-500">
                                <textarea
                                    ref={campoRef}
                                    value={pergunta}
                                    onChange={(evento) => setPergunta(evento.target.value)}
                                    onKeyDown={(evento) => { if (evento.key === "Enter" && !evento.shiftKey) { evento.preventDefault(); enviar(); } }}
                                    rows={1}
                                    maxLength={1200}
                                    placeholder={`Pergunta sobre ${area.rotulo.toLocaleLowerCase()}…`}
                                    aria-label={`Pergunta para Aqua sobre ${area.rotulo}`}
                                    aria-describedby="aqua-guia-composer-hint"
                                    className="max-h-28 min-h-10 flex-1 resize-y border-0 bg-transparent px-1.5 py-2 text-[13px] text-ink outline-none placeholder:text-slate-400 focus:!border-0 focus:!shadow-none focus:ring-0 dark:text-slate-100"
                                />
                                <button type="submit" disabled={!pergunta.trim() || aEnviar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400" aria-label="Enviar pergunta">
                                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                            <p id="aqua-guia-composer-hint" className="px-1 pt-2 text-[10px] leading-relaxed text-slate-400">Enter envia · Shift+Enter quebra a linha. Não inclua dados pessoais; Aqua usa indicadores agregados e não altera registos.</p>
                        </form>
                    </motion.aside>
                )}
            </AnimatePresence>

            <button
                ref={accionadorRef}
                type="button"
                onClick={() => setAberto((valor) => !valor)}
                className="group flex h-14 items-center gap-2.5 rounded-full bg-brand p-1.5 pr-4 text-white shadow-[0_8px_24px_rgba(4,26,83,0.25)] transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 dark:bg-[#0059FF] dark:hover:bg-[#0050E6]"
                aria-label={aberto ? "Fechar ajuda da Aqua" : "Abrir ajuda da Aqua"}
                aria-expanded={aberto}
                aria-controls="aqua-guia"
            >
                <MascoteAqua pequeno />
                <span className="text-sm font-bold">Aqua</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">{area.rotulo}</span>
            </button>
        </div>
    );
}
