import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Banknote, Printer } from "lucide-react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdf from "@/Components/print/BotaoDescarregarPdf";
import FacturaA4 from "@/Components/print/FacturaA4";
import FacturaTermica58mm from "@/Components/print/FacturaTermica58mm";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";

export default function Imprimir({ factura, primeiraLeitura, consumoAnterior, qrUrl }) {
    const [formato, setFormato] = useFormatoImpressao();
    const conteudoRef = useRef(null);
    const barraRef = useRef(null);
    const [escalaAjustada, setEscalaAjustada] = useState(1);
    const [zoom, setZoom] = useState(1);
    const aceitaPagamento = factura.estado === "pendente" || factura.estado === "parcial";
    const anterioresEmAberto = factura.cobranca?.origens ?? [];
    const pagarOrigens = () => {
        if (anterioresEmAberto.length === 1 && !aceitaPagamento) {
            router.visit(`/pagamentos?factura_id=${anterioresEmAberto[0].id}`);
        } else {
            router.visit(`/pagamentos?pagar_varias=1&cliente_id=${factura.cliente_id}`);
        }
    };

    const irParaPagamento = () => {
        router.visit(`/pagamentos?factura_id=${factura.id}`);
    };

    const medirFolha = useCallback(() => {
        const folha = conteudoRef.current;
        if (!folha || formato !== "a4") return;

        const largura = folha.offsetWidth;
        const altura = folha.offsetHeight;
        const topoDisponivel = barraRef.current?.getBoundingClientRect().bottom ?? 0;
        const larguraDisponivel = Math.max(280, window.innerWidth - 40);
        const alturaDisponivel = Math.max(240, window.innerHeight - topoDisponivel - 28);
        setEscalaAjustada(Math.min(1, larguraDisponivel / largura, alturaDisponivel / altura));
    }, [formato]);

    useEffect(() => {
        if (formato !== "a4") return undefined;

        const frame = requestAnimationFrame(medirFolha);
        const observer = new ResizeObserver(medirFolha);
        if (conteudoRef.current) observer.observe(conteudoRef.current);
        if (barraRef.current) observer.observe(barraRef.current);
        window.addEventListener("resize", medirFolha);
        document.fonts?.ready?.then(medirFolha);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", medirFolha);
        };
    }, [formato, medirFolha]);

    useEffect(() => setZoom(1), [formato]);

    const escalaFinal = escalaAjustada * zoom;
    const larguraFolha = conteudoRef.current?.offsetWidth ?? 0;
    const alturaFolha = conteudoRef.current?.offsetHeight ?? 0;

    return (
        <div className={formato === "a4" ? "flex h-[100dvh] flex-col overflow-hidden bg-slate-100 py-3 dark:bg-[#0B0D12] print:block print:h-auto print:overflow-visible print:bg-white print:py-0" : "min-h-screen bg-slate-100 py-8 print:bg-white print:py-0"}>
            <Head title={`Factura ${factura.numero_factura}`} />
            <EstiloPagina formato={formato} />

            <div ref={barraRef} className="mx-auto mb-3 flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link
                    href="/facturas"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink"
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
                            Pagar esta factura
                        </AnimatedButton>
                    )}
                    {anterioresEmAberto.length > 0 && <AnimatedButton variant="secondary" onClick={pagarOrigens}>
                        <Banknote className="h-4 w-4" aria-hidden="true" />Pagar facturas em aberto
                    </AnimatedButton>}
                    {formato === "a4" && (
                        <div className="inline-flex h-10 items-center gap-1 rounded-md border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900" aria-label="Zoom da pré-visualização">
                            <button type="button" onClick={() => setZoom((valor) => Math.max(0.65, Math.round((valor - 0.1) * 100) / 100))} className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Diminuir zoom" title="Diminuir zoom"><Minus className="h-4 w-4" /></button>
                            <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
                            <button type="button" onClick={() => setZoom((valor) => Math.min(2.2, Math.round((valor + 0.1) * 100) / 100))} className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" aria-label="Aumentar zoom" title="Aumentar zoom"><Plus className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setZoom(1)} className="flex h-8 items-center gap-1 rounded px-2 text-xs font-semibold text-cyan-700 hover:bg-slate-100 dark:text-cyan-300 dark:hover:bg-slate-800" aria-label="Ajustar folha ao ecrã" title="Ajustar folha ao ecrã"><Maximize2 className="h-3.5 w-3.5" />Ajustar</button>
                        </div>
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
                <div className="min-h-0 flex-1 overflow-auto print:overflow-visible">
                    <div className="a4-preview-size mx-auto print:!m-0 print:!h-auto print:!w-auto" style={{ width: larguraFolha ? larguraFolha * escalaFinal : undefined, height: alturaFolha ? alturaFolha * escalaFinal : undefined }}>
                    <FacturaA4
                        paperRef={conteudoRef}
                        style={{ transform: `scale(${escalaFinal})`, transformOrigin: "top left" }}
                        factura={factura}
                        primeiraLeitura={primeiraLeitura}
                        consumoAnterior={consumoAnterior}
                        qrUrl={qrUrl}
                    />
                    </div>
                </div>
            )}
        </div>
    );
}
