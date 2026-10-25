/** Consumo não negativo, igual à regra de consumo do modelo Leitura. */
export function consumoLeitura(leitura) {
    return Math.max(
        0,
        Number(leitura?.leitura_actual ?? 0) - Number(leitura?.leitura_anterior ?? 0),
    );
}
