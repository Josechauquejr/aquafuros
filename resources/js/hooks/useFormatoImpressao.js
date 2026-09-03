import { useCallback, useState } from "react";

const CHAVE = "aquafuros-formato-impressao";

/**
 * Preferência de formato de impressão (A4 vs térmica 58mm), persistida em
 * localStorage — mesmo padrão já usado para o colapso da sidebar. Sem isto,
 * quem imprime sempre em térmica (tipicamente a Caixa) tinha de re-seleccionar
 * "58mm" em cada factura/recibo impresso.
 */
export default function useFormatoImpressao(valorInicial = "a4") {
    const [formato, setFormatoState] = useState(() => {
        try {
            return localStorage.getItem(CHAVE) ?? valorInicial;
        } catch {
            return valorInicial;
        }
    });

    const setFormato = useCallback((novoFormato) => {
        setFormatoState(novoFormato);
        try {
            localStorage.setItem(CHAVE, novoFormato);
        } catch {
            // ignora falha ao persistir preferência
        }
    }, []);

    return [formato, setFormato];
}
