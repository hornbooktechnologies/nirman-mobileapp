import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import type { RoleDashboardResponse } from "@nirman-app/shared";
import { Card, SectionHeader } from "@/components/ui";
import { dashboardActions, dashboardMetrics } from "../dashboard-rules";
import { DashboardMetricCard } from "./dashboard-metric-card";
export function DashboardSnapshot({
  data,
  permissions,
  archived,
}: {
  data: RoleDashboardResponse;
  permissions: readonly string[];
  archived: boolean;
}) {
  const metrics = dashboardMetrics(data, permissions);
  const actions = dashboardActions(data, permissions, archived);
  const generated = new Date(data.generatedAt);
  return (
    <section className="space-y-4" aria-label="Project summary">
      <div>
        <SectionHeader
          title="Project activity"
          description={data.project.name}
        />
        <p className="mt-1 text-[13px] text-sub">
          {Number.isNaN(generated.getTime())
            ? "Summary timestamp unavailable"
            : `Updated ${generated.toLocaleString("en-IN", { timeZone: "Asia/Calcutta" })} (Asia/Calcutta)`}
          . Daily periods use the dashboard reporting timezone.
        </p>
      </div>
      {metrics.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <DashboardMetricCard
              key={metric.label}
              {...metric}
              icon={ClipboardCheck}
            />
          ))}
        </div>
      ) : (
        <Card>
          No supported overview summaries are available with your effective
          project permissions.
        </Card>
      )}
      {actions.length ? (
        <Card className="space-y-3">
          <SectionHeader
            title="Quick access"
            description="Open a workspace to review records and its available actions."
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                className="inline-flex min-h-11 items-center rounded-inner border border-hairline px-4 text-sm font-medium text-body hover:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"
                key={action.label}
                href={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}
