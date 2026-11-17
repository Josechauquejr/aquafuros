import { useSyncExternalStore } from "react";

// O Chrome só dispara `beforeinstallprompt` uma vez e pode fazê-lo antes de
// qualquer componente montar — por isso fica guardado aqui, ao nível do módulo.
let pedidoInstalacao = null;
const ouvintes = new Set();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (evento) => {
        evento.preventDefault();
        pedidoInstalacao = evento;
        avisar();
    });

    window.addEventListener("appinstalled", () => {
        pedidoInstalacao = null;
        avisar();
    });

    // Só em HTTPS (ou localhost); em http://aquafuros.test o browser recusa.
    if ("serviceWorker" in navigator && window.isSecureContext) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
        });
    }
}

/** Devolve uma função para abrir o diálogo de instalação, ou null se não houver. */
export function useInstalarApp() {
    const pedido = useSyncExternalStore(
        (ouvinte) => {
            ouvintes.add(ouvinte);
            return () => ouvintes.delete(ouvinte);
        },
        () => pedidoInstalacao,
        () => null,
    );

    if (!pedido) return null;

    return async () => {
        await pedido.prompt();
        await pedido.userChoice;
        pedidoInstalacao = null;
        avisar();
    };
}
