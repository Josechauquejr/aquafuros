import { cn } from "@/lib/utils";

/**
 * Ilustrações do Aquafuros (traço, 160×120): cada uma mostra o objecto da
 * página (contador, factura, recibo…) com a gota de água como assinatura.
 * As cores vêm das variáveis --ilu-* (app.css), por isso o tema escuro troca
 * sozinho. Decorativas: aria-hidden.
 */
const DESENHOS = {
    contador: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M18 64h30M112 64h30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M18 56v16M142 56v16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="80" cy="64" r="28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <path d="M62 64h5M93 64h5M80 46v5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M80 64l13-11" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <circle cx="80" cy="64" r="3.5" style={{ fill: "var(--ilu-ink)" }} />
                <path d="M72 78h16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M116 12s7 8 7 12.5a7 7 0 0 1-14 0c0-4.5 7-12.5 7-12.5z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    factura: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M54 14h38l16 16v70a4 4 0 0 1-4 4H54a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" strokeWidth="3" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <path d="M92 14v16h16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M60 44h32M60 56h22M60 68h28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M60 88h20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <path d="M116 74s8 9 8 14a8 8 0 0 1-16 0c0-5 8-14 8-14z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-accent)" }} />
        </>
    ),
    recibo: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M50 12h52v84l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5L50 96z" strokeWidth="3" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <path d="M60 28h32M60 40h20M60 62h32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="114" cy="82" r="16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-accent)" }} />
                <path d="M114 75v14M109 79h7a3 3 0 0 1 0 6h-6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    grafico: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M36 98h92" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="44" y="64" width="16" height="34" rx="4" strokeWidth="3" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <rect x="70" y="48" width="16" height="50" rx="4" strokeWidth="3" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <rect x="96" y="30" width="16" height="68" rx="4" strokeWidth="3" style={{ fill: "var(--ilu-accent)", stroke: "var(--ilu-ink)" }} />
                <path d="M40 56l26-14 22 6 30-22" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <path d="M112 26h7v7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    furo: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} />
                <path d="M62 62 55 104M98 62l7 42M59 84h42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M74 16h12v10H74z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="50" y="26" width="60" height="36" rx="9" strokeWidth="3" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-ink)" }} />
                <path d="M56 44c8-4 16-4 24 0s16 4 24 0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <circle cx="120" cy="30" r="12" stroke="#1E7148" strokeWidth="3" style={{ fill: "var(--ilu-paper)" }} />
                <path d="M115 30l3.5 3.5 6.5-6.5" stroke="#1E7148" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),
    erro: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} />
                <rect x="16" y="48" width="48" height="20" rx="4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <rect x="96" y="56" width="48" height="20" rx="4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M64 52l6 4-4 4 6 4M96 60l-6 4 4 4-6 4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M80 80s5 6 5 9.5a5 5 0 0 1-10 0c0-3.5 5-9.5 5-9.5z" style={{ fill: "var(--ilu-accent)" }} />
                <circle cx="80" cy="102" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <circle cx="116" cy="26" r="13" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-risk)" }} />
                <path d="M116 19v8M116 32v.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
        </>
    ),
    semligacao: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M40 52a58 58 0 0 1 80 0M52 66a40 40 0 0 1 56 0M64 80a22 22 0 0 1 32 0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="80" cy="94" r="5" style={{ fill: "var(--ilu-ink)" }} />
                <path d="M44 26l72 76" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
        </>
    ),
    pagamento: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <rect x="54" y="12" width="46" height="88" rx="9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M70 20h14M72 90h10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="77" cy="54" r="15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-ok-tint)", stroke: "var(--ilu-ok)" }} />
                <path d="M70 54l5 5 9-10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ok)" }} />
                <circle cx="116" cy="84" r="15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-accent)" }} />
                <path d="M116 78v12M111 81h6a3 3 0 0 1 0 6h-5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    formulario: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <rect x="40" y="12" width="74" height="92" rx="8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M50 28h28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="50" y="38" width="54" height="12" rx="4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M50 60h22" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="50" y="70" width="54" height="12" rx="4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-risk-tint)", stroke: "var(--ilu-risk)" }} />
                <path d="M56 92h26" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <circle cx="124" cy="76" r="12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-paper)", stroke: "var(--ilu-risk)" }} />
                <path d="M124 70v7M124 82v.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
        </>
    ),
    bloqueado: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M60 52V40a20 20 0 0 1 40 0v12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="48" y="52" width="64" height="48" rx="10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M80 64s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z" style={{ fill: "var(--ilu-accent)" }} />
                <path d="M80 80v8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    pesquisa: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <circle cx="72" cy="52" r="28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M92 72l24 24" strokeWidth="7" strokeLinecap="round" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M64 44a9 9 0 1 1 11 9v5M75 66v.5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    sucesso: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <circle cx="80" cy="58" r="30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-ok-tint)", stroke: "var(--ilu-ok)" }} />
                <path d="M66 58l10 10 19-20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ok)" }} />
                <path d="M124 14s7 8 7 12.5a7 7 0 0 1-14 0c0-4.5 7-12.5 7-12.5z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
        </>
    ),
    torneira: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} />
                <path d="M20 70h44v-14h24v14h52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M20 84h120" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <rect x="62" y="30" width="28" height="12" rx="4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M76 42v14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="116" cy="34" r="13" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-warn-tint)", stroke: "var(--ilu-warn)" }} />
                <path d="M112 29v10M120 29v10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-warn)" }} />
                <path d="M100 96s4 5 4 8a4 4 0 0 1-8 0c0-3 4-8 4-8z" style={{ fill: "var(--ilu-tint2)" }} />
        </>
    ),
    lixeira: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} />
                <path d="M50 38h60M68 38v-8h24v8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M56 38l5 62h38l5-62" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M72 52v34M88 52v34" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <circle cx="118" cy="28" r="13" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-risk-tint)", stroke: "var(--ilu-risk)" }} />
                <path d="M113 23l10 10M123 23l-10 10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
        </>
    ),
    anular: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} />
                <path d="M50 14h38l16 16v70a4 4 0 0 1-4 4H50a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M88 14v16h16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M56 44h28M56 56h20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M48 96 106 30" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
                <circle cx="118" cy="84" r="14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-risk-tint)", stroke: "var(--ilu-risk)" }} />
                <path d="M113 79l10 10M123 79l-10 10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-risk)" }} />
        </>
    ),
    confirmar: (
        <>
                <circle cx="80" cy="58" r="50" style={{ fill: "var(--ilu-tint)" }} /><path d="M26 22v8M22 26h8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} /><circle cx="138" cy="96" r="3" style={{ fill: "var(--ilu-accent)" }} />
                <circle cx="74" cy="62" r="28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--ilu-ink)", fill: "var(--ilu-paper)" }} />
                <path d="M58 62h4M86 62h4M74 44v4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ink)" }} />
                <path d="M74 62l12-10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-accent)" }} />
                <circle cx="74" cy="62" r="3.5" style={{ fill: "var(--ilu-ink)" }} />
                <circle cx="116" cy="82" r="15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ fill: "var(--ilu-ok-tint)", stroke: "var(--ilu-ok)" }} />
                <path d="M109 82l5 5 9-10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ stroke: "var(--ilu-ok)" }} />
        </>
    ),
};

export const NOMES_ILUSTRACAO = Object.keys(DESENHOS);

export default function Ilustracao({ nome = "contador", largura = 160, className = "" }) {
    return (
        <svg
            viewBox="0 0 160 120"
            width={largura}
            height={Math.round(largura * 0.75)}
            aria-hidden="true"
            className={cn("shrink-0", className)}
        >
            {DESENHOS[nome] ?? DESENHOS.contador}
        </svg>
    );
}
