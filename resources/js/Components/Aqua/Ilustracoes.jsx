/**
 * Ilustrações pequenas do chat, no mesmo traço da mascote: fundo suave,
 * contorno azul-marinho e um acento azul. Todas decorativas (aria-hidden).
 */

const caixa = "fill-[#E6EEFF] dark:fill-[#0E1C3F]";

export function IlustracaoGrafico({ className = "h-9 w-9" }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="11" className={caixa} />
            <rect x="9" y="18" width="4" height="9" rx="1.5" fill="#9DBBFF" />
            <rect x="16" y="13" width="4" height="14" rx="1.5" fill="#6EA2FF" />
            <rect x="23" y="9" width="4" height="18" rx="1.5" fill="#0059FF" />
        </svg>
    );
}

export function IlustracaoCarteira({ className = "h-9 w-9" }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="11" className="fill-[#E3F2E9] dark:fill-[#11281D]" />
            <rect x="8" y="11" width="20" height="15" rx="3" strokeWidth="2" className="fill-white stroke-[#1E7148] dark:fill-[#161A22] dark:stroke-[#7DD3A3]" />
            <rect x="20" y="16" width="8" height="5" rx="2" fill="#2EA063" />
        </svg>
    );
}

export function IlustracaoFuga({ className = "h-9 w-9" }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="11" className="fill-[#FCEFD9] dark:fill-[#2A2212]" />
            <rect x="6" y="12" width="24" height="7" rx="2.5" strokeWidth="2" className="fill-white stroke-[#8A4F00] dark:fill-[#161A22] dark:stroke-[#F3C77A]" />
            <path d="M18 21 C18 21 21 25 21 27 A3 3 0 0 1 15 27 C15 25 18 21 18 21 Z" fill="#0059FF" />
        </svg>
    );
}

export function IlustracaoFactura({ className = "h-9 w-9" }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="11" className={caixa} />
            <path d="M11 8h10l5 5v15H11z" strokeWidth="2" strokeLinejoin="round" className="fill-white stroke-[#0A2A78] dark:fill-[#161A22] dark:stroke-[#9DBBFF]" />
            <path d="M20 18 C20 18 23 22 23 24 A3 3 0 0 1 17 24 C17 22 20 18 20 18 Z" fill="#0059FF" />
        </svg>
    );
}

export function IlustracaoContador({ className = "h-12 w-12" }) {
    return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
            <rect x="2" y="21" width="8" height="8" rx="2" fill="#9DBBFF" />
            <rect x="38" y="21" width="8" height="8" rx="2" fill="#9DBBFF" />
            <circle cx="24" cy="25" r="15" strokeWidth="2.5" className="fill-[#E6EEFF] stroke-[#0A2A78] dark:fill-[#0E1C3F] dark:stroke-[#9DBBFF]" />
            <rect x="16" y="17" width="16" height="6" rx="1.5" className="fill-[#0A2A78] dark:fill-[#9DBBFF]" />
            <path d="M24 31 L30 27" stroke="#0059FF" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="24" cy="31" r="2" fill="#0059FF" />
        </svg>
    );
}

export function IlustracaoOcorrencia({ className = "h-9 w-9" }) {
    return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
            <rect width="36" height="36" rx="11" className="fill-[#FDF1F0] dark:fill-[#2D1714]" />
            <path d="M18 9 L28 26 H8 Z" strokeWidth="2" strokeLinejoin="round" className="fill-white stroke-[#B42318] dark:fill-[#161A22] dark:stroke-[#F4A39A]" />
            <path d="M18 15v5M18 23v.5" strokeWidth="2.2" strokeLinecap="round" className="stroke-[#B42318] dark:stroke-[#F4A39A]" />
        </svg>
    );
}

/** Uma gota do indicador de progresso: feita (verde), actual (meio cheia) ou por fazer. */
export function GotaPasso({ estado = "por_fazer", className = "h-5 w-[18px]" }) {
    const forma = "M9 1 C11 4 17 9 17 13 A8 8 0 0 1 1 13 C1 9 7 4 9 1 Z";
    if (estado === "feita") {
        return (
            <svg viewBox="0 0 18 20" className={className} aria-hidden="true">
                <path d={forma} fill="#2EA063" />
                <path d="M5.5 12.5 L8 15 L12.5 10.5" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (estado === "actual") {
        return (
            <svg viewBox="0 0 18 20" className={className} aria-hidden="true">
                <path d={forma} className="fill-[#0A2A78] dark:fill-[#9DBBFF]" />
                <path d="M1.2 11.5 Q5 9.5 9 11.5 T16.8 11.5 L17 13 A8 8 0 0 1 1 13 Z" fill="#0059FF" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 18 20" className={className} aria-hidden="true">
            <path d={forma} fill="none" strokeWidth="2" className="stroke-[#C9D2E3] dark:stroke-[#363E51]" />
        </svg>
    );
}

/** Ondas decorativas para fundos azul-marinho (cartão de boas-vindas, ecrã de voz). */
export function Ondas({ className = "" }) {
    return (
        <svg viewBox="0 0 360 60" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 bottom-0 h-[60px] w-full ${className}`} aria-hidden="true">
            <path d="M0 30 Q45 14 90 30 T180 30 T270 30 T360 30 V60 H0 Z" className="fill-[#0A2A78]" />
            <path d="M0 44 Q45 32 90 44 T180 44 T270 44 T360 44 V60 H0 Z" fill="#0059FF" opacity="0.5" />
        </svg>
    );
}
