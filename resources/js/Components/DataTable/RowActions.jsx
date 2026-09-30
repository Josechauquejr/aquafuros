import { Link } from "@inertiajs/react";
import ActionsMenu, { ActionsMenuItem, ActionsMenuSeparator } from "@/Components/ActionsMenu";
import IconButton, { IconLink } from "@/Components/IconButton";

/**
 * Acções de uma linha: no máximo 1 principal visível + menu ⋮. Sem
 * principal, só o ⋮. Itens sem disponibilidade ficam desactivados, com um
 * tooltip (`motivo`) a explicar porquê.
 *
 * principal: { icone, rotulo, href?, target?, onClick?, tone? }
 * menu: [{ icone, rotulo, href?, target?, onClick?, tone?, disabled?, motivo?, separadorAntes? }]
 */
export default function RowActions({ principal, menu = [], rotuloMenu }) {
    const PrincipalIcone = principal?.icone;
    const tamanho = "h-11 w-11 md:h-9 md:w-9";

    return (
        <div className="flex items-center justify-end gap-1">
            {principal &&
                (principal.href ? (
                    <IconLink
                        href={principal.href}
                        target={principal.target}
                        title={principal.rotulo}
                        tone={principal.tone}
                        className={tamanho}
                    >
                        <PrincipalIcone className="h-5 w-5" aria-hidden="true" />
                    </IconLink>
                ) : (
                    <IconButton
                        onClick={principal.onClick}
                        title={principal.rotulo}
                        tone={principal.tone}
                        className={tamanho}
                    >
                        <PrincipalIcone className="h-5 w-5" aria-hidden="true" />
                    </IconButton>
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
