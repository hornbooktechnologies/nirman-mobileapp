import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

type DashboardMetricTone = "accent" | "success" | "warning";

const toneStyles: Record<
  DashboardMetricTone,
  { accent: string; icon: string; progress: string }
> = {
  accent: {
    accent: "bg-lime",
    icon: "bg-lime-faint text-lime border-lime/20",
    progress: "bg-lime",
  },
  success: {
    accent: "bg-success",
    icon: "bg-success/10 text-success border-success/20",
    progress: "bg-success",
  },
  warning: {
    accent: "bg-warning",
    icon: "bg-warning/10 text-warning border-warning/20",
    progress: "bg-warning",
  },
};

interface DashboardMetricCardProps {
  label: string;
  value: ReactNode;
  detail: string;
  icon: LucideIcon;
  tone?: DashboardMetricTone;
  trend?: string;
  progress?: number;
}

export function DashboardMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "accent",
  trend,
  progress,
}: DashboardMetricCardProps) {
  const styles = toneStyles[tone];
  const safeProgress =
    typeof progress === "number" ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <Card
      padding="none"
      className="relative flex min-h-[156px] flex-col justify-between border-hairline/80 shadow-pill hover:shadow-card transition-all duration-200"
    >
      <span
        className={cn(
          "absolute inset-y-3.5 left-0 w-[3px] rounded-r-full",
          styles.accent,
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4.5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-sub">
            {label}
          </p>
          <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-body tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-inner border shadow-pill",
            styles.icon,
          )}
        >
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-2 px-5 pb-4.5">
        {safeProgress !== null ? (
          <div
            className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-sunken"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
          >
            <div
              className={cn("h-full rounded-full transition-all duration-500", styles.progress)}
              style={{ width: `${safeProgress}%` }}
            />
          </div>
        ) : null}
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="min-w-0 text-[12px] leading-5 text-sub">{detail}</p>
          {trend ? (
            <Badge variant="success">{trend}</Badge>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
