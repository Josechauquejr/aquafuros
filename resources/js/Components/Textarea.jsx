import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export default forwardRef(function Textarea({ className = "", ...props }, ref) {
    return (
        <textarea
            {...props}
            ref={ref}
            className={cn(
                "rounded-md border-[#DDE2EE] bg-white text-[15px] text-ink placeholder:text-slate-400 dark:border-slate-800 dark:bg-[#1E232D] dark:text-slate-100 dark:placeholder:text-slate-400",
                className,
            )}
        />
    );
});
