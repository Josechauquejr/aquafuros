import { Droplets } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import { avisoPenalizacao, estadoDocumento, mesesFactura, moedaDocumento, resumoDocumento, telefonePagamento, volumeDocumento } from "@/lib/facturaDocumento";

const propostas = [
    { id: "institucional", titulo: "1 · Minimalista institucional", resumo: "Cabeçalho limpo, grelha editorial e separadores discretos." },
    { id: "dashboard", titulo: "2 · Dashboard de consumo", resumo: "Consumo, dívida e total alinhados como indicadores centrais." },
    { id: "comportamental", titulo: "3 · Leitura orientada", resumo: "Percurso visual do consumo para a acção de pagamento." },
    { id: "editorial", titulo: "4 · Premium editorial", resumo: "Composição assimétrica, tipografia forte e espaços equilibrados." },
];

function Valor({ rotulo, children, className = "" }) {
    return <div className={className}><p className="text-[7pt] font-medium uppercase tracking-wide text-slate-500">{rotulo}</p><p className="mt-[0.7mm] text-[11pt] font-semibold leading-none tabular-nums">{children}</p></div>;
}

function Ficha({ factura, empresa, variante }) {
    const estado = estadoDocumento(factura);
    const resumo = resumoDocumento(factura);
    const leitura = factura.leitura;
    const meios = [["M-Pesa", empresa?.mpesa_numero, empresa?.mpesa_titular], ["e-Mola", empresa?.emola_numero, empresa?.emola_titular]].filter(([, numero]) => numero);
    const detalhesFinanceiros = [
        resumo.multaEmitida > 0 && `Multa na emissão: ${moedaDocumento(resumo.multaEmitida)}`,
        resumo.acertoLeitura !== 0 && `Acerto: ${moedaDocumento(resumo.acertoLeitura)}`,
        resumo.outrosAjustamentosPosteriores !== 0 && `Ajustamentos: ${moedaDocumento(resumo.outrosAjustamentosPosteriores)}`,
    ].filter(Boolean).join(" · ");
    const detalhe = detalhesFinanceiros ? <p className="text-[7pt] text-slate-600">{detalhesFinanceiros}</p> : null;
    const consumo = <Valor rotulo="Consumo do mês">{volumeDocumento(resumo.consumo)}</Valor>;
    const divida = <Valor rotulo="Valor em dívida">{moedaDocumento(resumo.saldoAnterior)}</Valor>;
    const total = <div className="rounded bg-cyan-800 px-[2.5mm] py-[2mm] text-white"><p className="text-[7pt] font-bold uppercase tracking-wide text-cyan-100">Total a pagar</p><p className="mt-[1mm] whitespace-nowrap text-[17pt] font-bold leading-none tabular-nums">{moedaDocumento(resumo.aPagar)}</p></div>;
    const leituras = <div className="grid grid-cols-2 gap-[2mm] border-t border-slate-200 pt-[1.5mm]"><Valor rotulo="Leitura anterior">{volumeDocumento(leitura?.leitura_anterior)}</Valor><Valor rotulo="Leitura actual">{volumeDocumento(leitura?.leitura_actual)}</Valor></div>;
    const pagamento = <div className="flex min-w-0 gap-[3mm]">{meios.length ? meios.map(([nome, numero, titular]) => <div key={nome} className="min-w-0"><p className="text-[7pt] font-semibold text-slate-500">{nome}</p><p className="text-[9pt] font-bold tabular-nums">{telefonePagamento(numero)}</p>{titular && <p className="truncate text-[7pt] text-slate-500">{titular}</p>}</div>) : <p className="text-[7pt] text-slate-600">Contacte a empresa para obter meios de pagamento.</p>}</div>;
    const aviso = <div className="rounded border border-amber-300 bg-amber-50 px-[2mm] py-[1.5mm] text-[7pt] leading-snug text-slate-800"><p className="mb-[0.5mm] font-bold uppercase tracking-wide">Aviso de multa e corte</p>{avisoPenalizacao}</div>;
    const cliente = <div className="min-w-0"><p className="text-[9pt] font-bold">{factura.cliente?.nome ?? "Cliente removido"}</p><p className="truncate text-[7pt] text-slate-600">{factura.cliente?.numero_cliente} · {[factura.cliente?.endereco, factura.cliente?.bairro, factura.cliente?.numero_contador && `Contador ${factura.cliente.numero_contador}`].filter(Boolean).join(" · ") || "Morada não indicada"}</p><p className="text-[7pt] text-slate-500">{factura.tipo === "consumo_estimado" ? "Consumo estimado" : "Leitura real"}</p></div>;

    const cabecalho = <header className="flex items-center justify-between gap-[3mm] border-b border-slate-300 pb-[1.5mm]">
        <div className="flex min-w-0 items-center gap-[2mm]">{empresa?.logotipoUrl ? <img src={empresa.logotipoUrl} alt={empresa.nome} className="h-[9mm] w-[9mm] shrink-0 object-contain" /> : <Droplets className="h-[7mm] w-[7mm] shrink-0 text-cyan-800" aria-hidden="true" />}<div className="min-w-0"><p className="truncate text-[10pt] font-bold">{empresa?.nome ?? "Aquafuros"}</p><p className="truncate text-[7pt] text-slate-600">{[empresa?.nuit && `NUIT: ${empresa.nuit}`, empresa?.localizacao].filter(Boolean).join(" · ")}</p></div></div>
        <div className="shrink-0 text-right"><p className="text-[7pt] font-semibold uppercase text-slate-500">Factura · {mesesFactura[factura.mes - 1]} {factura.ano}</p><p className="text-[10pt] font-bold text-cyan-900">{factura.numero_factura}</p><span className={`inline-block rounded border px-1.5 py-0.5 text-[7pt] font-semibold ${estado.classes}`}>{estado.label}</span></div>
    </header>;
    const datas = <p className="text-right text-[7pt] text-slate-600">Emitida {formatDate(factura.created_at)} · Vencimento {formatDate(factura.data_vencimento)}</p>;

    return <article className={`box-border h-[99mm] w-[210mm] shrink-0 overflow-hidden bg-white p-[4mm] text-[8pt] leading-tight text-slate-900 ${variante === "institucional" ? "border border-slate-300" : variante === "dashboard" ? "border-t-[2mm] border-cyan-800" : variante === "comportamental" ? "border-l-[2mm] border-amber-500" : "border border-slate-200"}`} style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        {variante === "institucional" && <div className="flex h-full flex-col gap-[2mm]">{cabecalho}<div className="flex items-center justify-between gap-[3mm]">{cliente}{datas}</div><div className="grid grid-cols-[1fr_1fr_1.2fr] items-center gap-[3mm] rounded border border-slate-200 px-[3mm] py-[2mm]">{consumo}{divida}{total}</div>{leituras}{detalhe}<div className="mt-auto grid grid-cols-[1fr_1.2fr] items-end gap-[3mm]">{pagamento}{aviso}</div></div>}

        {variante === "dashboard" && <div className="flex h-full flex-col gap-[2mm]">{cabecalho}<div className="grid grid-cols-[1fr_1fr_1.25fr] gap-[2mm]">{[consumo, divida, total].map((item, i) => <div key={i} className={`flex min-h-[22mm] flex-col justify-center rounded border px-[3mm] py-[2mm] ${i === 0 ? "border-cyan-200 bg-cyan-50 text-cyan-950" : i === 1 ? "border-slate-200 bg-slate-50" : "border-cyan-800 bg-cyan-800 text-white [&_p:first-child]:text-cyan-100"}`}>{item}</div>)}</div><div className="flex items-center justify-between gap-[3mm]">{cliente}{datas}</div>{leituras}{detalhe}<div className="mt-auto grid grid-cols-[1fr_1.4fr] items-end gap-[3mm]">{pagamento}{aviso}</div></div>}

        {variante === "comportamental" && <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-[4mm]"> <div className="flex min-w-0 flex-col gap-[2mm]">{cabecalho}{cliente}<div className="flex flex-1 items-center rounded bg-cyan-50 px-[3mm] py-[2mm]">{consumo}<p className="ml-auto text-[7pt] text-slate-500">{volumeDocumento(leitura?.leitura_anterior)} <span aria-hidden="true">→</span> {volumeDocumento(leitura?.leitura_actual)}</p></div>{leituras}{detalhe}<div className="mt-auto">{pagamento}</div></div><div className="flex flex-col gap-[2mm]">{datas}{divida}{total}{aviso}</div></div>}

        {variante === "editorial" && <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-[5mm]"> <div className="flex min-w-0 flex-col justify-between border-r border-slate-200 pr-[4mm]">{cabecalho}<div>{cliente}<p className="mt-[2mm] text-[7pt] text-slate-500">Leituras do contador</p>{leituras}</div>{pagamento}</div><div className="flex flex-col justify-between">{datas}<div className="grid grid-cols-2 items-center gap-[3mm]"><div className="col-span-2 rounded bg-cyan-50 px-[3mm] py-[2mm] text-cyan-950">{consumo}</div>{divida}{total}</div>{detalhe}{aviso}</div></div>}
    </article>;
}

export default function FacturaPrototipos({ facturas, empresa }) {
    const [propostaActiva, setPropostaActiva] = useState("dashboard");
    const factura = facturas[0];
    if (!factura) return <p className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">Seleccione pelo menos uma factura para comparar os protótipos.</p>;

    return <section className="prototipo-root space-y-6">
        <style>{"@media print { @page { size: 210mm 99mm; margin: 0; } html, body { width: 210mm; height: 99mm; margin: 0; padding: 0; overflow: hidden; } .prototipo-root { width: 210mm; height: 99mm; margin: 0; padding: 0; } .prototipo-root > div { margin: 0 !important; } .prototipo-card { display: none !important; } .prototipo-card[data-active='true'] { display: block !important; width: 210mm; height: 99mm; margin: 0 !important; padding: 0; border: 0; border-radius: 0; box-shadow: none; overflow: visible; } .prototipo-meta, .prototipo-comparacao { display: none !important; } .prototipo-preview { display: block !important; overflow: visible; border: 0; padding: 0; background: white; } .prototipo-scale { transform: none !important; } }"}</style>
        <header className="prototipo-comparacao rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-800">Comparação de layouts · factura {factura.numero_factura}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-950">Quatro propostas de factura mensal</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-600">Diagnóstico: no modelo compacto actual, os indicadores financeiros têm peso semelhante, e o aviso não está integrado com os meios de pagamento. Estas quatro propostas dão prioridade a consumo, dívida e total. Usam dados reais desta factura, mantêm 210 × 99 mm e preservam o aviso oficial sem adicionar prazos ou percentagens.</p>
            <p className="mt-2 text-sm font-medium text-cyan-900">Recomendação: Dashboard de Consumo — reúne os três indicadores numa faixa comparável e mantém leituras e pagamento próximos.</p>
        </header>
        <div className="space-y-5">{propostas.map((proposta) => <article key={proposta.id} data-active={propostaActiva === proposta.id} className="prototipo-card overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="prototipo-meta mb-3 flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{proposta.titulo}{proposta.id === "dashboard" && <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-900">Recomendado</span>}</h2><p className="mt-1 text-xs text-slate-500">{proposta.resumo}</p></div><div className="flex items-center gap-3"><span className="text-[11px] text-slate-500">210 × 99 mm · paisagem</span><button type="button" aria-pressed={propostaActiva === proposta.id} onClick={() => setPropostaActiva(proposta.id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${propostaActiva === proposta.id ? "bg-cyan-800 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{propostaActiva === proposta.id ? "Seleccionada" : "Seleccionar"}</button></div></div>
            <div className="prototipo-preview overflow-x-auto rounded border border-slate-100 bg-slate-50 p-3"><div className="prototipo-scale origin-top-left scale-[0.75] md:scale-100"><Ficha factura={factura} empresa={empresa} variante={proposta.id} /></div></div>
        </article>)}</div>
        <section className="prototipo-comparacao overflow-x-auto rounded-lg border border-slate-200 bg-white p-5"><h2 className="font-semibold">Avaliação heurística</h2><table className="mt-3 w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Proposta</th><th className="px-2 py-2">Indicadores</th><th className="px-2 py-2">Legibilidade</th><th className="px-2 py-2">Impressão mono</th><th className="px-2 py-2">Síntese</th></tr></thead><tbody>{[["Minimalista institucional", "Boa", "Muito boa", "Muito boa", "Clara e conservadora"], ["Dashboard de consumo", "Excelente", "Muito boa", "Boa", "Melhor leitura rápida"], ["Leitura orientada", "Muito boa", "Boa", "Boa", "Orienta pagamento"], ["Premium editorial", "Muito boa", "Muito boa", "Muito boa", "Composição marcante"]].map((linha) => <tr key={linha[0]} className="border-b last:border-0"><th className="py-2 pr-3 font-medium">{linha[0]}</th>{linha.slice(1).map((valor, index) => <td key={index} className="px-2 py-2 text-slate-600">{valor}</td>)}</tr>)}</tbody></table><p className="mt-3 text-xs text-slate-500">A avaliação é uma revisão heurística do layout; legibilidade final deve ser confirmada numa impressão a 100%, incluindo monocromática.</p><button type="button" onClick={() => window.print()} className="mt-4 rounded-md bg-cyan-800 px-4 py-2 text-xs font-semibold text-white">Imprimir proposta seleccionada</button></section>
    </section>;
}
