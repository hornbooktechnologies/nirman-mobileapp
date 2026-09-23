import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
export function DashboardOverviewHeader({ actions }: { actions?: ReactNode }) {
  return (
    <PageHeader
      title="Operations overview"
      description="Pending work and project activity within your current access."
      actions={actions}
    />
  );
}
