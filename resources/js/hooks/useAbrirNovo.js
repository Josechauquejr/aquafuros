import { useEffect, useRef } from "react";

export const EVENTO_NOVO = "aquafuros:novo";

/**
 * Liga o menu "+ Novo" da barra de topo (e as teclas P, L, N, F) ao
 * formulário de criação da página: chegou com `?novo=1` → abre logo; já
 * está na página → o menu dispara o evento e abre sem recarregar.
 */
export default function useAbrirNovo(abrir) {
    const ref = useRef(abrir);
    ref.current = abrir;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("novo") === "1") {
            params.delete("novo");
            const resto = params.toString();
            window.history.replaceState(window.history.state, "", window.location.pathname + (resto ? `?${resto}` : ""));
            ref.current();
        }

        const ouvir = () => ref.current();
        window.addEventListener(EVENTO_NOVO, ouvir);
        return () => window.removeEventListener(EVENTO_NOVO, ouvir);
    }, []);
}
