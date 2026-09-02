import { forwardRef } from "react";

export default forwardRef(function TextInput(
    { type = "text", className = "", ...props },
    ref,
) {
    return (
        <input
            {...props}
            ref={ref}
            type={type}
            className={`rounded-md border-slate-300 bg-white text-slate-950 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${className}`}
        />
    );
});
