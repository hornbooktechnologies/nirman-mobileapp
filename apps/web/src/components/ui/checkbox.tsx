import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <label className={cn("inline-flex min-w-0 cursor-pointer items-center gap-2.5 text-[12px] font-medium text-body select-none", className)}>
      <input
        ref={ref}
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer rounded-check border border-hairline bg-surface accent-lime transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      {label ? <span className="min-w-0 break-words">{label}</span> : null}
    </label>
  ),
);

Checkbox.displayName = "Checkbox";
