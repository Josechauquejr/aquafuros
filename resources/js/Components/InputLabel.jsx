export default function InputLabel({ htmlFor, value, children, className = "" }) {
    return (
        <label
            htmlFor={htmlFor}
            className={`block text-sm font-medium text-slate-700 dark:text-slate-200 ${className}`}
        >
            {value || children}
        </label>
    );
}
