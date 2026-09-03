/**
 * Gera um PDF a partir do próprio elemento DOM apresentado no ecrã — o
 * ficheiro descarregado fica exactamente no mesmo estado (mesmo formato,
 * A4 ou 58mm, e os mesmos dados) que estava a ser mostrado ao clicar.
 *
 * Fatia o canvas em várias páginas se o conteúdo for mais alto do que uma
 * única página do formato escolhido.
 *
 * html2canvas e jsPDF (~600KB) só são carregados quando esta função é
 * chamada (ao clicar em "Descarregar"), não no carregamento da página.
 */
export async function baixarElementoComoPdf(elemento, nomeFicheiro, formato = "a4") {
    const { pdf } = await gerarPdfDeElementos([elemento], formato);
    pdf.save(nomeFicheiro);
}

/**
 * Versão em lote: um documento por elemento do array, cada um a começar
 * numa página nova do mesmo PDF — usada nas páginas de impressão em lote
 * (várias facturas/recibos descarregados como um único ficheiro).
 */
export async function baixarElementosComoPdf(elementos, nomeFicheiro, formato = "a4") {
    const { pdf } = await gerarPdfDeElementos(elementos, formato);
    pdf.save(nomeFicheiro);
}

async function gerarPdfDeElementos(elementos, formato) {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
    ]);

    const paginaLargura = formato === "58mm" ? 58 : 210;
    const paginaAltura = formato === "58mm" ? 174 : 297;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [paginaLargura, paginaAltura],
    });

    let primeiraPaginaDoPdf = true;

    for (const elemento of elementos) {
        if (!elemento) continue;

        const canvas = await html2canvas(elemento, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
        });

        const escalaPxParaMm = paginaLargura / canvas.width;
        const alturaImagemMm = canvas.height * escalaPxParaMm;

        if (alturaImagemMm <= paginaAltura) {
            if (!primeiraPaginaDoPdf) pdf.addPage([paginaLargura, paginaAltura]);
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paginaLargura, alturaImagemMm);
            primeiraPaginaDoPdf = false;
            continue;
        }

        // Este elemento sozinho já é mais alto que uma página — fatia-o
        // (ex.: uma factura invulgarmente longa dentro de um lote).
        const alturaPaginaPx = Math.floor(paginaAltura / escalaPxParaMm);
        let posicaoY = 0;

        while (posicaoY < canvas.height) {
            const alturaFatia = Math.min(alturaPaginaPx, canvas.height - posicaoY);

            const canvasFatia = document.createElement("canvas");
            canvasFatia.width = canvas.width;
            canvasFatia.height = alturaFatia;
            canvasFatia
                .getContext("2d")
                .drawImage(canvas, 0, posicaoY, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

            if (!primeiraPaginaDoPdf) pdf.addPage([paginaLargura, paginaAltura]);
            pdf.addImage(canvasFatia.toDataURL("image/png"), "PNG", 0, 0, paginaLargura, alturaFatia * escalaPxParaMm);

            posicaoY += alturaFatia;
            primeiraPaginaDoPdf = false;
        }
    }

    return { pdf };
}
