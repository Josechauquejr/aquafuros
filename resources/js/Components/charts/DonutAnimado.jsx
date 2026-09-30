import { Link } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { AnimatedCard, CardBody, CardDescription, CardTitle, CardVisual } from "@/Components/ui/animated-card";
import { cn } from "@/lib/utils";

const RAIO = 40;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
// Onde cada etiqueta "voa" ao passar o rato (como no Animated Card 2 do badtzUI).
const POSICOES = [
    [105, 55],
    [105, -55],
    [125, 0],
    [-125, 0],
    [-105, 55],
    [-105, -55],
];

/**
 * Donut do "Animated Card 2" (badtzUI) alimentado com dados reais: os
 * segmentos crescem ao entrar, o donut sobe e as etiquetas com nome e % abrem
 * à volta ao passar o rato no cartão; passar o rato numa linha da legenda
 * destaca o segmento e mostra a sua parte no centro.
 *
 * - dados: [{ chave, label, valor, cor, href? }]
 * - formatar(valor): como mostrar valores (ex.: dinheiro)
 * - largo: em ecrãs grandes põe o donut à esquerda e a legenda à direita
 */
export default function DonutAnimado({
    titulo,
    descricao,
    icone: Icone,
    dados,
    formatar = (v) => String(v),
    rotuloTotal = "Total",
    largo = false,
    vazio = "Sem dados para mostrar.",
    className,
}) {
    const [pronto, setPronto] = useState(false);
    const [activo, setActivo] = useState(null);

    useEffect(() => {
        const temporizador = setTimeout(() => setPronto(true), 120);
        return () => clearTimeout(temporizador);
    }, []);

    const validos = dados.filter((d) => Number(d.valor) > 0);
    const total = validos.reduce((soma, d) => soma + Number(d.valor), 0);

    let acumulado = 0;
    const segmentos = validos.map((d) => {
        const fracao = Number(d.valor) / total;
        const segmento = { ...d, fracao, inicio: acumulado };
        acumulado += fracao;
        return segmento;
    });
    const seleccionado = segmentos.find((s) => s.chave === activo);

    const visual = (
        <CardVisual className={cn("relative h-[230px] w-full", largo && "md:h-auto md:min-h-[230px]")}>
            {/* grelha suave e brilho, como no cartão original */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgba(6,182,212,0.14),transparent)]"
            />

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-[150px] w-[150px] transition-transform duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:-translate-y-2 group-hover/animated-card:scale-105">
                    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={`${titulo}: ${segmentos.map((s) => `${s.label} ${Math.round(s.fracao * 100)}%`).join(", ")}`}>
                        <circle cx="50" cy="50" r={RAIO} fill="transparent" stroke="currentColor" strokeWidth="10" opacity={0.15} className="text-zinc-500" />
                        {segmentos.map((s) => {
                            const folga = segmentos.length > 1 ? 1.2 : 0;
                            const comprimento = Math.max(0, s.fracao * CIRCUNFERENCIA - folga);

                            return (
                                <circle
                                    key={s.chave}
                                    cx="50"
                                    cy="50"
                                    r={RAIO}
                                    fill="transparent"
                                    stroke={s.cor}
                                    strokeWidth={activo === s.chave ? 17 : 13}
                                    strokeDasharray={`${pronto ? comprimento : 0} ${CIRCUNFERENCIA}`}
                                    strokeDashoffset={-s.inicio * CIRCUNFERENCIA}
                                    transform="rotate(-90 50 50)"
                                    opacity={activo && activo !== s.chave ? 0.35 : 1}
                                    style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.6, 0.6, 0, 1), stroke-width 0.2s, opacity 0.2s" }}
                                    onMouseEnter={() => setActivo(s.chave)}
                                    onMouseLeave={() => setActivo(null)}
                                />
                            );
                        })}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="px-6 text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
                            {seleccionado ? seleccionado.label : rotuloTotal}
                        </span>
                        <span className="px-4 text-sm font-bold leading-tight text-black dark:text-white">
                            {seleccionado ? `${Math.round(seleccionado.fracao * 100)}%` : formatar(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* etiquetas que abrem à volta do donut ao passar o rato */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {segmentos.slice(0, POSICOES.length).map((s, i) => (
                    <div
                        key={s.chave}
                        style={{ "--x": `${POSICOES[i][0]}px`, "--y": `${POSICOES[i][1] - 8}px` }}
                        className="absolute flex max-w-[130px] items-center gap-1 rounded-full border border-zinc-200 bg-white/80 px-1.5 py-0.5 opacity-0 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.6,0.6,0,1)] group-hover/animated-card:opacity-100 group-hover/animated-card:[transform:translate(var(--x),var(--y))] dark:border-zinc-800 dark:bg-black/70"
                    >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
                        <span className="truncate text-[10px] text-black dark:text-white">
                            {s.label} · {Math.round(s.fracao * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </CardVisual>
    );

    const legenda = (
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-900">
            {segmentos.map((s) => {
                const conteudo = (
                    <>
                        <span className="flex min-w-0 items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
                            <span className="truncate text-sm font-medium text-black dark:text-white">{s.label}</span>
                        </span>
                        <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold text-black dark:text-white">{formatar(s.valor)}</span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{Math.round(s.fracao * 100)}%</span>
                        </span>
                    </>
                );
                const classes = "flex items-center justify-between gap-3 px-1 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-950";

                return (
                    <li key={s.chave} onMouseEnter={() => setActivo(s.chave)} onMouseLeave={() => setActivo(null)}>
                        {s.href ? (
                            <Link href={s.href} className={classes}>
                                {conteudo}
                            </Link>
                        ) : (
                            <div className={classes}>{conteudo}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    return (
        <AnimatedCard className={cn("h-full w-full", largo && "md:grid md:grid-cols-[22rem_1fr]", className)}>
            {segmentos.length === 0 ? (
                <div className="p-6">
                    <CardTitle className="flex items-center gap-2">
                        {Icone && <Icone className="h-5 w-5" aria-hidden="true" />}
                        {titulo}
                    </CardTitle>
                    {descricao && <CardDescription className="mt-1">{descricao}</CardDescription>}
                    <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{vazio}</p>
                </div>
            ) : (
                <>
                    {visual}
                    <CardBody className={cn(largo && "md:border-l md:border-t-0")}>
                        <CardTitle className="flex items-center gap-2">
                            {Icone && <Icone className="h-5 w-5" aria-hidden="true" />}
                            {titulo}
                        </CardTitle>
                        {descricao && <CardDescription>{descricao}</CardDescription>}
                        {legenda}
                    </CardBody>
                </>
            )}
        </AnimatedCard>
    );
}
