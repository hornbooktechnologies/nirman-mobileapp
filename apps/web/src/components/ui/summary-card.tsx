import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatsCard({ label, value, detail, trend, className }: { label: string; value: ReactNode; detail?: string; trend?: ReactNode; className?: string }) {
  return (
    <Card padding="compact" className={cn("min-h-32 flex flex-col justify-between border-hairline/80 shadow-pill hover:shadow-card transition-shadow", className)}>
      <CardHeader className="mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-sub">{label}</p>
      </CardHeader>
      <CardContent>
        <div className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-body tabular-nums">{value}</div>
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
          {detail ? <p className="min-w-0 text-[12px] leading-5 text-sub">{detail}</p> : <span />}
          {trend ? <Badge variant="success">{trend}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCard({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <Card className={cn("min-h-44", className)}>
      <CardHeader>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description ? <p className="mt-1 text-[13px] leading-5 text-sub">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
