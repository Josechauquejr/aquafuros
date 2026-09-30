import { ThemeTogglerButton } from "@/Components/animate-ui/components/buttons/theme-toggler";

/**
 * Botão de tema (claro → escuro → sistema) do Animate UI, com a transição
 * animada entre temas. A lógica do tema vive em hooks/use-theme.js.
 */
export default function ThemeToggle({ className = "" }) {
    return (
        <ThemeTogglerButton
            variant="outline"
            size="default"
            direction="ltr"
            className={className}
            aria-label="Alternar tema (claro, escuro, sistema)"
            title="Alternar tema"
        />
    );
}
