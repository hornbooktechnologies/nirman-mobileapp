import { forwardRef, type HTMLAttributes } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ children, className, onRemove, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-sub border border-lime/30 bg-lime-faint px-2.5 py-0.5 text-xs font-semibold leading-4 text-lime",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 break-words">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="grid size-4 shrink-0 cursor-pointer place-items-center rounded-full text-lime transition-colors hover:bg-lime/20 focus:outline-none focus:ring-1 focus:ring-lime"
          onClick={onRemove}
          aria-label="Remove filter"
        >
          <X size={11} strokeWidth={2.2} />
        </button>
      ) : null}
    </span>
  ),
);

Chip.displayName = "Chip";
