export function mesReferenciaActual(data = new Date()) {
    const mes = new Date(data.getFullYear(), data.getMonth() - (data.getDate() < 11 ? 1 : 0), 1);

    return { mes: mes.getMonth() + 1, ano: mes.getFullYear() };
}