import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Números decimais (consumo em m³, leituras) com vírgula em vez de ponto —
 * o padrão pt-MZ usado no resto da app (formatCurrency, datas). Substitui
 * chamadas directas a Number(...).toFixed(2), que ficam sempre com ponto
 * independentemente da localidade.
 */
export function formatNumero(value, casas = 2) {
    const numero = Number(value) || 0;
    return numero.toLocaleString("pt-PT", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
    });
}

export function formatCurrency(value) {
    const amount = Number(value) || 0;
    return `MZN ${amount.toLocaleString("pt-PT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

export function formatDateTime(value) {
    if (!value) return "—";
    const data = new Date(value);
    return `${data.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })} às ${data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
}
