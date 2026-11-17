export default function InputError({ message, className = "" }) {
    if (!message) {
        return null;
    }

    return <p className={`text-sm font-medium text-rose-600 dark:text-rose-300 ${className}`}>{message}</p>;
}
