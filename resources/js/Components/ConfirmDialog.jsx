import { AlertTriangle, HelpCircle } from "lucide-react";
import DangerButton from "@/Components/DangerButton";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";

const toneConfig = {
    // Acção destrutiva/irreversível (anular, eliminar, estornar...).
    danger: {
        icone: AlertTriangle,
        iconeClasses: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
        Botao: DangerButton,
    },
    // Sugestão do próximo passo do fluxo (ex.: "factura emitida — pagar
    // agora?") — não é destrutiva, não deve parecer um aviso de perigo.
    primary: {
        icone: HelpCircle,
        iconeClasses: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
        Botao: PrimaryButton,
    },
};

export default function ConfirmDialog({
    show,
    onClose,
    onConfirm,
    title = "Confirmar acção",
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "danger",
}) {
    const { icone: Icone, iconeClasses, Botao } = toneConfig[tone] ?? toneConfig.danger;

    return (
        <Modal show={show} onClose={onClose} title={title} maxWidth="sm">
            <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconeClasses}`}>
                    <Icone className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
                <SecondaryButton type="button" onClick={onClose}>
                    {cancelLabel}
                </SecondaryButton>
                <Botao type="button" onClick={onConfirm}>
                    {confirmLabel}
                </Botao>
            </div>
        </Modal>
    );
}
