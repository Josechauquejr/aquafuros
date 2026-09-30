/**
 * Pesquisa difusa (fuzzy) no browser — o mesmo algoritmo de
 * app/Support/BuscaDifusa.php: ignora maiúsculas e acentos, aceita palavras
 * parciais e pequenos erros de escrita; todas as palavras escritas têm de
 * corresponder. Usada nos selectores pesquisáveis (ListaPesquisavel).
 */

export function normalizar(texto) {
    return String(texto ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const actual = [i];
        for (let j = 1; j <= b.length; j++) {
            actual[j] = Math.min(
                anterior[j] + 1,
                actual[j - 1] + 1,
                anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
            );
        }
        anterior = actual;
    }
    return anterior[b.length];
}

function tolerancia(token) {
    if (/^\d+$/.test(token) || token.length <= 3) return 0;
    return token.length <= 6 ? 1 : 2;
}

function distancia(token, palavra) {
    if (palavra.includes(token)) return 0;
    const tol = tolerancia(token);
    if (tol === 0) return null;

    const melhor = Math.min(levenshtein(token, palavra), levenshtein(token, palavra.slice(0, token.length)));
    return melhor <= tol ? melhor : null;
}

/** Pontuação (0 = melhor) ou `null` se alguma palavra pesquisada não corresponder. */
export function pontuar(pesquisa, texto) {
    const tokens = normalizar(pesquisa).split(" ").filter(Boolean);
    if (tokens.length === 0) return 0;

    const palavras = normalizar(texto).split(" ").filter(Boolean);
    if (palavras.length === 0) return null;

    let total = 0;
    for (const token of tokens) {
        let melhor = null;
        for (const palavra of palavras) {
            const d = distancia(token, palavra);
            if (d !== null && (melhor === null || d < melhor)) melhor = d;
            if (melhor === 0) break;
        }
        if (melhor === null) return null;
        total += melhor;
    }
    return total;
}

/** Filtra `itens` pela pesquisa, dos melhores para os piores; sem pesquisa devolve-os todos. */
export function filtrarDifuso(itens, pesquisa, obterTexto) {
    if (!normalizar(pesquisa)) return itens;

    return itens
        .map((item) => ({ item, pontos: pontuar(pesquisa, obterTexto(item)) }))
        .filter((r) => r.pontos !== null)
        .sort((a, b) => a.pontos - b.pontos)
        .map((r) => r.item);
}
