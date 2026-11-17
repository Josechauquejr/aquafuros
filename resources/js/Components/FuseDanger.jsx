import { Trash2 } from "lucide-react";
import FuseButton from "@/Components/FuseButton";

/**
 * FuseButton com o aspecto das operações críticas/destrutivas (anular,
 * eliminar, estornar...): só confirma quando o rastilho acaba, e até lá
 * "Desfazer" (ou Esc) cancela.
 */
export default function FuseDanger({ label, doneLabel = "A processar…", icon, onCommit, disabled, undoWindow = 4000 }) {
    return (
        <FuseButton
            label={label}
            undoLabel="Desfazer"
            doneLabel={doneLabel}
            icon={icon ?? <Trash2 size={15} aria-hidden="true" />}
            background="#B42318"
            color="#FDF1F0"
            fuseColor="#F3C77A"
            commitOn="fuseEnd"
            undoWindow={undoWindow}
            disabled={disabled}
            onCommit={onCommit}
        />
    );
}
