import { usePage } from "@inertiajs/react";
import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import SwipeToast from "@/Components/SwipeToast";

// O servidor devolve algumas confirmações como chave (Breeze); as restantes já são frases.
const mensagens = {
    "profile-updated": "Perfil actualizado com sucesso.",
    "password-updated": "Palavra-passe actualizada com sucesso.",
    "verification-link-sent": "Um novo link de verificação foi enviado para o seu email.",
};

/**
 * Feedback das operações (criar, editar, apagar, anular...) como toast
 * (SwipeToast): lê flash.status / flash.error que o servidor põe na sessão e
 * mostra-os no canto, num só sítio para todas as páginas das áreas
 * autenticadas. Deslizar para baixo dispensa-o; some sozinho ao fim de uns segundos.
 */
export default function FlashToasts() {
    const { flash } = usePage().props;
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (flash?.error) {
            setToast({ id: Date.now(), erro: true, titulo: flash.error });
        } else if (flash?.status) {
            setToast({ id: Date.now(), erro: false, titulo: mensagens[flash.status] ?? flash.status });
        }
    }, [flash]);

    if (!toast) return null;

    return (
        <SwipeToast
            key={toast.id}
            title={toast.titulo}
            icon={<HugeiconsIcon icon={toast.erro ? Alert02Icon : CheckmarkCircle02Icon} size={18} strokeWidth={1.8} />}
            fuseColor={toast.erro ? "#f43f5e" : "#10b981"}
            duration={toast.erro ? 7000 : 4500}
            width={380}
            closeButton
            onClose={() => setToast((actual) => (actual?.id === toast.id ? null : actual))}
        />
    );
}
