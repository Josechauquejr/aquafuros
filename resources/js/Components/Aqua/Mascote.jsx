import { useId } from "react";

const AZUL = ["#0059FF", "#6EA2FF"];

/**
 * Expressões da Aqua. Cada uma é um estado do chat:
 * ola (conversa aberta) · pensar (a entender o pedido) · ideia (sugestão
 * proactiva) · processar (a consultar dados) · feliz (gravado com sucesso)
 * · atencao (risco real) · ouvir (ditado por voz) · ops (IA indisponível).
 */
const HUMORES = {
    ola: { d: [0, 0], boca: "M62 82 Q70 91 78 82", cheia: false, fechados: false, sobrancelhas: false, agua: AZUL, nivel: 0, extra: null },
    pensar: { d: [2, -3], boca: "M65 86 Q70 84 75 86", cheia: false, fechados: false, sobrancelhas: false, agua: AZUL, nivel: 0, extra: "bolhas" },
    ideia: { d: [1, -4], boca: "M61 81 Q70 93 79 81 Z", cheia: true, fechados: false, sobrancelhas: false, agua: AZUL, nivel: -4, extra: "lampada" },
    processar: { d: [0, 0], boca: "M65 86 L75 86", cheia: false, fechados: false, sobrancelhas: false, agua: AZUL, nivel: 0, extra: "orbita" },
    feliz: { d: [0, 0], boca: "M61 81 Q70 95 79 81 Z", cheia: true, fechados: true, sobrancelhas: false, agua: ["#2EA063", "#7DD3A3"], nivel: -6, extra: "brilhos" },
    atencao: { d: [0, 1], boca: "M62 86 Q66 83 70 86 T78 86", cheia: false, fechados: false, sobrancelhas: true, agua: ["#D98A00", "#F3C77A"], nivel: 0, extra: "alerta" },
    ouvir: { d: [0, 0], boca: "M66 85 A4 4.5 0 1 0 74 85 A4 4.5 0 1 0 66 85 Z", cheia: true, fechados: false, sobrancelhas: false, agua: AZUL, nivel: 0, extra: "ondas" },
    ops: { d: [-1, 2], boca: "M63 88 Q70 82 77 88", cheia: false, fechados: false, sobrancelhas: false, agua: ["#8C97B0", "#C9D2E3"], nivel: 10, extra: "suor" },
};

const GOTA = "M70 10 C82 28 114 58 114 90 A44 44 0 0 1 26 90 C26 58 58 28 70 10 Z";
const ONDA = (y, q) => `M-60 ${y} q10 ${q} 20 0${" t20 0".repeat(13)} V170 H-60 Z`;

/**
 * A gota que é a Aqua. A água no interior muda de cor com o estado e o nível
 * sobe enquanto processa. `sobreEscuro` dá-lhe o contorno azul para não se
 * perder em fundos azul-marinho; no modo escuro da app isso é automático.
 */
export default function Mascote({ humor = "ola", tamanho = 40, sobreEscuro = false, animado = true, className = "" }) {
    const h = HUMORES[humor] ?? HUMORES.ola;
    const idRecorte = `mq-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
    const pequeno = tamanho < 64;
    const extra = pequeno ? null : h.extra;
    const [dx, dy] = h.d;

    const corpo = sobreEscuro ? "fill-[#122E73]" : "fill-[#041A53] dark:fill-[#122E73]";
    const contorno = sobreEscuro ? "stroke-[#4F7FE6]" : "stroke-transparent dark:stroke-[#4F7FE6]";

    return (
        <span className={`mq h-${humor} ${animado ? "anim" : ""} inline-flex shrink-0 leading-none ${className}`} aria-hidden="true">
            <svg viewBox={pequeno ? "18 6 104 134" : "0 0 140 142"} width={tamanho} height={tamanho} style={{ overflow: "visible" }}>
                <defs>
                    <clipPath id={idRecorte}>
                        <path d={GOTA} />
                    </clipPath>
                </defs>
                {!pequeno && <ellipse cx="70" cy="139" rx="30" ry="3" className="fill-[#041A53] dark:fill-black" opacity="0.12" />}
                {extra === "orbita" && (
                    <g className="m-orbita" fill="#6EA2FF">
                        <circle cx="70" cy="22" r="4" />
                        <circle cx="123.7" cy="115" r="3" />
                        <circle cx="16.3" cy="115" r="2.4" />
                    </g>
                )}
                <g className="m-corpo">
                    <path d={GOTA} className={corpo} />
                    <g clipPath={`url(#${idRecorte})`}>
                        <g className="m-nivel">
                            <g transform={`translate(0 ${h.nivel})`}>
                                <path className="m-agua2" d={ONDA(95, 5)} fill={h.agua[1]} opacity="0.65" />
                                <path className="m-agua1" d={ONDA(98, -5)} fill={h.agua[0]} />
                            </g>
                        </g>
                    </g>
                    <path d={GOTA} fill="none" strokeWidth="2.4" className={contorno} />
                    <path d="M43 64 C45 52 52 42 58 35" fill="none" stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />
                    {h.fechados ? (
                        <g fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round">
                            <path d="M50 72 Q57 63 64 72" />
                            <path d="M76 72 Q83 63 90 72" />
                        </g>
                    ) : (
                        <g className="m-olhos">
                            <ellipse cx="57" cy="70" rx="7" ry="9" fill="#FFFFFF" />
                            <ellipse cx="83" cy="70" rx="7" ry="9" fill="#FFFFFF" />
                            <g className="m-pupilas">
                                <circle cx={58 + dx} cy={72 + dy} r="4" fill="#030923" />
                                <circle cx={84 + dx} cy={72 + dy} r="4" fill="#030923" />
                                <circle cx={59.5 + dx} cy={69.5 + dy} r="1.4" fill="#FFFFFF" />
                                <circle cx={85.5 + dx} cy={69.5 + dy} r="1.4" fill="#FFFFFF" />
                            </g>
                        </g>
                    )}
                    {h.sobrancelhas && (
                        <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
                            <path d="M49 56 L62 60" />
                            <path d="M91 56 L78 60" />
                        </g>
                    )}
                    <ellipse cx="47" cy="83" rx="4.5" ry="2.8" fill="#6EA2FF" opacity="0.6" />
                    <ellipse cx="93" cy="83" rx="4.5" ry="2.8" fill="#6EA2FF" opacity="0.6" />
                    <path d={h.boca} fill={h.cheia ? "#FFFFFF" : "none"} stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                {extra === "bolhas" && (
                    <g fill="#9DBBFF">
                        <circle className="m-bolha" cx="116" cy="40" r="4" />
                        <circle className="m-bolha b2" cx="125" cy="26" r="6" />
                        <circle className="m-bolha b3" cx="132" cy="10" r="3" />
                    </g>
                )}
                {extra === "lampada" && (
                    <g className="m-lampada">
                        <g className="m-raios" stroke="#F3C77A" strokeWidth="2.6" strokeLinecap="round">
                            <path d="M122 2 L122 -4" />
                            <path d="M106 10 L101 6" />
                            <path d="M138 10 L143 6" />
                            <path d="M103 24 L97 24" />
                            <path d="M141 24 L147 24" />
                        </g>
                        <circle cx="122" cy="22" r="11" fill="#FCEFD9" stroke="#D98A00" strokeWidth="2.4" />
                        <path d="M118 22 Q122 17 126 22" fill="none" stroke="#D98A00" strokeWidth="2" strokeLinecap="round" />
                        <rect x="117" y="32" width="10" height="7" rx="2" fill="#8C97B0" />
                    </g>
                )}
                {extra === "brilhos" && (
                    <g fill="#F3C77A">
                        <path className="m-brilho" d="M120 10 L122.6 18.4 L131 21 L122.6 23.6 L120 32 L117.4 23.6 L109 21 L117.4 18.4 Z" />
                        <path className="m-brilho b2" d="M20 30 L21.6 36.4 L28 38 L21.6 39.6 L20 46 L18.4 39.6 L12 38 L18.4 36.4 Z" />
                    </g>
                )}
                {extra === "alerta" && (
                    <g className="m-badge">
                        <circle cx="120" cy="30" r="12" fill="#D98A00" stroke="#FFFFFF" strokeWidth="3" />
                        <path d="M120 23 L120 31" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" />
                        <circle cx="120" cy="36.5" r="2" fill="#FFFFFF" />
                    </g>
                )}
                {extra === "ondas" && (
                    <g fill="none" stroke="#6EA2FF" strokeWidth="3" strokeLinecap="round">
                        <path className="m-onda" d="M122 60 Q128 72 122 84" />
                        <path className="m-onda o2" d="M130 52 Q140 72 130 92" />
                        <path className="m-onda" d="M18 60 Q12 72 18 84" />
                        <path className="m-onda o2" d="M10 52 Q0 72 10 92" />
                    </g>
                )}
                {extra === "suor" && <path className="m-suor" d="M118 34 C118 34 124 42 124 46 A6 6 0 0 1 112 46 C112 42 118 34 118 34 Z" fill="#9DBBFF" />}
            </svg>
        </span>
    );
}
