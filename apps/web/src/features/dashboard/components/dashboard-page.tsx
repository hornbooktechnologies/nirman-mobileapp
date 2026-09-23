"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RoleDashboardResponse } from "@nirman-app/shared";
import {
  Button,
  Card,
  LoadingState,
  NotificationBanner,
  SectionHeader,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { ProjectWorkspaceNavigation } from "@/features/projects/components/project-workspace-navigation";
import { api } from "@/lib/api/api-client";
import { assertDashboardScope, dashboardQueryKey } from "../dashboard-rules";
import { DashboardOverviewHeader } from "./dashboard-overview-header";
import { ProjectPortfolio } from "./project-portfolio";
import { ApprovalFlow } from "./approval-flow";
import { DashboardSnapshot } from "./dashboard-snapshot";
export function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading dashboard" />}>
      <DashboardWorkspace />
    </Suspense>
  );
}
function DashboardWorkspace() {
  const { user, activeOrganizationId, hasPermission } = useAuth();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const organizationId = activeOrganizationId ?? "";
  const allowed = hasPermission("dashboards:read");
  const access = useProjectAccess(allowed ? activeOrganizationId : null);
  const requested = params.get("projectId");
  const foreign = Boolean(
    params.get("organizationId") &&
    params.get("organizationId") !== organizationId,
  );
  const projects =
    !foreign &&
    access.isSuccess &&
    access.data.organizationId === organizationId
      ? access.data.projects
      : [];
  const project = requested
    ? projects.find((item) => item.id === requested)
    : (projects.find((item) => item.isDefault && item.status !== "ARCHIVED") ??
      projects.find((item) => item.status !== "ARCHIVED") ??
      projects[0]);
  const permissions = project?.permissions ?? [];
  const snapshot = useQuery({
    queryKey: dashboardQueryKey(
      user?.id ?? "",
      organizationId,
      project?.id ?? "",
      permissions,
    ),
    queryFn: async ({ signal }) =>
      assertDashboardScope(
        await api.get<RoleDashboardResponse>(
          `/organizations/${organizationId}/projects/${project!.id}/dashboard`,
          { signal },
        ),
        organizationId,
        project!.id,
      ),
    enabled: Boolean(
      user &&
      organizationId &&
      allowed &&
      project &&
      access.isSuccess &&
      !foreign,
    ),
    retry: false,
  });
  useEffect(() => {
    if (!allowed || !project || foreign || requested) return;
    window.history.replaceState(
      null,
      "",
      `/dashboard?${new URLSearchParams({ organizationId, projectId: project.id })}`,
    );
  }, [allowed, project, foreign, requested, organizationId]);
  function selectProject(projectId: string) {
    window.history.replaceState(
      null,
      "",
      `/dashboard?${new URLSearchParams({ organizationId, projectId })}`,
    );
  }
  const refresh = () => {
    void access.refetch();
    if (project)
      void queryClient.invalidateQueries({
        queryKey: ["dashboard", user?.id ?? "", organizationId, project.id],
      });
  };
  if (!organizationId)
    return (
      <div className="space-y-4">
        <DashboardOverviewHeader />
        <Card>
          <SectionHeader
            title="Choose an organization"
            description="Project operations appear after you select an organization you can access."
          />
          {hasPermission("platform-organizations:read") ||
          hasPermission("organizations:read") ? (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href="/organizations"
            >
              Open organizations
            </Link>
          ) : null}
        </Card>
      </div>
    );
  if (!allowed)
    return (
      <div className="space-y-4">
        <DashboardOverviewHeader />
        <Card>
          <SectionHeader
            title="Dashboard access unavailable"
            description="Your organization role does not include dashboard access. Use the available modules in navigation."
          />
        </Card>
      </div>
    );
  if (foreign)
    return (
      <NotificationBanner
        variant="warning"
        title="Organization context changed"
        description="Switch to the linked organization or choose a project in your current organization."
        action={
          <Button onClick={() => selectProject("")}>
            Use current organization
          </Button>
        }
      />
    );
  return (
    <div className="space-y-5 pb-6">
      <DashboardOverviewHeader
        actions={
          <Button
            variant="outline"
            disabled={access.isFetching || snapshot.isFetching}
            onClick={refresh}
          >
            Refresh overview
          </Button>
        }
      />
      {access.isPending ? (
        <LoadingState label="Loading project access" />
      ) : access.isError ? (
        <NotificationBanner
          variant="danger"
          title="Project access could not be loaded"
          action={
            <Button onClick={() => void access.refetch()}>Retry access</Button>
          }
        />
      ) : (
        <>
          <ProjectPortfolio
            projects={projects}
            selectedId={project?.id ?? ""}
            onSelect={selectProject}
          />
          {!projects.length ? (
            <Card>
              <p>No accessible projects are available in this organization.</p>
              {hasPermission("projects:create") ? (
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href="/projects/new"
                >
                  Create a project
                </Link>
              ) : (
                <p className="mt-2 text-sm text-sub">
                  Ask an organization administrator for project access.
                </p>
              )}
            </Card>
          ) : !project ? (
            <NotificationBanner
              variant="warning"
              title="Project unavailable"
              description="This link is not available with your current project access. Choose an accessible project above."
            />
          ) : (
            <>
              <ProjectWorkspaceNavigation project={project} />
              {project.status === "ARCHIVED" ? (
                <NotificationBanner
                  variant="info"
                  title="Archived project"
                  description="View retained records here. Creation shortcuts are unavailable."
                />
              ) : null}
              <ApprovalFlow
                key={`${user?.id}:${organizationId}:${project.id}:${permissions.join("|")}`}
                userId={user?.id ?? ""}
                organizationId={organizationId}
                projectId={project.id}
                permissions={permissions}
              />
              {snapshot.isPending ? (
                <LoadingState label="Loading project summary" />
              ) : snapshot.isError ? (
                <NotificationBanner
                  variant="warning"
                  title="Project summary unavailable"
                  description="No totals are shown because the summary request failed. Project links and independently loaded pending records remain available."
                  action={
                    <Button onClick={() => void snapshot.refetch()}>
                      Retry summary
                    </Button>
                  }
                />
              ) : snapshot.data ? (
                <DashboardSnapshot
                  data={snapshot.data}
                  permissions={permissions}
                  archived={project.status === "ARCHIVED"}
                />
              ) : null}

              <Card className="space-y-2">
                <SectionHeader title="Attendance and financial totals" />
                <p className="text-sm text-sub">
                  These totals are unavailable on this overview. Open Attendance
                  for primary-project working-day totals, and Wages or Kharchi
                  for their authoritative calculations. No organization-wide
                  total is inferred from this project.
                </p>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
