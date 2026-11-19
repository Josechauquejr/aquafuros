/**
 * Sons da Aqua, sintetizados com Web Audio (sem ficheiros):
 * - gota de água: quando a Aqua tem uma sugestão nova ou responde com o painel fechado;
 * - início da conversa por voz: dois toques a subir; fim: dois toques a descer.
 * A pessoa pode desligar os sons no menu da Aqua (fica guardado neste browser).
 */
const CHAVE = "aqua-sons";
let contexto = null;

export function sonsLigados() {
    try {
        return window.localStorage.getItem(CHAVE) !== "0";
    } catch {
        return true;
    }
}

export function definirSons(ligados) {
    try {
        window.localStorage.setItem(CHAVE, ligados ? "1" : "0");
    } catch {
        /* armazenamento opcional */
    }
}

function obterContexto() {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contexto ??= new Contexto();
    if (contexto.state === "suspended") contexto.resume().catch(() => {});
    return contexto;
}

function tom(audio, { de, para, inicio, duracao, volume, forma = "sine" }) {
    const oscilador = audio.createOscillator();
    const ganho = audio.createGain();
    oscilador.type = forma;
    oscilador.frequency.setValueAtTime(de, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(para, inicio + duracao);
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    oscilador.connect(ganho).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracao + 0.03);
}

function tocar(desenhar) {
    if (!sonsLigados()) return;
    try {
        const audio = obterContexto();
        if (audio) desenhar(audio, audio.currentTime + 0.01);
    } catch {
        /* sem som não é erro */
    }
}

/** "Plic": a gota cai (tom a descer) e salpica (tom curto a subir). */
export const somGota = () =>
    tocar((audio, t) => {
        tom(audio, { de: 1500, para: 480, inicio: t, duracao: 0.13, volume: 0.16 });
        tom(audio, { de: 950, para: 1400, inicio: t + 0.1, duracao: 0.09, volume: 0.06 });
    });

/** Começa a ouvir: dois toques a subir. */
export const somInicioVoz = () =>
    tocar((audio, t) => {
        tom(audio, { de: 660, para: 680, inicio: t, duracao: 0.1, volume: 0.1 });
        tom(audio, { de: 990, para: 1010, inicio: t + 0.11, duracao: 0.14, volume: 0.1 });
    });

/** Parou de ouvir: dois toques a descer. */
export const somFimVoz = () =>
    tocar((audio, t) => {
        tom(audio, { de: 990, para: 970, inicio: t, duracao: 0.09, volume: 0.08 });
        tom(audio, { de: 660, para: 640, inicio: t + 0.1, duracao: 0.12, volume: 0.08 });
    });
