import { X } from "lucide-react";
import AnimatedButton from "@/Components/AnimatedButton";

/** Barra fixa "3 seleccionadas · [Acção] · Cancelar". */
export default function BulkBar({ total, acoes, ids, onCancelar }) {
    if (total === 0) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:pb-4" role="region" aria-label="Acções em massa">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-950/15 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {total} {total === 1 ? "seleccionada" : "seleccionadas"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {acoes.map((accao) => {
                        const Icone = accao.icone;
                        const props = accao.href
                            ? { as: "a", href: accao.href(ids), target: accao.target }
                            : { onClick: () => accao.onClick(ids, onCancelar) };

                        return (
                            <AnimatedButton key={accao.rotulo} variant="primary" {...props}>
                                {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                                {accao.rotulo}
                            </AnimatedButton>
                        );
                    })}
                    <AnimatedButton variant="ghost" onClick={onCancelar}>
                        <X className="h-4 w-4" aria-hidden="true" />
                        Cancelar
                    </AnimatedButton>
                </div>
            </div>
        </div>
    );
}
