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
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
    ]);

    const canvas = await html2canvas(elemento, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
    });

    const paginaLargura = formato === "58mm" ? 58 : 210;
    const paginaAltura = formato === "58mm" ? 174 : 297;

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [paginaLargura, paginaAltura],
    });

    const escalaPxParaMm = paginaLargura / canvas.width;
    const alturaImagemMm = canvas.height * escalaPxParaMm;

    if (alturaImagemMm <= paginaAltura) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paginaLargura, alturaImagemMm);
    } else {
        // Conteúdo mais alto que uma página — fatia o canvas em blocos, uma
        // página do PDF por bloco.
        const alturaPaginaPx = Math.floor(paginaAltura / escalaPxParaMm);
        let posicaoY = 0;
        let primeira = true;

        while (posicaoY < canvas.height) {
            const alturaFatia = Math.min(alturaPaginaPx, canvas.height - posicaoY);

            const canvasFatia = document.createElement("canvas");
            canvasFatia.width = canvas.width;
            canvasFatia.height = alturaFatia;
            canvasFatia
                .getContext("2d")
                .drawImage(canvas, 0, posicaoY, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

            if (!primeira) pdf.addPage([paginaLargura, paginaAltura]);
            pdf.addImage(canvasFatia.toDataURL("image/png"), "PNG", 0, 0, paginaLargura, alturaFatia * escalaPxParaMm);

            posicaoY += alturaFatia;
            primeira = false;
        }
    }

    pdf.save(nomeFicheiro);
}
