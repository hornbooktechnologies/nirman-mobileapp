"use client";

import { ProjectWorkspaceNavigation } from "./project-workspace-navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  ProjectFormFields,
  normalizeProjectInput,
} from "@/features/projects/components/project-form-fields";
import {
  useArchiveProject,
  useProject,
  useRestoreProject,
  useUpdateProject,
} from "@/features/projects/hooks/use-projects";
import type { ProjectInput } from "@/features/projects/types/projects.types";
import { projectListReturnHref } from "../project-list-query";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  ON_HOLD: "warning",
  COMPLETED: "success",
  ARCHIVED: "inactive",
} as const;

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { activeOrganizationId } = useAuth();
  const organizationId = activeOrganizationId ?? "";
  const project = useProject(organizationId, projectId);
  const updateProject = useUpdateProject(organizationId, projectId);
  const archiveProject = useArchiveProject(organizationId, projectId);
  const restoreProject = useRestoreProject(organizationId, projectId);
  const permissions = project.isSuccess
    ? (project.data?.currentUserAccess?.permissions ?? [])
    : [];
  const can = (permission: string) =>
    permissions.some((value) => value === permission);
  const [editing, setEditing] = useState(false);

  return (
    <PermissionGuard permission="projects:read">
      <div className="space-y-4">
        <PageHeader
          title={project.data?.name ?? "Project"}
          description="Review project setup and lifecycle status."
          onBack={() =>
            router.push(
              projectListReturnHref(params.get("returnTo"), organizationId),
            )
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {project.data ? (
                <StatusBadge tone={statusTone[project.data.status]}>
                  {project.data.status}
                </StatusBadge>
              ) : null}
            </div>
          }
        />

        {!organizationId ? (
          <Card className="text-[13px] text-body">
            No active organization is available.
          </Card>
        ) : project.isLoading ? (
          <LoadingState label="Loading project" />
        ) : project.isError ? (
          <Card className="text-[13px] text-red-600">
            Unable to load project
          </Card>
        ) : (
          <>
            <ProjectWorkspaceNavigation
              project={{
                id: projectId,
                status: project.data?.status ?? "DRAFT",
                permissions,
              }}
              overview={false}
              returnTo={projectListReturnHref(
                params.get("returnTo"),
                organizationId,
              )}
            />
            <Card className="space-y-4">
              <SectionHeader
                title="Project overview"
                actions={
                  can("projects:update") ? (
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      Edit project
                    </Button>
                  ) : undefined
                }
              />
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-sub">Code</dt>
                  <dd>{project.data?.projectCode || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sub">Type</dt>
                  <dd>{project.data?.type.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-sub">Start date</dt>
                  <dd>{project.data?.startDate?.slice(0, 10) || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-sub">Expected completion</dt>
                  <dd>
                    {project.data?.expectedCompletionDate?.slice(0, 10) ||
                      "Not set"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sub">Address</dt>
                  <dd className="break-words">
                    {Object.values(project.data?.address ?? {})
                      .filter(Boolean)
                      .join(", ") || "Not set"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sub">Description</dt>
                  <dd className="break-words">
                    {project.data?.description || "No description"}
                  </dd>
                </div>
              </dl>
            </Card>
            {editing && can("projects:update") && project.data ? (
              <ProjectEditor
                key={`${organizationId}:${projectId}`}
                project={project.data}
                pending={updateProject.isPending}
                save={async (input) => {
                  await updateProject.mutateAsync(input);
                  setEditing(false);
                }}
                close={() => setEditing(false)}
              />
            ) : null}
            {(can("projects:archive") && project.data?.status !== "ARCHIVED") ||
            (can("projects:restore") &&
              can("projects:view-all") &&
              project.data?.status === "ARCHIVED") ? (
              <Card className="space-y-3">
                <SectionHeader
                  title="Project lifecycle"
                  description="Archived projects retain their history. Restoring is subject to project capacity."
                />
                <div className="flex flex-wrap gap-2">
                  {project.data?.status !== "ARCHIVED" &&
                  can("projects:archive") ? (
                    <Button
                      variant="outline"
                      disabled={archiveProject.isPending}
                      onClick={() => archiveProject.mutate()}
                    >
                      <Archive size={16} />
                      {archiveProject.isPending
                        ? "Archiving"
                        : "Archive project"}
                    </Button>
                  ) : null}
                  {project.data?.status === "ARCHIVED" &&
                  can("projects:restore") &&
                  can("projects:view-all") ? (
                    <Button
                      variant="outline"
                      disabled={restoreProject.isPending}
                      onClick={() => restoreProject.mutate()}
                    >
                      <RotateCcw size={16} />
                      {restoreProject.isPending
                        ? "Restoring"
                        : "Restore project"}
                    </Button>
                  ) : null}
                </div>
                {archiveProject.error || restoreProject.error ? (
                  <p role="alert" className="text-sm text-danger">
                    {(archiveProject.error ?? restoreProject.error)?.message}
                  </p>
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

function ProjectEditor({
  project,
  pending,
  save,
  close,
}: {
  project: NonNullable<ReturnType<typeof useProject>["data"]>;
  pending: boolean;
  save: (input: ProjectInput) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [form, setForm] = useState<ProjectInput>(() => ({
    name: project.name,
    projectCode: project.projectCode ?? "",
    type: project.type,
    status: project.status,
    address: {
      line1: project.address.line1 ?? "",
      line2: project.address.line2 ?? "",
      city: project.address.city ?? "",
      state: project.address.state ?? "",
      postalCode: project.address.postalCode ?? "",
    },
    startDate: project.startDate?.slice(0, 10) ?? "",
    expectedCompletionDate: project.expectedCompletionDate?.slice(0, 10) ?? "",
    description: project.description ?? "",
  }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    try {
      await save(normalizeProjectInput(form));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Unable to save project",
      );
    }
  }
  return (
    <Card>
      <form className="space-y-4" onSubmit={submit}>
        <SectionHeader title="Edit project" />
        <fieldset disabled={pending}>
          <ProjectFormFields
            form={form}
            setForm={setForm}
            allowArchivedStatus={project.status === "ARCHIVED"}
          />
        </fieldset>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving" : "Save project"}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Discard project changes?")) close();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
