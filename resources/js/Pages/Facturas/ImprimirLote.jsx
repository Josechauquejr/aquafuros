import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Printer } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import AnimatedButton from "@/Components/AnimatedButton";
import BotaoDescarregarPdfLote from "@/Components/print/BotaoDescarregarPdfLote";
import FacturaTermica58mm from "@/Components/print/FacturaTermica58mm";
import FacturaCompacta from "@/Components/print/FacturaCompacta";
import FacturaA4 from "@/Components/print/FacturaA4";
import AnexoOrigensFactura from "@/Components/print/AnexoOrigensFactura";
import FacturaPrototipos from "@/Components/print/FacturaPrototipos";
import { resumoDocumento } from "@/lib/facturaDocumento";
import FormatoImpressaoToggle, { EstiloPagina } from "@/Components/print/FormatoImpressaoToggle";
import useFormatoImpressao from "@/hooks/useFormatoImpressao";

export default function ImprimirLote({ facturas, empresa, primeirasLeituras = {}, consumosAnteriores = {}, qrUrls = {} }) {
    const [formato, setFormato] = useFormatoImpressao();
    const [showPrototypes, setShowPrototypes] = useState(false);
    const paginasRef = useRef([]);
    const medicaoRef = useRef(null);
    const [paginas, setPaginas] = useState(() => Array.from({ length: Math.ceil(facturas.length / 3) }, (_, i) => ({ facturas: facturas.slice(i * 3, i * 3 + 3), individual: false })));
    const registarPagina = (index) => (elemento) => { paginasRef.current[index] = elemento; };

    // Mede os módulos à largura de impressão. Os mais longos passam para
    // outra folha, conservando o tamanho do texto e evitando cortes no PDF.
    useLayoutEffect(() => {
        if (formato !== "a4" || !medicaoRef.current) return;
        const container = medicaoRef.current;
        const medir = () => {
            const largura = container.getBoundingClientRect().width;
            if (!largura) return;
            const alturaPagina = largura * 273 / 186;
            const novasPaginas = [];
            let grupo = [];
            let altura = 0;
            [...container.children].forEach((elemento, index) => {
                const alturaModulo = elemento.getBoundingClientRect().height;
                if (grupo.length && (grupo.length === 3 || altura + alturaModulo > alturaPagina - 2)) {
                    novasPaginas.push({ facturas: grupo, individual: false }); grupo = []; altura = 0;
                }
                if (alturaModulo > alturaPagina - 2) {
                    novasPaginas.push({ facturas: [facturas[index]], individual: true });
                } else { grupo.push(facturas[index]); altura += alturaModulo; }
            });
            if (grupo.length) novasPaginas.push({ facturas: grupo, individual: false });
            setPaginas((anteriores) => JSON.stringify(anteriores.map(p => [p.individual, p.facturas.map(f => f.id)])) === JSON.stringify(novasPaginas.map(p => [p.individual, p.facturas.map(f => f.id)])) ? anteriores : novasPaginas);
        };
        medir();
        const observer = new ResizeObserver(medir);
        [...container.children].forEach(elemento => observer.observe(elemento));
        let activo = true;
        document.fonts.ready.then(() => { if (activo) medir(); });
        return () => { activo = false; observer.disconnect(); };
    }, [facturas, empresa, formato]);

    const propsFactura = (factura) => ({ factura, primeiraLeitura: primeirasLeituras[factura.id], consumoAnterior: consumosAnteriores[factura.id], qrUrl: qrUrls[factura.id] });
    const anexos = facturas.flatMap(factura => {
        const origens = resumoDocumento(factura).origens;
        if (origens.length <= 3) return [];
        const totalPaginas = Math.ceil(origens.length / 10);
        return Array.from({length: totalPaginas}, (_, index) => ({factura, origens: origens.slice(index * 10, (index + 1) * 10), numero: index + 1, totalPaginas}));
    });

    return (
        <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
            <Head title={`Impressão em lote — ${facturas.length} factura(s)`} />
            <EstiloPagina formato={formato} />
            <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
                <Link href="/facturas" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Voltar</Link>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-500">{showPrototypes ? "Pré-visualização com dados da factura seleccionada" : `${facturas.length} factura(s)${formato === "a4" ? ` · ${paginas.length + anexos.length} página(s) · até 3 facturas por folha A4` : ""}`}</span>
                    <button type="button" onClick={() => setShowPrototypes((show) => !show)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">{showPrototypes ? "Voltar à impressão" : "Comparar 4 protótipos"}</button>
                    {!showPrototypes && <><FormatoImpressaoToggle formato={formato} onChange={setFormato} /><BotaoDescarregarPdfLote elementosRef={paginasRef} nomeFicheiro={`facturas-lote-${Date.now()}.pdf`} formato={formato} /></>}
                    <AnimatedButton variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" />{showPrototypes ? "Imprimir proposta" : "Imprimir tudo"}</AnimatedButton>
                </div>
            </div>
            {showPrototypes ? <FacturaPrototipos facturas={facturas} empresa={empresa} /> : <>
            {!facturas.length && <p className="text-center text-sm text-slate-500">Nenhuma factura corresponde aos critérios seleccionados.</p>}
            {formato === "58mm" ? <div className="mx-auto w-[58mm] space-y-3 print:space-y-0">
                {facturas.map((factura, index) => <div key={factura.id} ref={registarPagina(index)} className="border border-dashed border-slate-300 bg-white p-[2mm] print:border-0" style={index < facturas.length - 1 ? { breakAfter: "page" } : undefined}><FacturaTermica58mm {...propsFactura(factura)} /></div>)}
            </div> : <>
                <div ref={medicaoRef} aria-hidden="true" className="invisible fixed left-[-10000px] top-0 w-[186mm] print:hidden">
                    {facturas.map(factura => <div key={factura.id}><FacturaCompacta {...propsFactura(factura)} empresa={empresa} /></div>)}
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                    <div className="mx-auto w-[210mm] space-y-6 print:w-full print:space-y-0">
                        {paginas.map((pagina, index) => <div key={index} ref={registarPagina(index)} className={pagina.individual ? "bg-white" : "min-h-[297mm] bg-white p-[12mm] shadow-sm ring-1 ring-slate-200 print:min-h-[273mm] print:p-0 print:shadow-none print:ring-0"} style={index < paginas.length + anexos.length - 1 ? { breakAfter: "page" } : undefined}>
                            {pagina.facturas.map(factura => pagina.individual ? <FacturaA4 key={factura.id} {...propsFactura(factura)} /> : <FacturaCompacta key={factura.id} {...propsFactura(factura)} empresa={empresa} />)}
                        </div>)}
                        {anexos.map((anexo, index) => <div key={`anexo-${anexo.factura.id}-${anexo.numero}`} ref={registarPagina(paginas.length + index)} className="min-h-[297mm] bg-white p-[12mm] shadow-sm ring-1 ring-slate-200 print:min-h-[273mm] print:p-0 print:shadow-none print:ring-0" style={index < anexos.length - 1 ? {breakAfter: "page"} : undefined}>
                            <AnexoOrigensFactura {...anexo} empresa={empresa} qrUrl={qrUrls[anexo.factura.id]} />
                        </div>)}
                    </div>
                </div>
            </>}
            </>}
        </div>
    );
}
