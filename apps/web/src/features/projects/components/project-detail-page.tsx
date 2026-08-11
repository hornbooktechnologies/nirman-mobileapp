"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, PageHeader, StatusBadge } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import {
  ProjectFormFields,
  emptyProjectForm,
  normalizeProjectInput,
} from "@/features/projects/components/project-form-fields";
import { ProjectMembersPanel } from "@/features/projects/components/project-members-panel";
import { ProjectWorkersPanel } from "@/features/workers/components/project-workers-panel";
import {
  useArchiveProject,
  useProject,
  useRestoreProject,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects";
import type { ProjectInput } from "@/features/projects/types/projects.types";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  ON_HOLD: "warning",
  COMPLETED: "success",
  ARCHIVED: "inactive",
} as const;

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizations = useOrganizations();
  const [organizationId, setOrganizationId] = useState(
    searchParams.get("organizationId") ?? "",
  );
  const project = useProject(organizationId, projectId);
  const updateProject = useUpdateProject(organizationId, projectId);
  const archiveProject = useArchiveProject(organizationId, projectId);
  const restoreProject = useRestoreProject(organizationId, projectId);
  const [form, setForm] = useState<ProjectInput>(emptyProjectForm);

  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) {
      setOrganizationId(organizations.data[0].id);
    }
  }, [organizationId, organizations.data]);

  useEffect(() => {
    if (!project.data) return;
    setForm({
      name: project.data.name,
      projectCode: project.data.projectCode ?? "",
      type: project.data.type,
      status: project.data.status,
      address: {
        line1: project.data.address.line1 ?? "",
        line2: project.data.address.line2 ?? "",
        city: project.data.address.city ?? "",
        state: project.data.address.state ?? "",
        postalCode: project.data.address.postalCode ?? "",
      },
      startDate: project.data.startDate?.slice(0, 10) ?? "",
      expectedCompletionDate: project.data.expectedCompletionDate?.slice(0, 10) ?? "",
      description: project.data.description ?? "",
    });
  }, [project.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateProject.mutateAsync(normalizeProjectInput(form));
  }

  return (
    <PermissionGuard permission="projects:read">
      <div className="space-y-4">
        <PageHeader
          title={project.data?.name ?? "Project"}
          description="Review project setup, lifecycle status, and member assignment."
          onBack={() => router.push("/projects")}
          actions={
            <div className="flex flex-wrap gap-2">
              {project.data ? (
                <StatusBadge tone={statusTone[project.data.status]}>
                  {project.data.status}
                </StatusBadge>
              ) : null}
              <Button
                variant="outline"
                onClick={() => archiveProject.mutate()}
                disabled={!organizationId || archiveProject.isPending}
              >
                <Archive size={16} />
                Archive
              </Button>
              <Button
                variant="outline"
                onClick={() => restoreProject.mutate()}
                disabled={!organizationId || restoreProject.isPending}
              >
                <RotateCcw size={16} />
                Restore
              </Button>
            </div>
          }
        />

        {!organizationId ? (
          <Card className="text-[13px] text-body">Select an organization from Projects first.</Card>
        ) : project.isLoading ? (
          <Card className="text-[13px] text-body">Loading project</Card>
        ) : project.isError ? (
          <Card className="text-[13px] text-red-600">Unable to load project</Card>
        ) : (
          <>
            <Card>
              <PermissionGuard permission="projects:update">
                <form className="space-y-4" onSubmit={submit}>
                  <ProjectFormFields
                    form={form}
                    setForm={setForm}
                    allowArchivedStatus={project.data?.status === "ARCHIVED"}
                  />
                  <Button type="submit" disabled={updateProject.isPending}>
                    {updateProject.isPending ? "Saving" : "Save Project"}
                  </Button>
                </form>
              </PermissionGuard>
            </Card>

            <PermissionGuard permission="project-members:read">
              <ProjectMembersPanel organizationId={organizationId} projectId={projectId} />
            </PermissionGuard>

            <PermissionGuard permission="workers:read">
              <ProjectWorkersPanel organizationId={organizationId} projectId={projectId} />
            </PermissionGuard>
          </>
        )}
      </div>
    </PermissionGuard>
  );
}
