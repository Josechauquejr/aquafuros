import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { baixarElementosComoPdf } from "@/lib/pdf";

/**
 * Descarrega várias facturas/recibos como um único ficheiro PDF (uma página
 * do PDF por elemento) — a versão em lote do BotaoDescarregarPdf.
 */
export default function BotaoDescarregarPdfLote({ elementosRef, nomeFicheiro, formato }) {
    const [aGerar, setAGerar] = useState(false);

    const descarregar = async () => {
        const elementos = (elementosRef.current ?? []).filter(Boolean);
        if (elementos.length === 0 || aGerar) return;

        setAGerar(true);
        try {
            await baixarElementosComoPdf(elementos, nomeFicheiro, formato);
        } catch (erro) {
            console.error("Falha ao gerar o PDF em lote:", erro);
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
            {aGerar ? "A gerar PDF..." : "Descarregar tudo (PDF)"}
        </button>
    );
}
