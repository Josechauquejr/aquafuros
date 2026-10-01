import { router, usePage } from "@inertiajs/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";

// Mostra a novidade do sistema que o utilizador ainda não viu. Ao fechar, o
// servidor regista que já a viu e ela não volta a aparecer.
export default function NovidadesModal() {
    const { novidade } = usePage().props;
    const [fechada, setFechada] = useState(null);

    if (!novidade) return null;

    const fechar = () => {
        setFechada(novidade.id);
        router.post("/novidades/vista", {}, { preserveScroll: true, preserveState: true, only: ["novidade"] });
    };

    return (
        <Modal show={fechada !== novidade.id} onClose={fechar} title="Novidades do sistema" maxWidth="lg">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <p className="text-lg font-semibold text-slate-950 dark:text-white">{novidade.titulo}</p>
                    {novidade.resumo && <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{novidade.resumo}</p>}
                </div>
            </div>
            <ul className="mt-5 space-y-4">
                {novidade.novidades.map((item) => (
                    <li key={item.titulo} className="border-l-2 border-cyan-600 pl-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.titulo}</p>
                        <p className="mt-0.5 text-sm leading-5 text-slate-600 dark:text-slate-400">{item.texto}</p>
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex justify-end">
                <PrimaryButton type="button" onClick={fechar}>Entendi</PrimaryButton>
            </div>
        </Modal>
    );
}
