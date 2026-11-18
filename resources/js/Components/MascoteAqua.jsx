export default function MascoteAqua({ pequeno = false, className = "" }) {
    return (
        <span className={`relative flex shrink-0 items-center justify-center rounded-[13px] bg-[#041A53] shadow-[0_5px_12px_rgba(4,26,83,0.18)] ${pequeno ? "h-8 w-8" : "h-11 w-11"} ${className}`} aria-hidden="true">
            <svg viewBox="0 0 56 56" className={pequeno ? "h-6 w-6" : "h-8 w-8"}>
                <path d="M28 8S40 21 40 31a12 12 0 0 1-24 0C16 21 28 8 28 8Z" fill="#F1F5FB" />
                <circle cx="24" cy="29" r="1.6" fill="#041A53" />
                <circle cx="32" cy="29" r="1.6" fill="#041A53" />
                <path d="M24 34q4 4 8 0" fill="none" stroke="#041A53" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#161A22]" />
        </span>
    );
}
