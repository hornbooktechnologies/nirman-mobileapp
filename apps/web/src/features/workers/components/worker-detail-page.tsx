"use client";

import { workerRate } from "../worker-utils";
import { Ban, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  ConfirmDialogActions,
  Dialog,
  Input,
  NotificationBanner,
  PageHeader,
  StatusBadge,
  TabButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { WorkerWorkspace } from "./worker-workspace";
import { WorkerPrimaryPeriods } from "./worker-primary-periods";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  WorkerForm,
  type WorkerFormState,
} from "@/features/workers/components/worker-form";
import { WorkerAttendancePanel } from "@/features/workers/components/worker-attendance-panel";
import {
  useDeactivateWorker,
  useDeleteWorker,
  useUpdateWorker,
  useWorker,
} from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ENDED: "inactive",
} as const;

export function WorkerDetailPage({ workerId }: { workerId: string }) {
  return <WorkerWorkspace permission="workers:read">{organizationId => <WorkerDetail key={`${organizationId}:${workerId}`} organizationId={organizationId} workerId={workerId} />}</WorkerWorkspace>;
}

function WorkerDetail({ workerId, organizationId }: { workerId: string; organizationId: string }) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useProjectAccess(organizationId);
  const activeTab = searchParams.get("tab") === "attendance" ? "attendance" : "profile";
  const worker = useWorker(organizationId, workerId);
  const updateWorker = useUpdateWorker(organizationId, workerId);
  const deactivateWorker = useDeactivateWorker(organizationId, workerId);
  const deleteWorker = useDeleteWorker(organizationId, workerId);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [actionError, setActionError] = useState("");
  async function submit(input: WorkerFormState) {
    await updateWorker.mutateAsync({
      name: input.name,
      trade: input.trade,
      dailyRate: input.dailyRate,
      mobileNumber: input.mobileNumber,
      notes: input.notes,
      acknowledgeDuplicateWarning: input.acknowledgeDuplicateWarning,
    });
  }

  async function confirmDeactivate() {
    setActionError("");
    try {
      await deactivateWorker.mutateAsync(deactivateReason || null);
      setShowDeactivate(false);
      setDeactivateReason("");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to deactivate worker",
      );
    }
  }

  async function confirmDelete() {
    setActionError("");
    try {
      const deleted = await deleteWorker.mutateAsync();
      router.push(
        `/workers?deletedWorker=${encodeURIComponent(deleted.workerName)}`,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to permanently delete worker",
      );
      setShowDelete(false);
    }
  }

  function selectTab(tab: "profile" | "attendance") {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "attendance") next.set("tab", "attendance");
    else next.delete("tab");
    router.replace(`/workers/${workerId}?${next.toString()}`, { scroll: false });
  }

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title={worker.data?.name ?? "Worker"}
          description={activeTab === "attendance" ? "Review attendance totals and exact absence dates." : "Review worker identity, assignment history, and current rate context."}
          onBack={() => router.push("/workers")}
          actions={
            worker.data ? (
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={statusTone[worker.data.status]}>
                  {worker.data.status}
                </StatusBadge>
                {hasPermission("workers:deactivate") ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeactivate(true)}
                    disabled={
                      deactivateWorker.isPending ||
                      worker.data.status === "INACTIVE"
                    }
                  >
                    <Ban size={16} />
                    Deactivate
                  </Button>
                ) : null}
                {hasPermission("workers:delete") ? (
                  <Button
                    variant="danger"
                    onClick={() => setShowDelete(true)}
                    disabled={deleteWorker.isPending}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete Permanently
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />

        {worker.data ? (
          <Tabs aria-label="Worker detail sections">
            <TabButton active={activeTab === "profile"} onClick={() => selectTab("profile")}>Profile</TabButton>
            <TabButton active={activeTab === "attendance"} onClick={() => selectTab("attendance")}>Attendance</TabButton>
          </Tabs>
        ) : null}

        {!organizationId ? (
          <Card className="text-sm text-body">
            Select an organization from Workers first.
          </Card>
        ) : worker.isLoading ? (
          <LoadingState label="Loading worker" />
        ) : worker.isError || !worker.data ? (
          <Card className="text-sm text-red-600">
            <p role="alert">{worker.error?.message ?? "Unable to load worker"}</p><Button onClick={() => void worker.refetch()}>Retry</Button>
          </Card>
        ) : (
          <>
            {activeTab === "attendance" ? (
              access.isPending ? <LoadingState label="Checking attendance access" /> : access.isError ? <Card><p role="alert">{access.error.message}</p><Button onClick={() => void access.refetch()}>Retry access</Button></Card> : <WorkerAttendancePanel
                key={`${organizationId}:${workerId}:${searchParams.get("projectId")}:${searchParams.get("startDate")}:${searchParams.get("endDate")}`}
                organizationId={organizationId}
                workerId={workerId}
                assignments={worker.data.assignments.filter(assignment => access.data?.projects.some(project => project.id === assignment.projectId && project.permissions.includes("attendance:read")))}
              />
            ) : hasPermission("workers:update") ? (
              <Card>
                <WorkerForm
                  organizationId={organizationId}
                  initialWorker={worker.data}
                  isSaving={updateWorker.isPending}
                  submitLabel="Save Worker"
                  onSubmit={submit}
                />
              </Card>
            ) : (
              <Card className="grid gap-2 text-sm text-body sm:grid-cols-2">
                <span>Code: {worker.data.workerCode}</span>
                <span>Trade: {worker.data.trade}</span>
                <span>Daily rate: {workerRate(worker.data.baseDailyRate)}</span>
                <span>Mobile: {worker.data.mobileNumber ?? "-"}</span>
                <span>Status: {worker.data.status}</span>
                <span className="break-words sm:col-span-2">Notes: {worker.data.notes || "—"}</span>
              </Card>
            )}

            {activeTab === "profile" ? <WorkerPrimaryPeriods organizationId={organizationId} worker={worker.data} /> : null}
            {activeTab === "profile" ? <Card className="space-y-4">
              <div>
                <h2 className="text-[17px] font-semibold text-body">
                  Assignments
                </h2>
                <p className="text-sm text-sub">
                  Assignment history stays available for Attendance, Wages,
                  Kharchi, and reports.
                </p>
              </div>
              {worker.data.assignments.length === 0 ? (
                <p className="text-sm text-body">
                  No project assignments yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead>Related activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worker.data.assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <a className="underline" href={`/projects/${assignment.projectId}`}>{assignment.projectName ?? assignment.projectId}</a>
                        </TableCell>
                        <TableCell>{workerRate(assignment.dailyRate)}</TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone[assignment.status]}>
                            {assignment.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {assignment.startsOn.slice(0, 10)}
                        </TableCell>
                        <TableCell>
                          {assignment.endsOn?.slice(0, 10) ?? "-"}
                        </TableCell>
                        <TableCell>
                          {access.data?.projects.some(project => project.id === assignment.projectId && project.permissions.includes("attendance:read")) ? <a className="underline" href={`/workers/${workerId}?organizationId=${organizationId}&tab=attendance&projectId=${assignment.projectId}`}>View attendance</a> : <span className="text-sub">Attendance access unavailable</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-sm text-sub">Rates above are current assignment snapshots. Detailed rate-change history is not returned by the Workers API.</p>
            </Card> : null}
          </>
        )}

        {actionError ? (
          <Card className="text-sm text-red-600">{actionError}</Card>
        ) : null}
      </div>

      <Dialog
        open={showDeactivate}
        title={`Deactivate ${worker.data?.name ?? "worker"}?`}
        description="The worker will disappear from active rosters. Historical assignments remain available."
        onOpenChange={open => { if (!deactivateWorker.isPending) setShowDeactivate(open); }}
        footer={
          <ConfirmDialogActions
            confirmLabel={
              deactivateWorker.isPending ? "Deactivating" : "Deactivate Worker"
            }
            onCancel={() => setShowDeactivate(false)}
            confirmProps={{
              disabled: deactivateWorker.isPending,
              onClick: () => void confirmDeactivate(),
            }}
          />
        }
      >
        <label className="grid gap-1">Reason<Input
          maxLength={500}
          placeholder="Reason"
          value={deactivateReason}
          onChange={(event) => setDeactivateReason(event.target.value)}
        /></label>
      </Dialog>

      <Dialog
        open={showDelete}
        title={`Permanently delete ${worker.data?.name ?? "worker"}?`}
        description="This action cannot be undone."
        onOpenChange={(open) => {
          if (!deleteWorker.isPending) setShowDelete(open);
        }}
        footer={
          <ConfirmDialogActions
            cancelLabel="Keep Worker"
            confirmLabel={
              deleteWorker.isPending ? "Deleting Permanently" : "Delete Permanently"
            }
            onCancel={() => setShowDelete(false)}
            confirmProps={{
              disabled: deleteWorker.isPending,
              onClick: () => void confirmDelete(),
            }}
          />
        }
      >
        <div className="space-y-4">
          <NotificationBanner
            variant="danger"
            title="Warning: all worker records will be erased"
            description="Confirming will permanently delete this worker and every related record from NirmanSite. This data cannot be restored."
          />
          <div className="space-y-2 text-body">
            <p>
              This includes project assignments, primary-project periods,
              attendance records and exceptions, wage items, and wage payments.
            </p>
            <p>
              Worker: <strong>{worker.data?.name}</strong>
              {worker.data?.workerCode ? ` · ${worker.data.workerCode}` : ""}
            </p>
          </div>
        </div>
      </Dialog>
    </PermissionGuard>
  );
}
