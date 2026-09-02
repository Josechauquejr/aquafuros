import { createInertiaApp } from "@inertiajs/react";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

const storedTheme = localStorage.getItem("theme") || "system";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const shouldUseDark = storedTheme === "dark" || (storedTheme === "system" && prefersDark);

document.documentElement.classList.toggle("dark", shouldUseDark);
document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(createElement(App, props));
    },
});
