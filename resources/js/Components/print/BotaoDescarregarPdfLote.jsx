import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
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
        <AnimatedButton type="button" variant="secondary" onClick={descarregar} disabled={aGerar}>
            {aGerar ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {aGerar ? "A gerar PDF..." : "Descarregar tudo (PDF)"}
        </AnimatedButton>
    );
}
