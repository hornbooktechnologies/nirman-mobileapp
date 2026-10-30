"use client";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useNativeFieldError } from "@/lib/forms/validation-context";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, ...props }, ref) => {
    const fieldError = useNativeFieldError(props.id);
    const hasError = invalid || Boolean(fieldError);
    return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full min-w-0 resize-y rounded-inner border border-hairline bg-surface px-3.5 py-2.5 text-base sm:text-sm leading-6 text-body shadow-pill outline-none transition-colors duration-150 motion-reduce:transition-none placeholder:text-muted focus:border-lime focus:ring-2 focus:ring-lime/30 disabled:cursor-not-allowed disabled:bg-sunken/60 disabled:opacity-60 sm:px-4 sm:py-3",
        hasError && "border-danger text-danger focus:border-danger focus:ring-danger/30",
        className,
      )}
      {...props}
      aria-invalid={hasError || props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], fieldError?.errorId].filter(Boolean).join(" ") || undefined}
    />
  );
  },
);

Textarea.displayName = "Textarea";
