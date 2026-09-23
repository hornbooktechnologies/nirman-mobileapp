"use client";
import { useState } from "react";
import type { RoleDashboardResponse } from "@nirman-app/shared";
import { Button } from "@/components/ui";
import { DashboardSnapshot } from "@/features/dashboard/components/dashboard-snapshot";
import { DashboardOverviewHeader } from "@/features/dashboard/components/dashboard-overview-header";
import { PendingQueueCard } from "@/features/dashboard/components/approval-flow";
import { ProjectPortfolio } from "@/features/dashboard/components/project-portfolio";
import { ProjectWorkspaceNavigation } from "@/features/projects/components/project-workspace-navigation";
const data: RoleDashboardResponse = {
  profile: "OWNER",
  roleName: "Fixture owner",
  organizationId: "fixture",
  project: {
    id: "fixture-site",
    name: "Long project name for verifying dashboard context across narrow screens and project workspaces",
    projectCode: "TEST",
  },
  generatedAt: "2026-09-22T06:00:00Z",
  projectAccessScope: "ALL",
  availableSections: ["WORKFLOW", "PROGRESS", "GALLERY"],
  quickActions: ["MARK_ATTENDANCE", "REQUEST_MATERIAL", "VIEW_PROJECT"],
  site: null,
  finance: null,
  workflow: {
    pendingMaterialApprovals: 0,
    overdueMaterialRequests: 12,
    pendingExpenses: null,
    pendingExpenseAmount: null,
  },
  progress: { overallPercentage: 72, updatedStages: 3, latestUpdateAt: null },
  gallery: { recentUpdates: 2, latestCapturedAt: null },
  sales: null,
};
export function DashboardPreview() {
  const [archived, setArchived] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const permissions = restricted
    ? ["materials:read" as const]
    : ([
        "projects:read",
        "workers:read",
        "attendance:read",
        "attendance:mark",
        "materials:read",
        "materials:create",
        "expenses:read",
        "progress:read",
        "gallery:read",
      ] as const);
  const project = {
    ...data.project,
    status: archived ? ("ARCHIVED" as const) : ("ACTIVE" as const),
    permissions: [...permissions],
    roleLabel: null,
    permissionMode: "CUSTOM" as const,
    isDefault: true,
  };
  return (
    <main className="space-y-5 p-4">
      <p className="text-sm text-sub">
        Development fixture: synthetic data, no API or operational mutations.
      </p>
      <DashboardOverviewHeader />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setArchived(!archived)}>
          {archived ? "Show active project" : "Show archived project"}
        </Button>
        <Button onClick={() => setRestricted(!restricted)}>
          {restricted ? "Show full access" : "Show restricted access"}
        </Button>
      </div>
      <ProjectPortfolio
        projects={[project]}
        selectedId={project.id}
        onSelect={() => undefined}
      />
      <ProjectWorkspaceNavigation project={project} />
      <DashboardSnapshot
        data={data}
        permissions={permissions}
        archived={archived}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <PendingQueueCard
          title="Pending record fixture"
          statusLabel="pending final"
          loading={false}
          error={false}
          retry={() => undefined}
          listHref="#queue"
          recordHref={(id) => `#${id}`}
          page={{
            total: 31,
            items: [
              {
                id: "record",
                organizationId: "fixture",
                projectId: project.id,
                title:
                  "Long material request awaiting an authorized reviewer at the selected construction project",
                status: "PENDING_FINAL",
              },
            ],
          }}
        />
        <PendingQueueCard
          title="Unavailable queue fixture"
          statusLabel="pending"
          loading={false}
          error
          retry={() => undefined}
          listHref="#unavailable"
          recordHref={(id) => `#${id}`}
        />
        <PendingQueueCard
          title="Empty queue fixture"
          statusLabel="pending"
          loading={false}
          error={false}
          page={{ total: 0, items: [] }}
          retry={() => undefined}
          listHref="#empty"
          recordHref={(id) => `#${id}`}
        />
      </div>
    </main>
  );
}
