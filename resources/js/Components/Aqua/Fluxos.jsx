import { CalendarDays, Check, ChevronRight, Mic, TriangleAlert } from "lucide-react";
import Mascote from "@/Components/Aqua/Mascote";
import { IlustracaoCarteira } from "@/Components/Aqua/Ilustracoes";
import { cor } from "@/Components/Aqua/Partes";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const METODOS = [
    ["dinheiro", "Numerário"],
    ["mpesa", "M-Pesa"],
    ["e-mola", "E-Mola"],
    ["banco", "Banco"],
];

const numero = (valor, casas = 0) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: casas, minimumFractionDigits: 0, useGrouping: "always" }).format(Number(valor) || 0);
const mt = (valor) => `${numero(valor)} MT`;
const m3 = (valor) => `${numero(valor, 1)} m³`;
const iniciais = (nome = "") =>
    nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();
const hora = (iso) => new Date(iso).toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" });

/** Converte "1 312,5" / "1312.5" em número; null quando não é um valor válido. */
export function lerNumero(texto) {
    const limpo = String(texto ?? "")
        .replace(/\s/g, "")
        .replace(/\.(?=\d{3}(?:,|$))/g, "")
        .replace(",", ".");
    if (!limpo) return null;
    const valor = Number(limpo);
    return Number.isFinite(valor) ? valor : null;
}

/** Canvas "3 · Leitura": "Encontrei o contador…" com o cartão do cliente e a leitura anterior. */
export function ContextoLeitura({ contexto }) {
    const { cliente, ultima } = contexto;
    const anterior = ultima?.valor ?? contexto.leitura_inicial ?? 0;
    return (
        <div className="flex flex-col gap-2">
            <p className={`text-[15px] leading-relaxed ${cor.texto}`}>
                {ultima ? (
                    <>
                        Encontrei o contador. A última leitura foi {ultima.data ? <>a <strong>{ultima.data}</strong></> : <>em <strong>{ultima.periodo}</strong></>}.
                    </>
                ) : (
                    <>Encontrei o cliente. Ainda não tem leituras; uso a leitura inicial do contador.</>
                )}
            </p>
            <div className={`flex items-center gap-3 rounded-[18px] border p-3 ${cor.borda} ${cor.superficie}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-extrabold ${cor.suave}`}>{iniciais(cliente.nome)}</span>
                <div className="min-w-0 flex-1">
                    <div className={`truncate text-[15px] font-bold ${cor.texto}`}>{cliente.nome}</div>
                    <div className={`truncate text-xs ${cor.texto3}`}>{[cliente.numero_cliente, cliente.zona].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="shrink-0 text-right">
                    <div className={`text-[11px] font-bold uppercase tracking-wide ${cor.texto3}`}>{ultima ? "Anterior" : "Inicial"}</div>
                    <div className={`text-base font-extrabold ${cor.texto}`}>{m3(anterior)}</div>
                </div>
            </div>
            {ultima?.do_periodo_actual && (
                <p className={`rounded-2xl p-3 text-sm ${cor.ambar}`}>Este cliente já tem leitura de {contexto.mes_actual}. Uma nova leitura vai substituir a sequência.</p>
            )}
            <p className={`text-[15px] leading-relaxed ${cor.texto}`}>Qual é o valor que o contador mostra agora?</p>
        </div>
    );
}

/** Canvas "3 · Leitura": o campo grande, o intervalo habitual e o consumo em tempo real. */
export function LeituraActual({ contexto, valor, onValor, onDitar, onOutroMes, desactivado }) {
    const anterior = contexto.ultima?.valor ?? contexto.leitura_inicial ?? 0;
    const media = contexto.media_m3;
    const lido = lerNumero(valor);
    const consumo = lido === null ? null : Math.round((lido - anterior) * 10) / 10;
    const escala = media ? media * 2.2 : Math.max(10, (consumo ?? 0) * 1.6);
    const posicao = consumo === null ? null : Math.min(1, Math.max(0, consumo / escala));

    let estado = { tom: cor.texto3, icone: null, texto: "Escreva o valor que aparece no contador." };
    if (consumo !== null && consumo < 0) estado = { tom: "text-[#B42318] dark:text-[#F4A39A]", icone: TriangleAlert, texto: `O valor é menor que a leitura anterior (${m3(anterior)}).` };
    else if (consumo !== null && !media) estado = { tom: cor.texto2, icone: Check, texto: `Consumo de ${m3(consumo)}.` };
    else if (consumo !== null && consumo >= media * 0.6 && consumo <= media * 1.4) estado = { tom: "text-[#1E7148] dark:text-[#7DD3A3]", icone: Check, texto: `Consumo de ${m3(consumo)} — dentro do habitual (média ${m3(media)}/mês)` };
    else if (consumo !== null) estado = { tom: "text-[#8A4F00] dark:text-[#F3C77A]", icone: TriangleAlert, texto: `Consumo de ${m3(consumo)} — ${consumo > media ? "acima" : "abaixo"} do habitual (média ${m3(media)}/mês)` };
    const Icone = estado.icone;

    return (
        <div className="flex flex-col gap-3">
            <section className={`flex flex-col gap-3 rounded-[22px] border-2 border-[#0059FF] p-4 ${cor.superficie}`}>
                <label htmlFor="aqua-leitura-actual" className={`text-[13px] font-bold ${cor.texto2}`}>
                    Leitura actual
                </label>
                <div className="flex items-baseline gap-2">
                    <input
                        id="aqua-leitura-actual"
                        value={valor}
                        onChange={(evento) => onValor(evento.target.value.replace(/[^\d.,\s]/g, ""))}
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={numero(anterior)}
                        disabled={desactivado}
                        className={`w-full min-w-0 border-0 !bg-transparent p-0 !shadow-none text-[40px] font-extrabold tracking-[0.02em] outline-none placeholder:text-[#C9D2E3] focus:!border-0 focus:!shadow-none focus:ring-0 dark:placeholder:text-[#363E51] ${cor.texto}`}
                    />
                    <span className={`text-lg font-bold ${cor.texto3}`}>m³</span>
                </div>
                {media ? (
                    <div className="relative h-2.5 rounded-full bg-[#EDF1F8] dark:bg-[#1E232D]" role="img" aria-label={`Intervalo habitual entre ${m3(media * 0.6)} e ${m3(media * 1.4)}`}>
                        <span className="absolute inset-y-0 rounded-full bg-[#D3EBDD] dark:bg-[#1E4D33]" style={{ left: `${((media * 0.6) / escala) * 100}%`, width: `${((media * 0.8) / escala) * 100}%` }} />
                        {posicao !== null && <span className="absolute -top-1 h-[18px] w-1 -translate-x-1/2 rounded-sm bg-[#2EA063]" style={{ left: `${posicao * 100}%` }} />}
                    </div>
                ) : null}
                <div className={`flex items-start gap-1.5 text-[13px] font-semibold ${estado.tom}`} aria-live="polite">
                    {Icone && <Icone className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.6} aria-hidden="true" />}
                    <span>{estado.texto}</span>
                </div>
            </section>
            <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={onOutroMes} disabled={desactivado} className={`flex h-[52px] items-center justify-center gap-2 rounded-2xl border text-sm font-bold disabled:opacity-50 ${cor.borda} ${cor.superficie} text-[#0A2A78] dark:text-[#9DBBFF]`}>
                    <CalendarDays className="h-5 w-5" aria-hidden="true" /> Outro mês
                </button>
                <button type="button" onClick={onDitar} disabled={desactivado} className={`flex h-[52px] items-center justify-center gap-2 rounded-2xl border text-sm font-bold disabled:opacity-50 ${cor.borda} ${cor.superficie} text-[#0A2A78] dark:text-[#9DBBFF]`}>
                    <Mic className="h-5 w-5" aria-hidden="true" /> Ditar valor
                </button>
            </div>
        </div>
    );
}

/** Rodapé com duas acções (canvas "3 · Leitura": Voltar · Rever e confirmar). */
export function BarraAccoes({ secundario, primario, empilhado = false }) {
    if (empilhado) {
        return (
            <div className={`flex shrink-0 flex-col gap-2 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${cor.borda} ${cor.superficie}`}>
                <button type="button" onClick={primario.onClick} disabled={primario.disabled} className={`flex h-14 items-center justify-center gap-2 rounded-[18px] text-base font-extrabold disabled:opacity-50 ${cor.primario}`}>
                    {primario.rotulo} <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                </button>
                <button type="button" onClick={secundario.onClick} className="h-11 rounded-[14px] text-sm font-bold text-[#363E51] hover:underline dark:text-[#C9D2E3]">
                    {secundario.rotulo}
                </button>
            </div>
        );
    }
    return (
        <div className={`flex shrink-0 gap-2.5 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${cor.borda} ${cor.superficie}`}>
            <button type="button" onClick={secundario.onClick} disabled={secundario.disabled} className="h-14 w-28 shrink-0 rounded-[18px] bg-[#F4F6FB] text-[15px] font-bold text-[#363E51] hover:bg-[#EDF1F8] disabled:opacity-50 dark:bg-[#1E232D] dark:text-[#C9D2E3] dark:hover:bg-[#262C38]">
                {secundario.rotulo}
            </button>
            <button type="button" onClick={primario.onClick} disabled={primario.disabled} className={`flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[18px] px-3 text-base font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${cor.primario}`}>
                <span className="truncate">{primario.rotulo}</span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0" strokeWidth={2.4} aria-hidden="true" />
            </button>
        </div>
    );
}

/**
 * Canvas "5 · Pagamento": quanto o valor cobre. Âmbar quando fica saldo em
 * aberto, com a barra pago/em aberto e a linha "Fica em aberto".
 */
export function CoberturaPagamento({ previa, facturas = [] }) {
    const pago = Number(previa.valor_pago) || 0;
    const resto = Math.max(0, Number(previa.saldo_depois) || 0);
    const emFalta = Number(previa.em_falta) || pago + resto;
    const mes = MESES[(previa.factura.mes ?? 1) - 1];
    const outras = Math.max(0, facturas.length - 1);
    return (
        <div className={`flex flex-col gap-2.5 rounded-[20px] border p-3.5 ${resto > 0 ? "border-[#F3D29E] dark:border-[#4F2D00]" : "border-[#B5DCC4] dark:border-[#1E4D33]"} ${cor.superficie}`}>
            <p className={`text-[15px] leading-relaxed ${cor.texto}`}>
                {resto > 0 ? (
                    <>
                        Este valor <strong>não cobre tudo</strong>. A factura de {mes} tem {mt(emFalta)} em falta.
                    </>
                ) : (
                    <>
                        Este valor <strong>liquida</strong> a factura de {mes}.
                    </>
                )}
            </p>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${mt(pago)} pagos${resto > 0 ? `, ${mt(resto)} ficam em aberto` : ""}`}>
                <span className="bg-[#2EA063]" style={{ flex: pago }} />
                {resto > 0 && <span className="bg-[#F3C77A]" style={{ flex: resto }} />}
            </div>
            <div className="flex flex-col gap-1.5 text-[13px]">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-[#2EA063]" />
                    <span className={`flex-1 ${cor.texto2}`}>
                        {previa.factura.numero} · {mes}
                    </span>
                    <strong className={cor.texto}>{mt(pago)}</strong>
                </div>
                {resto > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-[#F3C77A]" />
                        <span className="flex-1 font-semibold text-[#8A4F00] dark:text-[#F3C77A]">Fica em aberto · {mes}</span>
                        <strong className="text-[#8A4F00] dark:text-[#F3C77A]">{mt(resto)}</strong>
                    </div>
                )}
                {outras > 0 && <p className={`pt-0.5 ${cor.texto3}`}>{outras === 1 ? "O cliente tem mais 1 factura em aberto." : `O cliente tem mais ${outras} facturas em aberto.`}</p>}
            </div>
        </div>
    );
}

const VERDES = ["#2EA063", "#7DD3A3", "#1E7148", "#B5DCC4"];

/**
 * Canvas "5 · Pagamento": o valor repartido pelas facturas mais antigas.
 * "Este valor não cobre tudo", a barra por factura e "Fica em aberto".
 */
export function CoberturaDistribuicao({ distribuicao }) {
    const fica = Math.max(0, Number(distribuicao.fica_em_aberto) || 0);
    const liquidadas = distribuicao.parcelas.filter((parcela) => parcela.fica <= 0.005).length;
    const parcial = distribuicao.parcelas.find((parcela) => parcela.fica > 0.005);
    const proxima = parcial ?? distribuicao.restantes[0];
    return (
        <div className={`flex flex-col gap-2.5 rounded-[20px] border p-3.5 ${fica > 0 ? "border-[#F3D29E] dark:border-[#4F2D00]" : "border-[#B5DCC4] dark:border-[#1E4D33]"} ${cor.superficie}`}>
            <p className={`text-[15px] leading-relaxed ${cor.texto}`}>
                {fica > 0 ? (
                    <>
                        Este valor <strong>não cobre tudo</strong>. O saldo em aberto é de {mt(distribuicao.total_em_falta)}.
                    </>
                ) : (
                    <>
                        Este valor <strong>liquida {liquidadas === 1 ? "a factura" : `as ${liquidadas} facturas`}</strong> em aberto.
                    </>
                )}
            </p>
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${mt(distribuicao.valor)} aplicados${fica > 0 ? `, ${mt(fica)} ficam em aberto` : ""}`}>
                {distribuicao.parcelas.map((parcela, indice) => (
                    <span key={parcela.factura_id} style={{ flex: parcela.aplicado, background: VERDES[indice % VERDES.length] }} />
                ))}
                {fica > 0 && <span className="bg-[#F3C77A]" style={{ flex: fica }} />}
            </div>
            <div className="flex flex-col gap-1.5 text-[13px]">
                {distribuicao.parcelas.map((parcela, indice) => (
                    <div key={parcela.factura_id} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: VERDES[indice % VERDES.length] }} />
                        <span className={`min-w-0 flex-1 truncate ${cor.texto2}`}>
                            {parcela.numero} · {MESES[parcela.mes - 1]}
                        </span>
                        <strong className={`shrink-0 ${cor.texto}`}>{mt(parcela.aplicado)}</strong>
                    </div>
                ))}
                {fica > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-[#F3C77A]" />
                        <span className="min-w-0 flex-1 truncate font-semibold text-[#8A4F00] dark:text-[#F3C77A]">
                            Fica em aberto{proxima ? ` · ${MESES[proxima.mes - 1]}` : ""}
                            {distribuicao.restantes.length > (parcial ? 0 : 1) ? ` e mais ${distribuicao.restantes.length - (parcial ? 0 : 1)}` : ""}
                        </span>
                        <strong className="shrink-0 text-[#8A4F00] dark:text-[#F3C77A]">{mt(fica)}</strong>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Canvas "5 · Pagamento": folha "Confirma o pagamento?" com o método e Editar / Confirmar. */
export function FolhaPagamento({ tarefa, metodo, onMetodo, referencia, onReferencia, onEditar, onConfirmar, aEnviar, erro }) {
    const distribuicao = tarefa.distribuicao;
    const previa = tarefa.previa ?? { valor_pago: distribuicao.valor, saldo_depois: distribuicao.fica_em_aberto, factura: {} };
    const resto = Math.max(0, Number(previa.saldo_depois) || 0);
    const liquidadas = distribuicao ? distribuicao.parcelas.filter((parcela) => parcela.fica <= 0.005).length : resto > 0 ? 0 : 1;
    const liquida = liquidadas === 0 ? "Parte de 1 factura" : liquidadas === 1 ? "1 factura" : `${liquidadas} facturas`;
    return (
        <>
            <div className="absolute inset-0 z-10 bg-[rgba(3,9,35,0.38)] dark:bg-black/60" aria-hidden="true" />
            <section role="dialog" aria-label="Confirmar pagamento" className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3.5 rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-12px_40px_rgba(3,9,35,0.18)] dark:bg-[#161A22]">
                <span className="mx-auto h-[5px] w-10 rounded-full bg-[#C9D2E3] dark:bg-[#363E51]" aria-hidden="true" />
                <div className="flex items-center gap-3">
                    <IlustracaoCarteira className="h-11 w-11 shrink-0" />
                    <div>
                        <h2 className={`text-[19px] font-extrabold ${cor.texto}`}>Confirma o pagamento?</h2>
                        <p className={`text-[13px] ${cor.texto3}`}>Nada é gravado até tocar em confirmar.</p>
                    </div>
                </div>
                <div className={`flex flex-col gap-2 rounded-[18px] p-3.5 text-sm ${cor.campo}`}>
                    <div className="flex justify-between gap-3">
                        <span className={cor.texto2}>Cliente</span>
                        <strong className={`truncate ${cor.texto}`}>{tarefa.cliente?.nome}</strong>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                        <span className={cor.texto2}>Valor</span>
                        <strong className={`text-lg ${cor.texto}`}>{numero(previa.valor_pago, 2)} MT</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                        <span className={cor.texto2}>Liquida</span>
                        <strong className={cor.texto}>{liquida}</strong>
                    </div>
                </div>
                <fieldset className="flex flex-col gap-2">
                    <legend className={`mb-2 text-[13px] font-bold ${cor.texto2}`}>Método</legend>
                    <div className="grid grid-cols-4 gap-2">
                        {METODOS.map(([valor, rotulo]) => (
                            <button
                                key={valor}
                                type="button"
                                aria-pressed={metodo === valor}
                                onClick={() => onMetodo(valor)}
                                className={`h-11 rounded-[14px] text-[13px] ${metodo === valor ? "border-2 border-[#0059FF] bg-[#F0F4FF] font-extrabold text-[#0047CC] dark:bg-[#0E1C3F] dark:text-[#6EA2FF]" : `border font-semibold ${cor.borda} ${cor.superficie} text-[#363E51] dark:text-[#C9D2E3]`}`}
                            >
                                {rotulo}
                            </button>
                        ))}
                    </div>
                    {metodo !== "dinheiro" && (
                        <label className="mt-1 flex flex-col gap-1.5">
                            <span className={`text-[13px] font-bold ${cor.texto2}`}>Referência da transacção</span>
                            <input
                                value={referencia}
                                onChange={(evento) => onReferencia(evento.target.value)}
                                autoComplete="off"
                                className={`h-11 rounded-[14px] border px-3.5 text-[15px] outline-none focus:border-[#0059FF] focus:ring-0 ${cor.borda} ${cor.campo} ${cor.texto}`}
                            />
                        </label>
                    )}
                </fieldset>
                {erro && <p role="alert" className={`rounded-2xl px-3.5 py-2.5 text-sm ${cor.ambar}`}>{erro}</p>}
                <div className="flex gap-2.5">
                    <button type="button" onClick={onEditar} disabled={aEnviar} className="h-14 w-28 shrink-0 rounded-[18px] bg-[#F4F6FB] text-[15px] font-bold text-[#363E51] disabled:opacity-50 dark:bg-[#1E232D] dark:text-[#C9D2E3]">
                        Editar
                    </button>
                    <button type="button" onClick={onConfirmar} disabled={aEnviar} className={`h-14 min-w-0 flex-1 rounded-[18px] text-base font-extrabold disabled:opacity-50 ${cor.primario}`}>
                        {aEnviar ? "A registar…" : `Confirmar ${mt(previa.valor_pago)}`}
                    </button>
                </div>
            </section>
        </>
    );
}

function Confetes() {
    return (
        <svg viewBox="0 0 350 200" className="pointer-events-none absolute inset-x-0 top-0 h-[200px] w-full" aria-hidden="true">
            <path d="M40 40 C41 42 44 45 44 47 A4 4 0 0 1 36 47 C36 45 39 42 40 40 Z" fill="#6EA2FF" />
            <path d="M300 30 C301.5 33 306 37 306 40 A6 6 0 0 1 294 40 C294 37 298.5 33 300 30 Z" fill="#0059FF" />
            <path d="M70 120 C71 122 74 125 74 127 A4 4 0 0 1 66 127 C66 125 69 122 70 120 Z" fill="#7DD3A3" />
            <path d="M285 110 C286 112 289 115 289 117 A4 4 0 0 1 281 117 C281 115 284 112 285 110 Z" fill="#9DBBFF" />
            <circle cx="90" cy="60" r="3" fill="#F3C77A" />
            <circle cx="262" cy="74" r="4" fill="#F3C77A" />
            <circle cx="320" cy="150" r="3" fill="#7DD3A3" />
            <circle cx="28" cy="160" r="3" fill="#6EA2FF" />
        </svg>
    );
}

function Celebracao({ titulo, subtitulo, dados, rodape }) {
    return (
        <section className={`relative overflow-hidden rounded-[26px] border px-5 pb-5 pt-6 text-center ${cor.borda} ${cor.superficie}`}>
            <Confetes />
            <div className="relative flex justify-center">
                <Mascote humor="feliz" tamanho={148} />
            </div>
            <h1 className={`relative mt-2 text-[26px] font-extrabold tracking-[-0.01em] ${cor.texto}`}>{titulo}</h1>
            <p className={`relative mt-1.5 text-sm leading-relaxed ${cor.texto2}`}>{subtitulo}</p>
            <dl className={`relative mt-[18px] grid grid-cols-3 gap-2 rounded-[18px] p-3.5 text-left ${cor.campo}`}>
                {dados.map(([rotulo, valor]) => (
                    <div key={rotulo} className="min-w-0">
                        <dt className={`text-[11px] font-bold uppercase tracking-wide ${cor.texto3}`}>{rotulo}</dt>
                        <dd className={`mt-1 break-words text-[17px] font-extrabold leading-tight ${cor.texto}`}>{valor}</dd>
                    </div>
                ))}
            </dl>
            <div className={`relative mt-2.5 text-xs ${cor.texto3}`}>{rodape}</div>
        </section>
    );
}

/** Canvas "4 · Sucesso": leitura gravada, o que ficou registado e o progresso do ciclo. */
export function SucessoLeitura({ concluido, ciclo, irPara }) {
    const { leitura, factura, cliente } = concluido;
    const mes = MESES[(leitura.mes ?? 1) - 1];
    const lidas = ciclo?.lidas ?? 0;
    const total = ciclo?.clientes ?? 0;
    const segmentos = 20;
    const cheios = total ? Math.max(1, Math.round((lidas / total) * segmentos)) : 0;
    return (
        <div className="flex flex-col gap-3.5">
            <Celebracao
                titulo="Leitura gravada!"
                subtitulo={`A factura de ${mes}${cliente?.nome ? ` de ${cliente.nome}` : ""} já foi emitida com este valor.`}
                dados={[
                    ["Leitura", m3(leitura.leitura_actual)],
                    ["Consumo", m3(leitura.consumo_m3)],
                    ["Factura", mt(factura.total_pagar)],
                ]}
                rodape={
                    <>
                        Gravado às {hora(concluido.hora)} · {leitura.numero} ·{" "}
                        <button type="button" onClick={() => irPara(factura.url)} className="font-bold text-[#0047CC] underline dark:text-[#6EA2FF]">
                            Abrir factura
                        </button>
                    </>
                }
            />
            {total > 0 && (
                <section className={`flex flex-col gap-3 rounded-[20px] border p-4 ${cor.borda} ${cor.superficie}`}>
                    <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-extrabold ${cor.texto}`}>Leituras de {ciclo.mes}</span>
                        <span className={`text-[13px] font-bold ${cor.ligacao}`}>
                            {numero(lidas)} de {numero(total)}
                        </span>
                    </div>
                    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${segmentos}, minmax(0, 1fr))` }} aria-hidden="true">
                        {Array.from({ length: segmentos }, (_, indice) => (
                            <span key={indice} className={`h-2 rounded ${indice < cheios - 1 ? "bg-[#0059FF]" : indice === cheios - 1 ? "bg-[#2EA063]" : "bg-[#E1E7F3] dark:bg-[#262C38]"}`} />
                        ))}
                    </div>
                    <p className={`text-xs ${cor.texto3}`}>
                        Faltam {numero(Math.max(0, total - lidas))} · prazo das leituras {ciclo.leiturasAte}
                    </p>
                </section>
            )}
        </div>
    );
}

/** Pico-fim do pagamento: o recibo, o valor e o que fica em falta. */
export function SucessoPagamento({ concluido, irPara }) {
    const metodo = Object.fromEntries(METODOS)[concluido.metodo] ?? concluido.metodo;
    const multiplo = Boolean(concluido.multiplo);
    const emFalta = Number(concluido.fica ?? concluido.factura?.em_falta) || 0;
    const nome = concluido.cliente?.nome ? ` de ${concluido.cliente.nome}` : "";
    return (
        <Celebracao
            titulo="Pagamento registado!"
            subtitulo={
                multiplo
                    ? `${concluido.pagamentos.length} facturas${nome} foram pagas${emFalta > 0 ? `; ficam ${mt(emFalta)} em aberto.` : "."}`
                    : emFalta > 0
                      ? `O pagamento${nome} ficou registado; ficam ${mt(emFalta)} em aberto.`
                      : `A factura ${concluido.factura.numero_factura}${nome} ficou liquidada.`
            }
            dados={[
                multiplo ? ["Recibos", String(concluido.pagamentos.length)] : ["Recibo", concluido.pagamento.numero_recibo],
                ["Valor", mt(multiplo ? concluido.total : concluido.pagamento.valor_pago)],
                ["Em falta", mt(emFalta)],
            ]}
            rodape={
                <>
                    Registado às {hora(concluido.hora)} · {metodo} ·{" "}
                    <button type="button" onClick={() => irPara(concluido.recibo_url)} className="font-bold text-[#0047CC] underline dark:text-[#6EA2FF]">
                        Abrir recibo
                    </button>
                </>
            }
        />
    );
}
