import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone =
  | "neutral"
  | "active"
  | "pending"
  | "inactive"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const statusVariants: Record<StatusTone, BadgeProps["variant"]> = {
  neutral: "default",
  active: "lime",
  pending: "dark",
  inactive: "outline",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  purple: "purple",
};

const toneDotColors: Record<StatusTone, string> = {
  neutral: "bg-sub",
  active: "bg-lime-ink animate-pulse",
  pending: "bg-surface",
  inactive: "bg-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  purple: "bg-purple",
};

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  tone?: StatusTone;
  showDot?: boolean;
}

export function StatusBadge({
  tone = "neutral",
  showDot = true,
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[tone]} className={cn("gap-1.5", className)} {...props}>
      {showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", toneDotColors[tone])}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Badge>
  );
}
