import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid = false, children, ...props }, ref) => (
    <span className="relative block min-w-0">
      <select
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          "min-h-11 sm:min-h-10 w-full min-w-0 cursor-pointer appearance-none rounded-inner border border-hairline bg-surface py-2 pl-3 pr-8 text-base sm:text-sm leading-6 text-body shadow-pill outline-none transition-colors duration-150 motion-reduce:transition-none focus:border-lime focus:ring-2 focus:ring-lime/30 disabled:cursor-not-allowed disabled:bg-sunken/60 disabled:opacity-60",
          invalid && "border-danger text-danger focus:border-danger focus:ring-danger/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sub"
        aria-hidden="true"
      />
    </span>
  ),
);

Select.displayName = "Select";
