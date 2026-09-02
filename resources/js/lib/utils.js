import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
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
