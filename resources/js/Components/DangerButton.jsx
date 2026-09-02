export default function DangerButton({
    className = "",
    disabled = false,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={`inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 dark:focus:ring-offset-slate-950 ${className}`}
        >
            {children}
        </button>
    );
}
