import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid}
      className={cn(
        "min-h-9 w-full min-w-0 rounded-inner border border-hairline bg-surface px-3 py-2 text-[12px] leading-5 text-body shadow-pill outline-none transition-all duration-150 placeholder:text-muted focus:border-lime focus:ring-2 focus:ring-lime/30 disabled:cursor-not-allowed disabled:bg-sunken/60 disabled:opacity-60 sm:px-3.5",
        invalid && "border-danger text-danger focus:border-danger focus:ring-danger/30",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
