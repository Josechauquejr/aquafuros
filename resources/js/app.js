// Fonte alojada no próprio sistema: sem pedido externo a bloquear o 1.º ecrã em ligações lentas.
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import { createInertiaApp } from "@inertiajs/react";
import { MotionConfig } from "motion/react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { ShellAdmin } from "@/Layouts/AdminLayout";
import { ShellDev } from "@/Layouts/DevLayout";

// Páginas das áreas autenticadas dentro da shell persistente (sidebar, barra de
// topo e toasts ficam montados ao navegar — sem piscar). As restantes (login,
// impressões, páginas públicas) não levam shell. Uma página nova que use
// AdminLayout/DevLayout e não esteja aqui continua a funcionar: monta a sua
// própria shell, só que sem a persistência.
const paginasDev = new Set(["Admin/Logs", "Users/Index", "Users/Lixeira"]);
const paginasAdmin = new Set([
    "Admin/Dashboard", "Admin/Kpis", "Caixa/Dashboard", "Clientes/Index", "Cobranca/Index",
    "Emails/Index", "Facturas/Index", "Gestor/Dashboard", "Leituras/Index", "LerQr", "Lixeira/Index",
    "Notificacoes/Index", "NotificacoesSistema/Index", "Ocorrencias/Index", "Pagamentos/Index",
    "Producao/Index", "Tarifas/Index", "Tecnico/Dashboard", "Zonas/Index",
]);

function shellDaPagina(nome, pagina) {
    if (nome.startsWith("Dev/") || paginasDev.has(nome)) return ShellDev;
    if (nome === "Profile/Edit") {
        return pagina.props.auth?.roles?.includes("desenvolvedor") ? ShellDev : ShellAdmin;
    }
    return paginasAdmin.has(nome) ? ShellAdmin : undefined;
}

const storedTheme = localStorage.getItem("theme") || "system";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const shouldUseDark = storedTheme === "dark" || (storedTheme === "system" && prefersDark);

document.documentElement.classList.toggle("dark", shouldUseDark);
document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";

createInertiaApp({
    layout: shellDaPagina,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
            createElement(MotionConfig, { reducedMotion: "user" }, createElement(App, props)),
        );
    },
});
