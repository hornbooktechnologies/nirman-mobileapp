import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type IconButtonVariant = "default" | "dark" | "outline" | "ghost" | "lime";

const iconButtonVariants: Record<IconButtonVariant, string> = {
  default: "bg-surface text-body border border-hairline shadow-pill hover:bg-sunken",
  dark: "bg-ink text-surface hover:bg-body",
  outline: "border border-hairline bg-surface/70 text-body hover:bg-sunken",
  ghost: "bg-transparent text-body hover:bg-sunken/80",
  lime: "bg-lime text-lime-ink hover:bg-lime-sub shadow-copper",
};

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: "sm" | "md" | "lg";
}

const iconButtonSizes: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "size-8 rounded-sub text-xs",
  md: "size-10 rounded-inner text-sm",
  lg: "size-12 rounded-inner-lg text-base",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-grid shrink-0 cursor-pointer place-items-center transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        iconButtonVariants[variant],
        iconButtonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
