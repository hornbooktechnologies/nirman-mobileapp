"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { WorkerForm, type WorkerFormState } from "@/features/workers/components/worker-form";
import { useCreateWorker } from "@/features/workers/hooks/use-workers";

export function WorkerCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizations = useOrganizations();
  const [organizationId, setOrganizationId] = useState(
    searchParams.get("organizationId") ?? "",
  );
  const createWorker = useCreateWorker(organizationId);

  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) {
      setOrganizationId(organizations.data[0].id);
    }
  }, [organizationId, organizations.data]);

  async function submit(input: WorkerFormState) {
    const worker = await createWorker.mutateAsync(input);
    router.push(`/workers/${worker.id}?organizationId=${organizationId}`);
  }

  return (
    <PermissionGuard permission="workers:create">
      <div className="space-y-4">
        <PageHeader
          title="New Worker"
          description="Create a worker master record and optionally assign the worker to a project."
          onBack={() => router.push("/workers")}
        />
        {!organizationId ? (
          <Card className="text-[13px] text-body">Select an organization from Workers first.</Card>
        ) : (
          <Card>
            <WorkerForm
              organizationId={organizationId}
              initialProjectId={searchParams.get("projectId") ?? undefined}
              isSaving={createWorker.isPending}
              submitLabel="Create Worker"
              onSubmit={submit}
            />
          </Card>
        )}
      </div>
    </PermissionGuard>
  );
}
