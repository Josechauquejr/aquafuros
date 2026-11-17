export default function InputLabel({ htmlFor, value, children, className = "" }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-sm font-semibold text-ink dark:text-slate-100 ${className}`}
        >
            {value || children}
        </label>
    );
}
