import { Check, X } from "lucide-react";
import DangerButton from "@/Components/DangerButton";
import Ilustracao from "@/Components/Ilustracao";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";

// A cor do botão de acção diz o nível: vermelho para o que é destrutivo
// (anular, remover, estornar), azul-marinho para o próximo passo do fluxo.
const toneConfig = {
    danger: { ilustracao: "anular", Botao: DangerButton },
    simples: { ilustracao: "lixeira", Botao: DangerButton },
    primary: { ilustracao: "confirmar", Botao: PrimaryButton },
};

/**
 * Diálogo sem barras: ilustração + pergunta + uma frase + 2 botões iguais
 * em largura. `pontos` (opcional): o que acontece, numa caixa à parte.
 */
export default function ConfirmDialog({
    show,
    onClose,
    onConfirm,
    title = "Confirmar acção",
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    tone = "danger",
    ilustracao,
    pontos,
    processing = false,
    campo,
}) {
    const { ilustracao: desenho, Botao } = toneConfig[tone] ?? toneConfig.danger;

    return (
        <Modal show={show} onClose={onClose} title={title} semCabecalho>
            <div className="flex flex-col items-center gap-3 text-center">
                <Ilustracao nome={ilustracao ?? desenho} largura={150} />
                <strong className="text-xl leading-snug text-ink dark:text-[#F2F5FB]">{title}</strong>
                {description && <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}
                {pontos?.length > 0 && (
                    <ul className="flex w-full flex-col gap-2 rounded-[14px] bg-slate-50 px-3.5 py-3 text-left text-sm text-ink dark:bg-[#1E232D] dark:text-[#F2F5FB]">
                        {pontos.map((ponto) => (
                            <li key={ponto} className="flex items-start gap-2.5">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" strokeWidth={2.4} aria-hidden="true" />
                                {ponto}
                            </li>
                        ))}
                    </ul>
                )}
                {campo && (
                    <label className="flex w-full flex-col gap-1.5 text-left">
                        <span className="text-[13px] font-semibold text-ink dark:text-[#F2F5FB]">{campo.rotulo}</span>
                        <input
                            type="text"
                            value={campo.valor}
                            onChange={(e) => campo.onChange(e.target.value)}
                            placeholder={campo.placeholder}
                            className="min-h-[46px] rounded-md border-[#DDE2EE] text-sm dark:border-slate-700 dark:bg-[#1E232D] dark:text-[#F2F5FB]"
                        />
                    </label>
                )}
                <div className="mt-1 grid w-full grid-cols-2 gap-2.5">
                    <SecondaryButton type="button" onClick={onClose} className="min-h-[48px] w-full rounded-[14px] text-sm font-bold">
                        <X className="h-[18px] w-[18px]" aria-hidden="true" />
                        {cancelLabel}
                    </SecondaryButton>
                    <Botao type="button" onClick={onConfirm} disabled={processing || (campo?.obrigatorio && !String(campo.valor ?? "").trim())} className="min-h-[48px] w-full rounded-[14px] text-sm">
                        <Check className="h-[18px] w-[18px]" aria-hidden="true" />
                        {confirmLabel}
                    </Botao>
                </div>
            </div>
        </Modal>
    );
}
