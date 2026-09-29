import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
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
        <AnimatedButton type="button" variant="secondary" onClick={descarregar} disabled={aGerar}>
            {aGerar ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
            )}
            {aGerar ? "A gerar..." : "Descarregar"}
        </AnimatedButton>
    );
}
