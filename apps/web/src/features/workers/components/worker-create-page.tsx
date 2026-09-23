"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  LoadingState,
  PageHeader,
  Select,
} from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { workerListReturnHref } from "../worker-list-query";
import { WorkerWorkspace } from "./worker-workspace";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { useState } from "react";
import {
  WorkerForm,
  type WorkerFormState,
} from "@/features/workers/components/worker-form";
import { useCreateWorker } from "@/features/workers/hooks/use-workers";

export function WorkerCreatePage() {
  return (
    <WorkerWorkspace permission="workers:create">
      {(organizationId) => <WorkerCreate organizationId={organizationId} />}
    </WorkerWorkspace>
  );
}

function WorkerCreate({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = workerListReturnHref(
    searchParams.get("returnTo"),
    organizationId,
  );
  const [formBusy, setFormBusy] = useState(false);
  const access = useProjectAccess(organizationId);
  const [projectId, setProjectId] = useState(
    searchParams.get("projectId") ?? "",
  );
  const projects =
    access.data?.projects.filter(
      (project) =>
        project.status !== "ARCHIVED" &&
        project.permissions.includes("workers:create") &&
        project.permissions.includes("workers:assign-project"),
    ) ?? [];
  const validProject =
    !projectId || projects.some((project) => project.id === projectId);
  const createWorker = useCreateWorker(organizationId);

  async function submit(input: WorkerFormState) {
    if (!validProject) throw new Error("Choose a project you can manage.");
    const worker = await createWorker.mutateAsync(input);
    router.push(
      `/workers/${worker.id}?${new URLSearchParams({ organizationId, returnTo })}`,
    );
  }

  return (
    <PermissionGuard permission="workers:create">
      <div className="space-y-4">
        <PageHeader
          title="New Worker"
          description="Create a worker master record and optionally assign the worker to a project."
          onBack={() => router.push(returnTo)}
        />
        {!organizationId ? (
          <Card className="text-[13px] text-body">
            Select an organization from Workers first.
          </Card>
        ) : (
          <Card className="space-y-4">
            {access.isPending ? (
              <LoadingState label="Loading available projects" />
            ) : access.isError ? (
              <div role="alert">
                <p>{access.error.message}</p>
                <Button onClick={() => void access.refetch()}>
                  Retry projects
                </Button>
              </div>
            ) : (
              <label className="grid gap-1 text-base">
                Initial project
                <Select
                  value={projectId}
                  disabled={createWorker.isPending || formBusy}
                  onChange={(event) => {
                    if (
                      window.confirm(
                        "Changing project resets this worker form. Continue?",
                      )
                    )
                      setProjectId(event.target.value);
                  }}
                >
                  <option value="">Create without an assignment</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {!validProject ? (
              <p role="alert">
                This project is unavailable or you do not have permission to
                create and assign workers there.
              </p>
            ) : null}
            {validProject && !access.isPending && !access.isError ? (
              <WorkerForm
                key={`${organizationId}:${projectId}`}
                organizationId={organizationId}
                initialProjectId={projectId || undefined}
                isSaving={createWorker.isPending}
                submitLabel="Create Worker"
                onBusyChange={setFormBusy}
                onSubmit={submit}
              />
            ) : null}
          </Card>
        )}
      </div>
    </PermissionGuard>
  );
}
