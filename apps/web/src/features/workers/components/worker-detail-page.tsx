"use client";

import { Ban, IndianRupee } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ConfirmDialogActions,
  Dialog,
  Input,
  PageHeader,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  WorkerForm,
  type WorkerFormState,
} from "@/features/workers/components/worker-form";
import {
  useDeactivateWorker,
  useUpdateWorker,
  useUpdateWorkerRate,
  useWorker,
} from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ENDED: "inactive",
} as const;

export function WorkerDetailPage({ workerId }: { workerId: string }) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizations = useOrganizations();
  const [selectedOrganizationId] = useState(
    searchParams.get("organizationId") ?? "",
  );
  const organizationId =
    selectedOrganizationId || organizations.data?.[0]?.id || "";
  const worker = useWorker(organizationId, workerId);
  const updateWorker = useUpdateWorker(organizationId, workerId);
  const deactivateWorker = useDeactivateWorker(organizationId, workerId);
  const activeAssignment = worker.data?.assignments.find(
    (assignment) => assignment.status === "ACTIVE",
  );
  const updateRate = useUpdateWorkerRate(
    organizationId,
    activeAssignment?.projectId ?? "",
    workerId,
  );
  const [rateForm, setRateForm] = useState({
    dailyRate: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [actionError, setActionError] = useState("");
  const displayedDailyRate =
    rateForm.dailyRate || activeAssignment?.dailyRate || "";

  async function submit(input: WorkerFormState) {
    await updateWorker.mutateAsync({
      name: input.name,
      trade: input.trade,
      mobileNumber: input.mobileNumber,
      notes: input.notes,
      acknowledgeDuplicateWarning: input.acknowledgeDuplicateWarning,
    });
  }

  async function submitRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAssignment) return;
    setActionError("");
    try {
      await updateRate.mutateAsync({
        dailyRate: displayedDailyRate,
        effectiveDate: rateForm.effectiveDate,
        reason: rateForm.reason || null,
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update rate",
      );
    }
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

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title={worker.data?.name ?? "Worker"}
          description="Review worker identity, assignment history, and current rate context."
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
                      deactivateWorker.isPending || worker.data.status === "INACTIVE"
                    }
                  >
                    <Ban size={16} />
                    Deactivate
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />

        {!organizationId ? (
          <Card className="text-[13px] text-body">
            Select an organization from Workers first.
          </Card>
        ) : worker.isLoading ? (
          <Card className="text-[13px] text-body">Loading worker</Card>
        ) : worker.isError || !worker.data ? (
          <Card className="text-[13px] text-red-600">Unable to load worker</Card>
        ) : (
          <>
            {hasPermission("workers:update") ? (
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
              <Card className="grid gap-2 text-[13px] text-body sm:grid-cols-2">
                <span>Code: {worker.data.workerCode}</span>
                <span>Trade: {worker.data.trade}</span>
                <span>Mobile: {worker.data.mobileNumber ?? "-"}</span>
                <span>Status: {worker.data.status}</span>
              </Card>
            )}

            <Card className="space-y-4">
              <div>
                <h2 className="text-[17px] font-semibold text-body">Assignments</h2>
                <p className="text-[13px] text-sub">
                  Assignment history stays available for Attendance, Wages, Kharchi,
                  and reports.
                </p>
              </div>
              {worker.data.assignments.length === 0 ? (
                <p className="text-[13px] text-body">No project assignments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Ends</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {worker.data.assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          {assignment.projectName ?? assignment.projectId}
                        </TableCell>
                        <TableCell>{assignment.roleLabel ?? "-"}</TableCell>
                        <TableCell>{assignment.dailyRate ?? "-"}</TableCell>
                        <TableCell>
                          <StatusBadge tone={statusTone[assignment.status]}>
                            {assignment.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>{assignment.startsOn.slice(0, 10)}</TableCell>
                        <TableCell>
                          {assignment.endsOn?.slice(0, 10) ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            {activeAssignment && hasPermission("workers:assign-project") ? (
              <Card>
                <form className="space-y-3" onSubmit={submitRate}>
                  <div>
                    <h2 className="text-[17px] font-semibold text-body">
                      Current Daily Rate
                    </h2>
                    <p className="text-[13px] text-sub">
                      This is the Workers MVP rate field. Full rate history belongs to
                      Wages.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      type="number"
                      min="0"
                      value={displayedDailyRate}
                      onChange={(event) =>
                        setRateForm({ ...rateForm, dailyRate: event.target.value })
                      }
                      placeholder="Daily rate"
                      required
                    />
                    <Input
                      type="date"
                      value={rateForm.effectiveDate}
                      onChange={(event) =>
                        setRateForm({ ...rateForm, effectiveDate: event.target.value })
                      }
                      required
                    />
                    <Input
                      value={rateForm.reason}
                      onChange={(event) =>
                        setRateForm({ ...rateForm, reason: event.target.value })
                      }
                      placeholder="Reason"
                    />
                  </div>
                  <Button type="submit" disabled={updateRate.isPending}>
                    <IndianRupee size={16} />
                    {updateRate.isPending ? "Saving" : "Update Rate"}
                  </Button>
                </form>
              </Card>
            ) : null}
          </>
        )}

        {actionError ? (
          <Card className="text-[13px] text-red-600">{actionError}</Card>
        ) : null}
      </div>

      <Dialog
        open={showDeactivate}
        title={`Deactivate ${worker.data?.name ?? "worker"}?`}
        description="The worker will disappear from active rosters. Historical assignments remain available."
        onOpenChange={setShowDeactivate}
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
        <Input
          placeholder="Reason (optional)"
          value={deactivateReason}
          onChange={(event) => setDeactivateReason(event.target.value)}
        />
      </Dialog>
    </PermissionGuard>
  );
}
