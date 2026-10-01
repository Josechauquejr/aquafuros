import { router } from "@inertiajs/react";
import { useState } from "react";
import DangerButton from "@/Components/DangerButton";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import SecondaryButton from "@/Components/SecondaryButton";
import TextInput from "@/Components/TextInput";

/**
 * Confirmação reforçada de uma acção perigosa: só se activa depois de escrever
 * a palavra pedida. O servidor volta a validá-la (campo `confirmacao`).
 * `accao` = { metodo: "post" | "delete", url, dados? }.
 */
export default function ConfirmarComTexto({ accao, palavra, titulo, descricao, rotulo, onClose }) {
    const [texto, setTexto] = useState("");
    const [erro, setErro] = useState(null);
    const [a_enviar, setAEnviar] = useState(false);

    const fechar = () => {
        setTexto("");
        setErro(null);
        onClose();
    };

    const confirmar = (event) => {
        event.preventDefault();
        if (texto.trim() !== palavra || !accao) return;
        router.visit(accao.url, { method: accao.metodo, data: { ...(accao.dados ?? {}), confirmacao: texto.trim() }, preserveScroll: true,
            onStart: () => setAEnviar(true),
            onFinish: () => setAEnviar(false),
            onSuccess: fechar,
            onError: (erros) => setErro(erros.confirmacao ?? "Não foi possível executar a acção."),
        });
    };

    return (
        <Modal show={Boolean(accao)} onClose={fechar} title={titulo} maxWidth="md">
            <form onSubmit={confirmar} className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{descricao}</p>
                <div>
                    <label htmlFor="confirmacao" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Para confirmar, escreva <strong className="font-mono">{palavra}</strong>
                    </label>
                    <TextInput id="confirmacao" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" autoFocus className="mt-1 block w-full font-mono" />
                    <InputError message={erro} className="mt-1" />
                </div>
                <div className="flex justify-end gap-3">
                    <SecondaryButton type="button" onClick={fechar}>Cancelar</SecondaryButton>
                    <DangerButton type="submit" disabled={a_enviar || texto.trim() !== palavra}>{rotulo}</DangerButton>
                </div>
            </form>
        </Modal>
    );
}
