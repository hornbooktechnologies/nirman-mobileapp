import { SiteStatsCard } from "./SiteStatsCard";
import type { DashboardMetric } from "./primitives";
export function SalesPulse({
  title,
  stats,
}: {
  title: string;
  stats: DashboardMetric[];
}) {
  return (
    <SiteStatsCard title={title} icon="chart-line-variant" stats={stats} />
  );
}
