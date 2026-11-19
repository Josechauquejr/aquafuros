import { useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import Mascote from "@/Components/Aqua/Mascote";
import { GotaPasso } from "@/Components/Aqua/Ilustracoes";

/* Tokens do chat (claro / escuro), iguais ao canvas "Aqua — Mascote e Chat". */
export const cor = {
    fundo: "bg-[#F4F6FB] dark:bg-[#0B0D12]",
    superficie: "bg-white dark:bg-[#161A22]",
    campo: "bg-[#F4F6FB] dark:bg-[#1E232D]",
    borda: "border-[#E1E7F3] dark:border-[#262C38]",
    divisor: "border-[#EDF1F8] dark:border-[#1E232D]",
    texto: "text-[#030923] dark:text-[#F4F6FB]",
    texto2: "text-[#464F66] dark:text-[#C9D2E3]",
    texto3: "text-[#5B6478] dark:text-[#8C97B0]",
    ligacao: "text-[#0047CC] dark:text-[#6EA2FF]",
    suave: "bg-[#F0F4FF] text-[#0A2A78] dark:bg-[#0E1C3F] dark:text-[#9DBBFF]",
    primario: "bg-[#041A53] text-white hover:bg-[#0A2A78] dark:bg-[#0059FF] dark:hover:bg-[#0050E6]",
    ambar: "bg-[#FCEFD9] text-[#8A4F00] dark:bg-[#2A2212] dark:text-[#F3C77A]",
    verde: "bg-[#E3F2E9] text-[#1E7148] dark:bg-[#11281D] dark:text-[#7DD3A3]",
    vermelho: "bg-[#FDF1F0] text-[#B42318] dark:bg-[#2D1714] dark:text-[#F4A39A]",
};

const foco = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0059FF]/25";

export function BotaoPrimario({ className = "", grande = false, children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-[14px] px-4 font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${grande ? "min-h-14 rounded-[18px] text-base" : "min-h-11 text-sm"} ${cor.primario} ${foco} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function BotaoSuave({ className = "", children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-bold transition hover:brightness-[0.97] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${cor.suave} ${foco} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export function BotaoNeutro({ className = "", children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#F4F6FB] px-4 text-sm font-bold text-[#363E51] transition hover:bg-[#EDF1F8] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1E232D] dark:text-[#C9D2E3] dark:hover:bg-[#262C38] ${foco} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

/** Linha de opção escolhível (cliente, factura, zona…): alvo de 48 px, ícone à esquerda. */
export function Opcao({ icone: Icone, titulo, detalhe, onClick, disabled, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition hover:border-[#9DBBFF] hover:bg-[#F0F4FF] disabled:opacity-50 dark:hover:border-[#1B2F66] dark:hover:bg-[#0E1C3F] ${cor.borda} ${cor.superficie} ${foco}`}
        >
            {Icone && (
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cor.suave}`}>
                    <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-bold ${cor.texto}`}>{titulo}</span>
                {detalhe && <span className={`block truncate text-xs ${cor.texto3}`}>{detalhe}</span>}
            </span>
            {children}
        </button>
    );
}

export function Cancelar({ onClick, disabled }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex min-h-10 items-center gap-1.5 self-start rounded-xl px-2 text-sm font-semibold hover:underline disabled:opacity-50 ${cor.texto3} ${foco}`}
        >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
        </button>
    );
}

export function Cartao({ tom = "normal", className = "", children }) {
    const borda = tom === "atencao" ? "border-[#F3D29E] dark:border-[#4F2D00]" : tom === "sucesso" ? "border-[#B5DCC4] dark:border-[#1E4D33]" : cor.borda;
    return <div className={`rounded-[22px] border p-4 ${borda} ${cor.superficie} ${className}`}>{children}</div>;
}

/** Par rótulo/valor alinhado (evidências, prévias). */
export function Linha({ rotulo, valor, destaque = false }) {
    return (
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={cor.texto2}>{rotulo}</span>
            <strong className={`text-right ${destaque ? "text-[#8A4F00] dark:text-[#F3C77A]" : cor.texto}`}>{valor}</strong>
        </div>
    );
}

/** Registo do que a Aqua consultou (ilusão de trabalho honesta: só o que foi feito). */
export function Rasto({ children }) {
    return (
        <div className={`flex items-center gap-1.5 pl-[42px] text-xs ${cor.texto3}`}>
            <Check className="h-3.5 w-3.5 text-[#2EA063]" strokeWidth={3} aria-hidden="true" />
            {children}
        </div>
    );
}

const PASSOS_PERGUNTA = [
    { ate: 900, humor: "pensar", texto: "A entender o pedido" },
    { ate: 2600, humor: "processar", texto: "A consultar os dados" },
    { ate: Infinity, humor: "processar", texto: "A preparar a resposta" },
];

/**
 * "A pensar" com passos: a mascote pensa, depois processa. Os passos são as
 * fases reais do pedido (interpretar → consultar → responder).
 */
export function APensar({ modo = "pergunta" }) {
    const [decorrido, setDecorrido] = useState(0);
    useEffect(() => {
        const inicio = Date.now();
        const temporizador = window.setInterval(() => setDecorrido(Date.now() - inicio), 300);
        return () => window.clearInterval(temporizador);
    }, []);

    if (modo !== "pergunta") {
        const texto = modo === "transcrever" ? "A transcrever o áudio…" : "A preparar…";
        return (
            <div role="status" className="flex items-center gap-2.5">
                <Mascote humor="processar" tamanho={32} />
                <span className={`rounded-2xl border border-dashed border-[#6EA2FF] px-3.5 py-2.5 text-sm font-semibold ${cor.superficie} ${cor.texto}`}>{texto}</span>
            </div>
        );
    }

    const actual = PASSOS_PERGUNTA.findIndex((passo) => decorrido < passo.ate);
    return (
        <div role="status" aria-label={PASSOS_PERGUNTA[actual].texto} className="flex items-start gap-2.5">
            <Mascote humor={PASSOS_PERGUNTA[actual].humor} tamanho={32} />
            <div className={`flex flex-1 flex-col gap-2 rounded-[18px] border border-dashed border-[#6EA2FF] px-3.5 py-3 text-[13px] ${cor.superficie}`}>
                {PASSOS_PERGUNTA.map((passo, indice) => (
                    <div key={passo.texto} className={`flex items-center gap-2 ${indice < actual ? cor.texto2 : indice === actual ? `font-bold ${cor.texto}` : cor.texto3}`}>
                        {indice < actual ? (
                            <Check className="h-3.5 w-3.5 text-[#2EA063]" strokeWidth={3} aria-hidden="true" />
                        ) : indice === actual ? (
                            <span className="aqua-girar h-3.5 w-3.5 rounded-full border-[2.5px] border-[#D6E2FF] border-t-[#0059FF] dark:border-[#1B2F66] dark:border-t-[#0059FF]" />
                        ) : (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#C9D2E3] dark:border-[#363E51]" />
                        )}
                        {indice === actual ? `${passo.texto}…` : passo.texto}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Erro honesto: diz o que falhou, que nada foi alterado, e oferece tentar de novo. */
export function CartaoErro({ mensagem, onTentar, podeTentar }) {
    return (
        <div role="alert" className={`flex flex-col items-center gap-1.5 rounded-3xl border px-5 pb-5 pt-5 text-center ${cor.borda} ${cor.superficie}`}>
            <Mascote humor="ops" tamanho={96} />
            <h3 className={`mt-1 text-lg font-extrabold ${cor.texto}`}>Não consegui responder agora</h3>
            <p className={`text-sm leading-relaxed ${cor.texto2}`}>{mensagem}</p>
            <p className={`text-xs ${cor.texto3}`}>Os seus dados estão seguros e nada foi alterado.</p>
            {podeTentar && (
                <BotaoSuave onClick={onTentar} className="mt-2 w-full min-h-12">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Tentar de novo
                </BotaoSuave>
            )}
        </div>
    );
}

const FLUXOS = {
    nova_leitura: {
        titulo: "Registar leitura",
        passos: [
            ["Cliente", ["cliente", "escolher_cliente"]],
            ["Leitura", ["contador", "periodo", "periodo_manual", "motivo"]],
            ["Confirmar", ["confirmar"]],
        ],
    },
    registar_pagamento: {
        titulo: "Registar pagamento",
        passos: [
            ["Cliente", ["cliente", "escolher_cliente"]],
            ["Valor", ["factura", "valor", "metodo", "referencia"]],
            ["Confirmar", ["confirmar"]],
        ],
    },
    nova_zona: { titulo: "Criar zona", passos: [["Nome", ["nome"]], ["Confirmar", ["confirmar"]]] },
    nova_ocorrencia: {
        titulo: "Registar ocorrência",
        passos: [
            ["Tipo", ["tipo"]],
            ["Descrição", ["descricao"]],
            ["Confirmar", ["confirmar"]],
        ],
    },
    registar_producao: {
        titulo: "Registar produção",
        passos: [
            ["Período", ["periodo", "periodo_manual"]],
            ["Zona", ["zona"]],
            ["Volume", ["volume"]],
            ["Confirmar", ["confirmar"]],
        ],
    },
};

export function infoFluxo(tarefa) {
    const fluxo = tarefa ? FLUXOS[tarefa.tipo] : null;
    if (!fluxo) return null;
    const actual = Math.max(0, fluxo.passos.findIndex(([, etapas]) => etapas.includes(tarefa.etapa)));
    return { ...fluxo, actual };
}

/** Progresso de uma tarefa guiada: a gota enche a cada passo (gradiente de objectivo). */
export function ProgressoTarefa({ tarefa }) {
    const fluxo = infoFluxo(tarefa);
    if (!fluxo) return null;
    return (
        <nav aria-label={`Progresso: passo ${fluxo.actual + 1} de ${fluxo.passos.length}`} className={`flex items-center gap-2 border-b px-4 pb-3 pt-1 ${cor.borda} ${cor.superficie}`}>
            {fluxo.passos.map(([rotulo], indice) => {
                const estado = indice < fluxo.actual ? "feita" : indice === fluxo.actual ? "actual" : "por_fazer";
                return (
                    <div key={rotulo} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
                        <span
                            className={`flex shrink-0 items-center gap-1.5 text-xs ${estado === "feita" ? "font-bold text-[#1E7148] dark:text-[#7DD3A3]" : estado === "actual" ? `font-extrabold ${cor.ligacao}` : `font-semibold ${cor.texto3}`}`}
                            aria-current={estado === "actual" ? "step" : undefined}
                        >
                            <GotaPasso estado={estado} />
                            {rotulo}
                        </span>
                        {indice < fluxo.passos.length - 1 && <span className={`h-0.5 min-w-3 flex-1 rounded ${indice < fluxo.actual ? "bg-[#2EA063]" : "bg-[#E1E7F3] dark:bg-[#262C38]"}`} />}
                    </div>
                );
            })}
        </nav>
    );
}

/** Pico-fim: celebração breve, resumo do que ficou gravado e próximo passo claro. */
export function CartaoSucesso({ titulo, subtitulo, dados = [], rodape, children }) {
    return (
        <div className={`relative overflow-hidden rounded-[26px] border px-5 pb-5 pt-4 text-center ${cor.borda} ${cor.superficie}`}>
            <svg viewBox="0 0 350 160" className="pointer-events-none absolute inset-x-0 top-0 h-40 w-full" aria-hidden="true">
                <path d="M40 30 C41 32 44 35 44 37 A4 4 0 0 1 36 37 C36 35 39 32 40 30 Z" fill="#6EA2FF" />
                <path d="M300 22 C301.5 25 306 29 306 32 A6 6 0 0 1 294 32 C294 29 298.5 25 300 22 Z" fill="#0059FF" />
                <path d="M70 110 C71 112 74 115 74 117 A4 4 0 0 1 66 117 C66 115 69 112 70 110 Z" fill="#7DD3A3" />
                <path d="M285 100 C286 102 289 105 289 107 A4 4 0 0 1 281 107 C281 105 284 102 285 100 Z" fill="#9DBBFF" />
                <circle cx="90" cy="50" r="3" fill="#F3C77A" />
                <circle cx="262" cy="64" r="4" fill="#F3C77A" />
            </svg>
            <div className="relative flex justify-center">
                <Mascote humor="feliz" tamanho={112} />
            </div>
            <h3 className={`relative mt-1 text-[22px] font-extrabold ${cor.texto}`}>{titulo}</h3>
            {subtitulo && <p className={`relative mt-1 text-sm leading-relaxed ${cor.texto2}`}>{subtitulo}</p>}
            {dados.length > 0 && (
                <dl className={`relative mt-4 grid gap-2 rounded-[18px] p-3.5 text-left ${cor.campo}`} style={{ gridTemplateColumns: `repeat(${Math.min(dados.length, 3)}, minmax(0, 1fr))` }}>
                    {dados.map(([rotulo, valor]) => (
                        <div key={rotulo} className="min-w-0">
                            <dt className={`text-[11px] font-bold uppercase tracking-wide ${cor.texto3}`}>{rotulo}</dt>
                            <dd className={`mt-1 break-words text-[15px] font-extrabold leading-tight ${cor.texto}`}>{valor}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {rodape && <p className={`relative mt-2.5 text-xs ${cor.texto3}`}>{rodape}</p>}
            {children && <div className="relative mt-4 flex flex-col gap-2">{children}</div>}
        </div>
    );
}
