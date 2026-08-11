import { ChartNoAxesCombined, ClipboardCheck, Users } from "lucide-react";
import { ApprovalFlow } from "@/features/dashboard/components/approval-flow";
import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { DashboardOverviewHeader } from "@/features/dashboard/components/dashboard-overview-header";
import { ProjectPortfolio } from "@/features/dashboard/components/project-portfolio";

export function DashboardPage() {
  return (
    <div className="space-y-5 pb-6 animate-fade-in-up">
      <DashboardOverviewHeader />

      <section aria-label="Key operations metrics" className="grid gap-4 md:grid-cols-3">
        <DashboardMetricCard
          label="Workers marked"
          value="146"
          detail="Across 5 active sites"
          trend="+12%222"
          icon={Users}
          tone="success"
        />
        <DashboardMetricCard
          label="Pending approvals"
          value="8"
          detail="Materials, kharchi, expense"
          icon={ClipboardCheck}
          tone="warning"
        />
        <DashboardMetricCard
          label="Site progress"
          value="72%"
          detail="Tower A this week"
          icon={ChartNoAxesCombined}
          progress={70}
        />
      </section>

      <section
        aria-label="Dashboard details"
        className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.85fr)]"
      >
        <ProjectPortfolio />
        <ApprovalFlow />
      </section>
    </div>
  );
}
