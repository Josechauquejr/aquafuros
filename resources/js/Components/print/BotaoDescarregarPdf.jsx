import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { baixarElementoComoPdf } from "@/lib/pdf";

/**
 * Botão "Descarregar" que gera o PDF a partir do próprio conteúdo
 * apresentado no ecrã — respeita sempre o formato (A4/58mm) actualmente
 * seleccionado, porque captura o elemento tal como está.
 */
export default function BotaoDescarregarPdf({ alvoRef, nomeFicheiro, formato }) {
    const [aGerar, setAGerar] = useState(false);

    const descarregar = async () => {
        if (!alvoRef.current || aGerar) return;

        setAGerar(true);
        try {
            await baixarElementoComoPdf(alvoRef.current, nomeFicheiro, formato);
        } catch (erro) {
            console.error("Falha ao gerar o PDF:", erro);
        } finally {
            setAGerar(false);
        }
    };

    return (
        <button
            type="button"
            onClick={descarregar}
            disabled={aGerar}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
            {aGerar ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {aGerar ? "A gerar..." : "Descarregar"}
        </button>
    );
}
