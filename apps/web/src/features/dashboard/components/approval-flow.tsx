import {
  ClipboardCheck,
  PackageCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { dashboardApprovalItems } from "@/features/dashboard/data/dashboard.data";
import type { DashboardApprovalKind } from "@/features/dashboard/types/dashboard.types";

const approvalIcons: Record<DashboardApprovalKind, LucideIcon> = {
  request: ClipboardCheck,
  team: Users,
  delivery: PackageCheck,
};

export function ApprovalFlow() {
  return (
    <Card padding="none" className="h-full border-hairline/80 shadow-pill">
      <SectionHeader
        title="Approval flow"
        description="Priority operational items in the current workspace."
        actions={
          <Badge variant="warning">
            3 priority · 8 pending
          </Badge>
        }
        className="border-b border-hairline/80 px-5 py-4 sm:px-6"
      />

      <div className="divide-y divide-hairline/60">
        {dashboardApprovalItems.map((item) => {
          const Icon = approvalIcons[item.kind];

          return (
            <article key={item.id} className="flex min-w-0 items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-sunken/30 sm:px-6">
              <span className="grid size-9 shrink-0 place-items-center rounded-inner border border-lime/25 bg-lime-faint text-lime shadow-pill">
                <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[13.5px] font-semibold text-body">
                  {item.title}
                </h3>
                <p className="mt-0.5 truncate text-[12px] leading-4 text-sub">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
