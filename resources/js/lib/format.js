/**
 * Formatação única (pt-MZ) — dinheiro, volume, datas e telefones. Nenhuma
 * página deve formatar valores à mão (toFixed, toLocaleString...).
 *
 * O agrupamento de milhares é feito à mão: o `pt-PT` do Intl não agrupa
 * números de 4 dígitos ("1400,00" ao lado de "40 850,00"), e aqui queremos
 * sempre "1 400,00".
 */

const NBSP = " ";

export function formatNumero(value, casas = 2) {
    const numero = Number(value);
    const seguro = Number.isFinite(numero) ? numero : 0;
    const [inteira, decimal] = Math.abs(seguro).toFixed(casas).split(".");
    const agrupada = inteira.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    const sinal = seguro < 0 && Number(Math.abs(seguro).toFixed(casas)) !== 0 ? "-" : "";

    return `${sinal}${agrupada}${decimal ? `,${decimal}` : ""}`;
}

export function formatMoney(value) {
    return `MZN ${formatNumero(value, 2)}`;
}

export function formatVolume(value) {
    return `${formatNumero(value, 2)}${NBSP}m³`;
}

const opcoesData = { day: "2-digit", month: "2-digit", year: "numeric" };

export function formatDate(value) {
    if (!value) return "—";
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return "—";
    return data.toLocaleDateString("pt-PT", opcoesData);
}

export function formatDateTime(value) {
    if (!value) return "—";
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return "—";
    return `${data.toLocaleDateString("pt-PT", opcoesData)} às ${data.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
    })}`;
}

/** Móvel "84 562 6156", fixo "21 745 220"; outros formatos ficam como vêm. */
export function formatPhone(value) {
    if (!value) return "—";
    let digitos = String(value).replace(/\D+/g, "");
    if (digitos.startsWith("258") && digitos.length > 9) digitos = digitos.slice(3);

    if (digitos.length === 9) {
        return `${digitos.slice(0, 2)} ${digitos.slice(2, 5)} ${digitos.slice(5)}`;
    }
    if (digitos.length === 8) {
        return `${digitos.slice(0, 2)} ${digitos.slice(2, 5)} ${digitos.slice(5)}`;
    }
    return String(value);
}

/** Só os dígitos, sem indicativo — para hrefs `tel:`. */
export function phoneDigits(value) {
    let digitos = String(value ?? "").replace(/\D+/g, "");
    if (digitos.startsWith("258") && digitos.length > 9) digitos = digitos.slice(3);
    return digitos;
}
