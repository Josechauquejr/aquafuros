import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
];

function applyTheme(theme) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }) {
    const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

    useEffect(() => {
        localStorage.setItem("theme", theme);
        applyTheme(theme);

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => applyTheme(theme);
        media.addEventListener("change", handleChange);

        return () => media.removeEventListener("change", handleChange);
    }, [theme]);

    return (
        <div
            className={cn(
                "inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900",
                className,
            )}
            aria-label="Escolher tema"
        >
            {themes.map(({ value, label, icon: Icon }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    title={label}
                    aria-label={label}
                    aria-pressed={theme === value}
                    className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                        theme === value &&
                            "bg-cyan-700 text-white hover:bg-cyan-700 hover:text-white dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-500",
                    )}
                >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}
