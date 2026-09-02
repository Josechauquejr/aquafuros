export default function PrimaryButton({
    className = "",
    disabled = false,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={`inline-flex items-center rounded-md border border-transparent bg-cyan-700 px-4 py-2 text-xs font-semibold uppercase tracking-normal text-white transition hover:bg-cyan-800 focus:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white active:bg-cyan-900 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 dark:focus:ring-offset-slate-950 ${className}`}
        >
            {children}
        </button>
    );
}
