import { useRef, useState } from "react";

/**
 * Cartão expandido para linhas de tabelas e listas que não usam o DataTable
 * (emails, logs): clicar na linha abre o cartão com todos os dados, tal como
 * no DataTable. Guarda só o id da linha, por isso o cartão acompanha os dados
 * quando a página recarrega (ex.: depois de marcar um erro como resolvido).
 *
 * Uso: `const cartao = useCartaoDeLinha(linhas)`; na linha `{...cartao.propsLinha(linha)}`;
 * no fim da página `<ExpandableCard open={cartao.aberta} onOpenChange={(v) => !v && cartao.fechar()} …>`
 * com `cartao.linha` como conteúdo.
 */
export default function useCartaoDeLinha(linhas, linhaId = (linha) => linha.id) {
    const [id, setId] = useState(null);
    const ultima = useRef(null);

    const actual = id === null ? null : (linhas.find((linha) => linhaId(linha) === id) ?? null);
    if (actual) ultima.current = actual; // o cartão não fica vazio durante a animação de fecho

    return {
        aberta: actual !== null,
        linha: actual ?? ultima.current,
        fechar: () => setId(null),
        propsLinha: (linha) => ({
            onClick: (evento) => {
                if (evento.target.closest("a, button, input, label, select, [data-no-expand]")) return;
                setId(linhaId(linha));
            },
            onKeyDown: (evento) => {
                if (evento.key === "Enter" && evento.target === evento.currentTarget) setId(linhaId(linha));
            },
            tabIndex: 0,
            title: "Ver todos os dados",
        }),
    };
}

/** Classes de uma linha clicável (igual ao DataTable). */
export const linhaClicavel =
    "cursor-pointer transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40";
