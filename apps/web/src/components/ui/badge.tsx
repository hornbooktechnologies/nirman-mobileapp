import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "dark"
  | "lime"
  | "pale"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-sunken text-sub border border-hairline/50",
  dark: "bg-ink text-surface border border-transparent",
  lime: "bg-lime text-lime-ink border border-transparent shadow-pill",
  pale: "bg-lime-faint text-lime border border-lime/20",
  outline: "border border-hairline bg-surface/50 text-sub",
  success: "border border-success/30 bg-success/10 text-success",
  warning: "border border-warning/30 bg-warning/10 text-warning",
  danger: "border border-danger/30 bg-danger/10 text-danger",
  info: "border border-info/30 bg-info/10 text-info",
  purple: "border border-purple/30 bg-purple/10 text-purple",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex min-h-6 max-w-full items-center rounded-sub px-2.5 py-0.5 text-[11px] font-semibold leading-4 tracking-[0.2px]",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  ),
);

Badge.displayName = "Badge";
