import { Link } from "@inertiajs/react";
import ActionsMenu, { ActionsMenuItem, ActionsMenuSeparator } from "@/Components/ActionsMenu";
import { cn } from "@/lib/utils";

const botaoBase =
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500";

const botaoEstilos = {
    // Acção mais provável da linha (Receber, Confirmar): preenchida.
    destaque:
        "border-transparent bg-cyan-700 text-white hover:bg-cyan-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400",
    normal:
        "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
};

/**
 * Acções de uma linha: no máximo 1 principal visível + menu ⋮. A principal
 * leva texto (não só um ícone), para ser óbvio o que faz. Sem principal,
 * só o ⋮. Itens sem disponibilidade ficam desactivados, com um tooltip
 * (`motivo`) a explicar porquê.
 *
 * principal: { icone, curto, rotulo?, destaque?, href?, target?, onClick? }
 *   `curto` é o texto do botão ("Receber"); `rotulo` é o aria-label completo.
 * menu: [{ icone, rotulo, href?, target?, onClick?, tone?, disabled?, motivo?, separadorAntes? }]
 */
export default function RowActions({ principal, menu = [], rotuloMenu }) {
    const PrincipalIcone = principal?.icone;
    const texto = principal?.curto ?? principal?.rotulo;
    const classes = cn(botaoBase, principal?.destaque ? botaoEstilos.destaque : botaoEstilos.normal);

    return (
        <div className="flex items-center justify-end gap-1.5">
            {principal &&
                (principal.href ? (
                    <Link
                        href={principal.href}
                        target={principal.target}
                        title={principal.rotulo ?? texto}
                        aria-label={principal.rotulo ?? texto}
                        className={classes}
                    >
                        {PrincipalIcone && <PrincipalIcone className="h-4 w-4" aria-hidden="true" />}
                        {texto}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={principal.onClick}
                        title={principal.rotulo ?? texto}
                        aria-label={principal.rotulo ?? texto}
                        className={classes}
                    >
                        {PrincipalIcone && <PrincipalIcone className="h-4 w-4" aria-hidden="true" />}
                        {texto}
                    </button>
                ))}

            {menu.length > 0 && (
                <ActionsMenu label={rotuloMenu ?? "Mais acções"}>
                    {menu.map((item) => {
                        const Icone = item.icone;
                        const navega = item.href && !item.disabled;

                        return (
                            <div key={item.rotulo}>
                                {item.separadorAntes && <ActionsMenuSeparator />}
                                <ActionsMenuItem
                                    as={navega ? Link : "button"}
                                    tone={item.tone}
                                    disabled={item.disabled}
                                    title={item.disabled ? item.motivo : undefined}
                                    onClick={item.onClick}
                                    {...(navega ? { href: item.href, target: item.target } : {})}
                                >
                                    {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                                    {item.rotulo}
                                </ActionsMenuItem>
                            </div>
                        );
                    })}
                </ActionsMenu>
            )}
        </div>
    );
}
