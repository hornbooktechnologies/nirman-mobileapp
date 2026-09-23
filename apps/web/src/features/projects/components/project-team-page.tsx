"use client";

import { projectListReturnHref } from "../project-list-query";
import { useRouter, useSearchParams } from "next/navigation";
import type { PermissionKey } from "@nirman-app/shared";
import { LoadingScreen } from "@/components/common";
import { Card, PageHeader, TabButton, Tabs } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectMembersPanel } from "@/features/projects/components/project-members-panel";

import { useProject } from "@/features/projects/hooks/use-projects";
import { ProjectWorkersPanel } from "@/features/workers/components/project-workers-panel";

type TeamTab = "members" | "workers";

export function ProjectTeamPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { activeOrganizationId } = useAuth();
  const organizationId = activeOrganizationId ?? "";
  const project = useProject(organizationId, projectId);
  const params = useSearchParams();
  const effectivePermissions = (project.data?.currentUserAccess?.permissions ??
    []) as PermissionKey[];
  const canReadMembers = effectivePermissions.includes("project-members:read");
  const canReadWorkers = effectivePermissions.includes("workers:read");
  const activeTab =
    params.get("tab") === "workers" || (!canReadMembers && canReadWorkers)
      ? "workers"
      : "members";
  function setActiveTab(tab: TeamTab) {
    const next = new URLSearchParams(params.toString());
    next.set("tab", tab);
    router.replace(`/projects/${projectId}/team?${next}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${project.data?.name ?? "Project"} Team`}
        description="Manage login members and workforce allocations for this project."
        onBack={() =>
          router.push(
            `/projects/${projectId}?returnTo=${encodeURIComponent(projectListReturnHref(params.get("returnTo"), organizationId))}`,
          )
        }
      />

      {!organizationId ? (
        <Card className="text-[13px] text-body">
          No active organization is available.
        </Card>
      ) : project.isLoading ? (
        <LoadingScreen message="Loading project team" />
      ) : project.isError ? (
        <Card className="text-[13px] text-red-600">
          Unable to load this project or you no longer have access.
        </Card>
      ) : (
        <>
          <Tabs>
            <TabButton
              active={activeTab === "members"}
              disabled={!canReadMembers}
              onClick={() => setActiveTab("members")}
            >
              Members
            </TabButton>
            <TabButton
              active={activeTab === "workers"}
              disabled={!canReadWorkers}
              onClick={() => setActiveTab("workers")}
            >
              Workers
            </TabButton>
          </Tabs>

          {activeTab === "members" ? (
            canReadMembers ? (
              <ProjectMembersPanel
                organizationId={organizationId}
                projectId={projectId}
                projectStatus={project.data?.status ?? "DRAFT"}
                effectivePermissions={effectivePermissions}
              />
            ) : (
              <Card className="text-[13px] text-body">
                Your project permission matrix does not include Team access.
              </Card>
            )
          ) : canReadWorkers ? (
            <ProjectWorkersPanel
              organizationId={organizationId}
              projectId={projectId}
              effectivePermissions={effectivePermissions}
            />
          ) : (
            <Card className="text-[13px] text-body">
              Your project permission matrix does not include Workers access.
            </Card>
          )}
        </>
      )}
    </div>
  );
}
