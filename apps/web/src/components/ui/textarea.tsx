import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid}
      className={cn(
        "min-h-28 w-full min-w-0 resize-y rounded-inner border border-hairline bg-surface px-3.5 py-2.5 text-[12px] leading-5 text-body shadow-pill outline-none transition-all duration-150 placeholder:text-muted focus:border-lime focus:ring-2 focus:ring-lime/30 disabled:cursor-not-allowed disabled:bg-sunken/60 disabled:opacity-60 sm:px-4 sm:py-3",
        invalid && "border-danger text-danger focus:border-danger focus:ring-danger/30",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
