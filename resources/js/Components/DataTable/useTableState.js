import { router } from "@inertiajs/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Estado de uma tabela paginada no servidor — a fonte de verdade é a query
 * string (pesquisa, período, filtros, ordenação e página), para que
 * recarregar ou partilhar o link mantenha a vista. Cada alteração faz um
 * GET Inertia; a página volta sempre à 1.ª.
 *
 * `padroes` tem os valores que o servidor assume quando o parâmetro não vem
 * (ex.: { periodo: "mes", estado: "todos", sort: "data", dir: "desc" }) —
 * esses ficam de fora do URL para o manter curto.
 */
export default function useTableState({ rota, filtros, padroes }) {
    const [search, setSearch] = useState(filtros.search ?? "");
    const [carregando, setCarregando] = useState(false);
    const temporizadorCarga = useRef(null);

    const navegar = useCallback(
        (alteracoes) => {
            const proximo = { ...filtros, ...alteracoes };
            const params = {};

            Object.entries(proximo).forEach(([chave, valor]) => {
                if (chave === "sort" || chave === "dir") return;
                if (valor === null || valor === undefined || valor === "" || valor === false) return;
                if (padroes[chave] !== undefined && String(padroes[chave]) === String(valor)) return;
                params[chave] = valor === true ? 1 : valor;
            });

            // sort e dir só se omitem juntos (a direcção sozinha não diz nada).
            if (proximo.sort !== padroes.sort || proximo.dir !== padroes.dir) {
                params.sort = proximo.sort;
                params.dir = proximo.dir;
            }

            router.get(rota, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => {
                    // Só mostra o skeleton se a resposta demorar — evita o
                    // pisca-pisca em pedidos rápidos.
                    temporizadorCarga.current = setTimeout(() => setCarregando(true), 150);
                },
                onFinish: () => {
                    clearTimeout(temporizadorCarga.current);
                    setCarregando(false);
                },
            });
        },
        [rota, filtros, padroes],
    );

    // Pesquisa com debounce de 300 ms.
    useEffect(() => {
        if (search === (filtros.search ?? "")) return;
        const temporizador = setTimeout(() => navegar({ search }), 300);
        return () => clearTimeout(temporizador);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    useEffect(() => () => clearTimeout(temporizadorCarga.current), []);

    // Clicar no cabeçalho: coluna nova começa ↑ asc; a activa alterna.
    const ordenar = (chave) => {
        if (filtros.sort === chave) {
            navegar({ sort: chave, dir: filtros.dir === "asc" ? "desc" : "asc" });
        } else {
            navegar({ sort: chave, dir: "asc" });
        }
    };

    return { search, setSearch, carregando, navegar, ordenar };
}
