import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// A formatação pt-MZ vive em lib/format.js; os nomes antigos continuam a
// funcionar para as páginas que ainda não os trocaram.
export {
    formatNumero,
    formatMoney,
    formatMoney as formatCurrency,
    formatVolume,
    formatDate,
    formatDateTime,
    formatPhone,
    phoneDigits,
} from "./format";
