import { useEffect, useState } from "react";

/**
 * Tema claro/escuro/sistema — substitui o `useTheme` do next-themes (que o
 * Animate UI assume) pelo mecanismo próprio da app: preferência em
 * localStorage("theme") e classe `dark` no <html>, tal como em app.js.
 * Várias instâncias (ex.: sidebar e cabeçalho) mantêm-se sincronizadas.
 */
const CHAVE = "theme";
const ouvintes = new Set();

function ler() {
    try {
        return localStorage.getItem(CHAVE) || "system";
    } catch {
        return "system";
    }
}

function sistemaEscuro() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolver(tema) {
    return tema === "system" ? (sistemaEscuro() ? "dark" : "light") : tema;
}

function aplicar(tema) {
    const escuro = resolver(tema) === "dark";
    document.documentElement.classList.toggle("dark", escuro);
    document.documentElement.style.colorScheme = escuro ? "dark" : "light";
}

export function useTheme() {
    const [theme, setThemeEstado] = useState(ler);
    const [resolvedTheme, setResolved] = useState(() => resolver(ler()));

    useEffect(() => {
        const sincronizar = (tema) => {
            setThemeEstado(tema);
            setResolved(resolver(tema));
        };
        ouvintes.add(sincronizar);

        // "Sistema": acompanha a alteração do tema do SO.
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const aoMudarSistema = () => {
            const tema = ler();
            if (tema === "system") {
                aplicar(tema);
                sincronizar(tema);
            }
        };
        media.addEventListener("change", aoMudarSistema);

        return () => {
            ouvintes.delete(sincronizar);
            media.removeEventListener("change", aoMudarSistema);
        };
    }, []);

    const setTheme = (tema) => {
        try {
            localStorage.setItem(CHAVE, tema);
        } catch {
            // sem persistência (modo privado) — só aplica nesta sessão
        }
        aplicar(tema);
        ouvintes.forEach((ouvinte) => ouvinte(tema));
    };

    return { theme, resolvedTheme, setTheme };
}
