import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Banknote, Printer } from "lucide-react";
import { useRef } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdf from "@/Components/print/BotaoDescarregarPdf";
import FacturaA4 from "@/Components/print/FacturaA4";
import FacturaTermica58mm from "@/Components/print/FacturaTermica58mm";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";

export default function Imprimir({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const [formato, setFormato] = useFormatoImpressao();
    const conteudoRef = useRef(null);
    const aceitaPagamento = factura.estado === "pendente" || factura.estado === "parcial";

    const irParaPagamento = () => {
        router.visit(`/pagamentos?factura_id=${factura.id}`);
    };

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Factura ${factura.numero_factura}`} />
            <EstiloPagina formato={formato} />

            <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/facturas"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Voltar
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <FormatoImpressaoToggle formato={formato} onChange={setFormato} />
                    <BotaoDescarregarPdf
                        alvoRef={conteudoRef}
                        nomeFicheiro={`factura-${factura.numero_factura}.pdf`}
                        formato={formato}
                    />
                    {aceitaPagamento && (
                        <AnimatedButton
                            variant="primary"
                            onClick={irParaPagamento}
                            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                        >
                            <Banknote className="h-4 w-4" aria-hidden="true" />
                            Efectuar pagamento
                        </AnimatedButton>
                    )}
                    <AnimatedButton variant="primary" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Imprimir
                    </AnimatedButton>
                </div>
            </div>

            {formato === "58mm" ? (
                <div
                    ref={conteudoRef}
                    className="mx-auto w-[58mm] border border-dashed border-slate-300 bg-white p-[2mm] shadow-sm print:border-0 print:shadow-none"
                >
                    <FacturaTermica58mm
                        factura={factura}
                        primeiraLeitura={primeiraLeitura}
                        consumoAnterior={consumoAnterior}
                        qrUrl={qrUrl}
                    />
                </div>
            ) : (
                <div ref={conteudoRef}>
                    <FacturaA4
                        factura={factura}
                        primeiraLeitura={primeiraLeitura}
                        consumoAnterior={consumoAnterior}
                        qrUrl={qrUrl}
                    />
                </div>
            )}
        </div>
    );
}
