import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export default forwardRef(function TextInput({ type = "text", className = "", ...props }, ref) {
    return (
        <input
            {...props}
            ref={ref}
            type={type}
            className={cn(
                "min-h-[44px] rounded-md border-[#DDE2EE] bg-white text-[15px] text-ink placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-800 dark:bg-[#1E232D] dark:text-slate-100 dark:placeholder:text-slate-400",
                className,
            )}
        />
    );
});
