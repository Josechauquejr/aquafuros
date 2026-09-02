export default function SecondaryButton({ className = "", children, ...props }) {
    return (
        <button
            {...props}
            className={`inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-normal text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950 ${className}`}
        >
            {children}
        </button>
    );
}
