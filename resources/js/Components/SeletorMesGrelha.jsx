import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const referenciaDe = (ano, mes) => `${ano}-${String(mes).padStart(2, "0")}`;
const partes = (referencia) => referencia.split("-").map(Number);

/** Mesmo botão quadrado das setas de SeletorMes. */
const botaoSeta =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

/**
 * Selector de mês controlado, em grelha (para formulários; o SeletorMes é o
 * do URL). Ano com setas, 12 meses em grelha, mês escolhido com o mesmo
 * indicador deslizante do PeriodoFiltro e setas do teclado para mudar.
 *
 * `bloqueados`: { "AAAA-MM": "motivo" } — meses que não se podem escolher
 * (o motivo aparece como dica), marcados com um ponto verde.
 */
export default function SeletorMesGrelha({ id, valor, onChange, mesActual, bloqueados = {}, rotuloBloqueado = "Indisponível", layoutId = "seletor-mes-grelha" }) {
    const [anoValor] = partes(valor || mesActual);
    const [ano, setAno] = useState(anoValor);
    const grelha = useRef(null);
    const [anoActual, mesDoActual] = partes(mesActual);

    // Escolher um mês noutro ano (pelo teclado ou "Mês actual") leva a grelha atrás.
    useEffect(() => setAno(anoValor), [anoValor]);

    const escolher = (referencia) => {
        if (bloqueados[referencia]) return;
        onChange(referencia);
    };

    const mover = (passo) => {
        let [a, m] = partes(valor || mesActual);
        for (let tentativa = 0; tentativa < 24; tentativa++) {
            m += passo;
            while (m > 12) { m -= 12; a += 1; }
            while (m < 1) { m += 12; a -= 1; }
            const referencia = referenciaDe(a, m);
            if (!bloqueados[referencia]) {
                onChange(referencia);
                requestAnimationFrame(() => grelha.current?.querySelector(`[data-ref="${referencia}"]`)?.focus());
                return;
            }
            passo = Math.sign(passo);
        }
    };

    const teclas = (evento) => {
        const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 };
        if (!(evento.key in passos)) return;
        evento.preventDefault();
        mover(passos[evento.key]);
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-2">
                <button type="button" className={botaoSeta} onClick={() => setAno((a) => a - 1)} title="Ano anterior" aria-label="Ano anterior">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="text-center">
                    <p className="text-base font-bold tabular-nums text-slate-950 dark:text-white" aria-live="polite">{ano}</p>
                    {valor !== mesActual && (
                        <button
                            type="button"
                            onClick={() => escolher(mesActual)}
                            disabled={Boolean(bloqueados[mesActual])}
                            className="text-xs font-semibold text-cyan-700 underline-offset-2 hover:underline disabled:hidden dark:text-cyan-300"
                        >
                            Ir para o mês actual
                        </button>
                    )}
                </div>
                <button type="button" className={botaoSeta} onClick={() => setAno((a) => a + 1)} title="Ano seguinte" aria-label="Ano seguinte">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>

            <div ref={grelha} id={id} role="radiogroup" aria-label={`Meses de ${ano}`} onKeyDown={teclas} className="mt-3 grid grid-cols-4 gap-1.5">
                {MESES.map((nome, indice) => {
                    const referencia = referenciaDe(ano, indice + 1);
                    const escolhido = referencia === valor;
                    const bloqueio = bloqueados[referencia];
                    const eActual = ano === anoActual && indice + 1 === mesDoActual;

                    return (
                        <button
                            key={referencia}
                            type="button"
                            role="radio"
                            data-ref={referencia}
                            aria-checked={escolhido}
                            tabIndex={escolhido || (!valor?.startsWith(`${ano}-`) && indice === 0) ? 0 : -1}
                            disabled={Boolean(bloqueio)}
                            title={bloqueio ? `${nome} ${ano} — ${bloqueio}` : `${nome} ${ano}`}
                            onClick={() => escolher(referencia)}
                            className={cn(
                                "relative h-11 rounded-md text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950",
                                escolhido
                                    ? "text-white dark:text-slate-950"
                                    : bloqueio
                                      ? "cursor-not-allowed bg-emerald-50 text-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-300/70"
                                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-cyan-50 hover:text-cyan-800 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-200",
                                eActual && !escolhido && "ring-2 ring-cyan-500/60 dark:ring-cyan-400/60",
                            )}
                        >
                            {escolhido && (
                                <motion.span
                                    layoutId={layoutId}
                                    className="absolute inset-0 rounded-md bg-cyan-700 shadow-sm dark:bg-cyan-500"
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            )}
                            <span className="relative">{nome.slice(0, 3)}</span>
                            {bloqueio && (
                                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>
                    Escolhido: <span className="font-semibold text-slate-900 dark:text-white">{valor ? `${MESES[partes(valor)[1] - 1]} ${partes(valor)[0]}` : "—"}</span>
                </span>
                <span className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-cyan-500/60" aria-hidden="true" /> Mês actual
                    </span>
                    {Object.keys(bloqueados).length > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> {rotuloBloqueado}
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
}
