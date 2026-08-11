import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NotificationVariant = "success" | "danger" | "warning" | "info";

export interface NotificationProps {
  title: string;
  description?: ReactNode;
  variant?: NotificationVariant;
  onClose?: () => void;
  action?: ReactNode;
  className?: string;
}

const variantStyles: Record<
  NotificationVariant,
  { container: string; iconContainer: string; icon: typeof CheckCircle2 }
> = {
  success: {
    container: "border-success/30 bg-success/10 text-body",
    iconContainer: "bg-success/20 text-success",
    icon: CheckCircle2,
  },
  danger: {
    container: "border-danger/30 bg-danger/10 text-body",
    iconContainer: "bg-danger/20 text-danger",
    icon: AlertCircle,
  },
  warning: {
    container: "border-warning/30 bg-warning/10 text-body",
    iconContainer: "bg-warning/20 text-warning",
    icon: AlertTriangle,
  },
  info: {
    container: "border-info/30 bg-info/10 text-body",
    iconContainer: "bg-info/20 text-info",
    icon: Info,
  },
};

export function NotificationBanner({
  title,
  description,
  variant = "info",
  onClose,
  action,
  className,
}: NotificationProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      role="alert"
      className={cn(
        "relative flex min-w-0 items-start gap-3 rounded-inner border p-4 shadow-pill transition-all animate-fade-in-up",
        styles.container,
        className,
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-sub",
          styles.iconContainer,
        )}
      >
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <h4 className="text-[13.5px] font-semibold text-body leading-5">{title}</h4>
        {description ? (
          <div className="mt-1 text-[12.5px] leading-5 text-sub break-words">
            {description}
          </div>
        ) : null}
        {action ? <div className="mt-3 flex items-center gap-2">{action}</div> : null}
      </div>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-sub text-sub hover:bg-sunken hover:text-body focus:outline-none"
          aria-label="Dismiss notification"
        >
          <X size={14} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
