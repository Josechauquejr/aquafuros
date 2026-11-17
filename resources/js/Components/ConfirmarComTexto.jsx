import { router } from "@inertiajs/react";
import { useState } from "react";
import DangerButton from "@/Components/DangerButton";
import InputError from "@/Components/InputError";
import Ilustracao from "@/Components/Ilustracao";
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
        <Modal show={Boolean(accao)} onClose={fechar} title={titulo} semCabecalho>
            <form onSubmit={confirmar} className="flex flex-col items-center gap-3 text-center">
                <Ilustracao nome="lixeira" largura={150} />
                <strong className="text-xl leading-snug text-ink dark:text-[#F2F5FB]">{titulo}</strong>
                <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{descricao}</p>
                <label htmlFor="confirmacao" className="flex w-full flex-col gap-1.5 text-left">
                    <span className="text-[13px] font-semibold text-ink dark:text-[#F2F5FB]">
                        Para confirmar, escreva <strong>{palavra}</strong>
                    </span>
                    <TextInput id="confirmacao" value={texto} onChange={(e) => setTexto(e.target.value)} autoComplete="off" autoFocus className="block w-full rounded-md" />
                    <InputError message={erro} />
                </label>
                <div className="mt-1 grid w-full grid-cols-2 gap-2.5">
                    <SecondaryButton type="button" onClick={fechar} className="min-h-[48px] w-full rounded-[14px] text-sm font-bold">Cancelar</SecondaryButton>
                    <DangerButton type="submit" disabled={a_enviar || texto.trim() !== palavra} className="min-h-[48px] w-full rounded-[14px] text-sm">{rotulo}</DangerButton>
                </div>
            </form>
        </Modal>
    );
}
