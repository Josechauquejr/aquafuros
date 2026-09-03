import { Head, router } from "@inertiajs/react";
import { AlertTriangle, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import AnimatedPanel from "@/Components/AnimatedPanel";

const LEITOR_ID = "leitor-qr";

/**
 * Lê o QR code impresso nas facturas/recibos através da câmara do
 * dispositivo. O texto codificado é a própria URL pública de verificação
 * (/verificar/factura/{id}?signature=...) — em vez de abrir essa página
 * pública, extrai o tipo e o id e navega para a vista interna e autenticada
 * equivalente, onde caixa/gestor já podem agir sobre o documento.
 */
export default function LerQr() {
    const [erro, setErro] = useState(null);
    const [aIniciar, setAIniciar] = useState(true);
    const instanciaRef = useRef(null);
    const paradoRef = useRef(false);

    useEffect(() => {
        paradoRef.current = false;

        const interpretarTexto = (texto) => {
            try {
                const url = new URL(texto);
                const match = url.pathname.match(/\/verificar\/(factura|pagamento)\/(\d+)/);
                if (!match) return null;
                const [, tipo, id] = match;
                return tipo === "factura" ? `/facturas/${id}/imprimir` : `/pagamentos/${id}/imprimir`;
            } catch {
                return null;
            }
        };

        const pararLeitor = async () => {
            paradoRef.current = true;
            if (instanciaRef.current) {
                try {
                    await instanciaRef.current.stop();
                } catch {
                    // já pode ter parado (ex.: câmara desligada) — ignora
                }
            }
        };

        (async () => {
            try {
                const { Html5Qrcode } = await import("html5-qrcode");
                if (paradoRef.current) return;

                const leitor = new Html5Qrcode(LEITOR_ID);
                instanciaRef.current = leitor;

                await leitor.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    async (textoDecodificado) => {
                        const destino = interpretarTexto(textoDecodificado);
                        if (!destino) {
                            setErro("QR code não reconhecido — não corresponde a uma factura ou recibo do Aquafuros.");
                            return;
                        }
                        await pararLeitor();
                        router.visit(destino);
                    },
                    () => {
                        // callback de "não encontrou nada neste frame" — normal, ignora
                    },
                );
                setAIniciar(false);
            } catch (excepcao) {
                setAIniciar(false);
                setErro(
                    "Não foi possível aceder à câmara. Verifique se deu permissão ao navegador e se está a usar HTTPS ou localhost.",
                );
                console.error(excepcao);
            }
        })();

        return () => {
            pararLeitor();
        };
    }, []);

    return (
        <AdminLayout
            header={
                <div>
                    <p className="text-sm font-semibold uppercase text-cyan-700 dark:text-cyan-300">Verificação</p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-950 dark:text-white">Ler QR Code</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Aponte a câmara ao QR code impresso na factura ou no recibo.
                    </p>
                </div>
            }
        >
            <Head title="Ler QR Code" />

            <div className="py-8 sm:py-10">
                <div className="mx-auto max-w-lg space-y-6 px-4 sm:px-6 lg:px-8">
                    <AnimatedPanel className="p-6">
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <QrCode className="h-4 w-4" aria-hidden="true" />
                            {aIniciar ? "A iniciar câmara..." : "A aguardar leitura..."}
                        </div>
                        <div
                            id={LEITOR_ID}
                            className="mt-4 overflow-hidden rounded-md border border-slate-200 bg-slate-950 dark:border-slate-800"
                        />
                        {erro && (
                            <div className="mt-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{erro}</span>
                            </div>
                        )}
                    </AnimatedPanel>
                </div>
            </div>
        </AdminLayout>
    );
}
