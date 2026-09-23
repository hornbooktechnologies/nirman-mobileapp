"use client";

import { workerRate, workerToday } from "../worker-utils";
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
  SectionHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectWorkersPanel } from "./project-workers-panel";
import {
  workerDetailReturnHref,
  workerListReturnHref,
} from "../worker-list-query";
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
  useWorkerPrimaryPeriods,
} from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ENDED: "inactive",
} as const;

export function WorkerDetailPage({ workerId }: { workerId: string }) {
  return (
    <WorkerWorkspace permission="workers:read">
      {(organizationId) => (
        <WorkerDetail
          key={`${organizationId}:${workerId}`}
          organizationId={organizationId}
          workerId={workerId}
        />
      )}
    </WorkerWorkspace>
  );
}

function WorkerDetail({
  workerId,
  organizationId,
}: {
  workerId: string;
  organizationId: string;
}) {
  const { hasPermission, activeOrganizationTimezone } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useProjectAccess(organizationId);
  const activeTab = [
    "attendance",
    "assignments",
    "history",
    "management",
  ].includes(searchParams.get("tab") ?? "")
    ? searchParams.get("tab")!
    : "profile";
  const returnHref = workerDetailReturnHref(
    searchParams.get("returnTo"),
    organizationId,
  );
  const periods = useWorkerPrimaryPeriods(organizationId, workerId);
  const today = activeOrganizationTimezone
    ? workerToday(activeOrganizationTimezone)
    : null;
  const currentPeriod =
    today &&
    periods.isSuccess &&
    periods.data?.find(
      (period) =>
        period.startsOn.slice(0, 10) <= today &&
        (!period.endsOn || period.endsOn.slice(0, 10) >= today),
    );
  const [editing, setEditing] = useState(false);
  const manageableProjects = access.isSuccess
    ? (access.data?.projects ?? []).filter(
        (project) =>
          project.permissions.includes("workers:read") &&
          (project.permissions.includes("workers:assign-project") ||
            project.permissions.includes("workers:update-rate")),
      )
    : [];
  const requestedProject = searchParams.get("projectId");
  const managementProject = requestedProject
    ? manageableProjects.find((project) => project.id === requestedProject)
    : manageableProjects[0];
  const worker = useWorker(organizationId, workerId);
  const updateWorker = useUpdateWorker(organizationId, workerId);
  const deactivateWorker = useDeactivateWorker(organizationId, workerId);
  const deleteWorker = useDeleteWorker(organizationId, workerId);
  const displayedAssignments = (worker.data?.assignments ?? []).filter(
    (assignment) => activeTab === "history" || assignment.status === "ACTIVE",
  );
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
    setEditing(false);
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
        `${workerListReturnHref(searchParams.get("returnTo"), organizationId)}&deletedWorker=${encodeURIComponent(deleted.workerName)}`,
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

  function selectTab(tab: string) {
    if (editing && activeTab === "management" && tab !== "management") {
      if (
        updateWorker.isPending ||
        !window.confirm("Discard worker profile changes?")
      )
        return;
      setEditing(false);
    }
    const next = new URLSearchParams(searchParams.toString());
    if (tab !== "profile") next.set("tab", tab);
    else next.delete("tab");
    router.replace(`/workers/${workerId}?${next.toString()}`, {
      scroll: false,
    });
  }

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title={worker.data?.name ?? "Worker"}
          description={
            activeTab === "attendance"
              ? "Review attendance totals and exact absence dates."
              : "Review worker identity, assignment history, and current rate context."
          }
          onBack={() => router.push(returnHref)}
          actions={
            worker.data ? (
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={statusTone[worker.data.status]}>
                  {worker.data.status}
                </StatusBadge>
              </div>
            ) : null
          }
        />

        {worker.data ? (
          <nav
            aria-label="Worker detail sections"
            className="flex flex-wrap gap-2 border-b border-hairline pb-3"
          >
            {[
              ["profile", "Overview"],
              ["assignments", "Assignments and rates"],
              ["attendance", "Attendance"],
              ["history", "History"],
              ["management", "Management"],
            ].map(([tab, label]) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "primary" : "outline"}
                aria-current={activeTab === tab ? "page" : undefined}
                onClick={() => selectTab(tab)}
              >
                {label}
              </Button>
            ))}
          </nav>
        ) : null}

        {!organizationId ? (
          <Card className="text-sm text-body">
            Select an organization from Workers first.
          </Card>
        ) : worker.isLoading ? (
          <LoadingState label="Loading worker" />
        ) : worker.isError || !worker.data ? (
          <Card className="text-sm text-red-600">
            <p role="alert">
              {worker.error?.message ?? "Unable to load worker"}
            </p>
            <Button onClick={() => void worker.refetch()}>Retry</Button>
          </Card>
        ) : (
          <>
            {activeTab === "attendance" ? (
              access.isPending ? (
                <LoadingState label="Checking attendance access" />
              ) : access.isError ? (
                <Card>
                  <p role="alert">{access.error.message}</p>
                  <Button onClick={() => void access.refetch()}>
                    Retry access
                  </Button>
                </Card>
              ) : (
                <WorkerAttendancePanel
                  key={`${organizationId}:${workerId}:${searchParams.get("projectId")}:${searchParams.get("startDate")}:${searchParams.get("endDate")}`}
                  organizationId={organizationId}
                  workerId={workerId}
                  assignments={worker.data.assignments.filter((assignment) =>
                    access.data?.projects.some(
                      (project) =>
                        project.id === assignment.projectId &&
                        project.permissions.includes("attendance:read"),
                    ),
                  )}
                />
              )
            ) : activeTab === "profile" ? (
              <>
                <Card className="space-y-4">
                  <SectionHeader title="Worker overview" />
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-sub">Code and trade</dt>
                      <dd>
                        {worker.data.workerCode} · {worker.data.trade}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sub">Mobile</dt>
                      <dd>{worker.data.mobileNumber ?? "Not provided"}</dd>
                    </div>
                    <div>
                      <dt className="text-sub">Base daily rate</dt>
                      <dd>{workerRate(worker.data.baseDailyRate)}</dd>
                    </div>
                    <div>
                      <dt className="text-sub">Primary project today</dt>
                      <dd>
                        {!today || periods.isError
                          ? "Unavailable"
                          : periods.isPending
                            ? "Checking allocation"
                            : currentPeriod
                              ? (currentPeriod.projectName ??
                                currentPeriod.projectId)
                              : "No current primary allocation in accessible projects"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sub">
                        Current primary assignment rate
                      </dt>
                      <dd>
                        {currentPeriod
                          ? workerRate(
                              worker.data.assignments.find(
                                (assignment) =>
                                  assignment.id ===
                                  currentPeriod.workerAssignmentId,
                              )?.dailyRate,
                            )
                          : "No confirmed current assignment"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sub">Active assignments</dt>
                      <dd>{worker.data.activeAssignmentCount}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sub">Notes</dt>
                      <dd className="break-words">
                        {worker.data.notes || "No notes"}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-[13px] text-sub">
                    Assignment rates are current snapshots. Historical
                    attendance and wages retain their effective calculation
                    rates.
                  </p>
                  {periods.isError ? (
                    <Button
                      variant="outline"
                      onClick={() => void periods.refetch()}
                    >
                      Retry allocation
                    </Button>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {manageableProjects.length ? (
                      <Button onClick={() => selectTab("assignments")}>
                        Manage assignments and rates
                      </Button>
                    ) : null}
                    {hasPermission("workers:update") ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(true);
                          selectTab("management");
                        }}
                      >
                        Edit worker
                      </Button>
                    ) : null}
                  </div>
                </Card>
                <Card className="space-y-3">
                  <SectionHeader title="Related work" />
                  <p className="text-sm text-sub">
                    Attendance and Kharchi open for this worker. Project wages
                    opens the full project.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(access.isSuccess ? (access.data?.projects ?? []) : [])
                      .filter((project) =>
                        worker.data!.assignments.some(
                          (assignment) => assignment.projectId === project.id,
                        ),
                      )
                      .map((project) => (
                        <div
                          key={project.id}
                          className="space-y-2 rounded-inner border border-hairline p-3"
                        >
                          <p className="break-words text-sm font-medium">
                            {project.name}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm">
                            {project.permissions.includes("attendance:read") ? (
                              <a
                                className="underline"
                                href={`/workers/${workerId}?${new URLSearchParams({ organizationId, tab: "attendance", projectId: project.id, returnTo: returnHref })}`}
                              >
                                Worker attendance
                              </a>
                            ) : null}
                            {project.permissions.includes("wages:read") ? (
                              <a
                                className="underline"
                                href={`/projects/${project.id}/wages`}
                              >
                                Project wages
                              </a>
                            ) : null}
                            {project.permissions.includes("kharchi:read") ? (
                              <a
                                className="underline"
                                href={`/projects/${project.id}/kharchi?workerId=${encodeURIComponent(workerId)}`}
                              >
                                Worker Kharchi
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ))}
                  </div>
                  {access.isPending ? (
                    <LoadingState label="Checking related access" />
                  ) : access.isError ? (
                    <Button
                      variant="outline"
                      onClick={() => void access.refetch()}
                    >
                      Retry related access
                    </Button>
                  ) : null}
                </Card>
              </>
            ) : activeTab === "assignments" ? (
              <>
                <Card className="space-y-3">
                  <SectionHeader
                    title="Assignments and rates"
                    description="Choose a project to use its existing assignment and effective-date rate workflow."
                  />
                  <label className="grid gap-1 text-[13px] font-medium">
                    Project
                    <Select
                      value={managementProject?.id ?? ""}
                      onChange={(event) => {
                        const next = new URLSearchParams(
                          searchParams.toString(),
                        );
                        next.set("projectId", event.target.value);
                        router.replace(`/workers/${workerId}?${next}`, {
                          scroll: false,
                        });
                      }}
                    >
                      <option value="">Choose an accessible project</option>
                      {manageableProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  </label>
                </Card>
                {access.isPending ? (
                  <LoadingState label="Checking assignment access" />
                ) : access.isError ? (
                  <Card>
                    <Button onClick={() => void access.refetch()}>
                      Retry access
                    </Button>
                  </Card>
                ) : managementProject ? (
                  <ProjectWorkersPanel
                    organizationId={organizationId}
                    projectId={managementProject.id}
                    focusedWorker={worker.data}
                  />
                ) : (
                  <Card>
                    No project available with assignment or rate permission.
                    Choose an accessible project above.
                  </Card>
                )}
              </>
            ) : activeTab === "management" ? (
              <Card className="space-y-4">
                <SectionHeader
                  title="Worker management"
                  description="Profile changes and administrative actions."
                />
                {hasPermission("workers:update") ? (
                  editing ? (
                    <>
                      <WorkerForm
                        organizationId={organizationId}
                        initialWorker={worker.data}
                        isSaving={updateWorker.isPending}
                        submitLabel="Save worker"
                        onSubmit={submit}
                      />
                      <Button
                        variant="outline"
                        disabled={updateWorker.isPending}
                        onClick={() => {
                          if (window.confirm("Discard worker profile changes?"))
                            setEditing(false);
                        }}
                      >
                        Cancel editing
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setEditing(true)}>
                      Edit worker
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-sub">This profile is read-only.</p>
                )}
                <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
                  {" "}
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
              </Card>
            ) : null}

            {activeTab === "history" ? (
              <WorkerPrimaryPeriods
                organizationId={organizationId}
                worker={worker.data}
              />
            ) : null}
            {activeTab === "history" || activeTab === "profile" ? (
              <Card className="space-y-4">
                <div>
                  <SectionHeader
                    title={
                      activeTab === "history"
                        ? "Assignment history"
                        : "Project assignments"
                    }
                  />
                  <p className="text-sm text-sub">
                    Assignment history stays available for Attendance, Wages,
                    Kharchi, and reports.
                  </p>
                </div>
                {displayedAssignments.length === 0 ? (
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
                      {displayedAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            {access.isSuccess &&
                            access.data?.projects.some(
                              (project) =>
                                project.id === assignment.projectId &&
                                project.permissions.includes("projects:read"),
                            ) ? (
                              <a
                                className="underline"
                                href={`/projects/${assignment.projectId}`}
                              >
                                {assignment.projectName ?? assignment.projectId}
                              </a>
                            ) : (
                              (assignment.projectName ?? assignment.projectId)
                            )}
                          </TableCell>
                          <TableCell>
                            {workerRate(assignment.dailyRate)}
                          </TableCell>
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
                            {access.data?.projects.some(
                              (project) =>
                                project.id === assignment.projectId &&
                                project.permissions.includes("attendance:read"),
                            ) ? (
                              <a
                                className="underline"
                                href={`/workers/${workerId}?organizationId=${organizationId}&tab=attendance&projectId=${assignment.projectId}&returnTo=${encodeURIComponent(returnHref)}`}
                              >
                                View attendance
                              </a>
                            ) : (
                              <span className="text-sub">
                                Attendance access unavailable
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <p className="text-sm text-sub">
                  Rates above are current assignment snapshots. Detailed
                  rate-change history is not returned by the Workers API.
                </p>
              </Card>
            ) : null}
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
        onOpenChange={(open) => {
          if (!deactivateWorker.isPending) setShowDeactivate(open);
        }}
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
        <label className="grid gap-1">
          Reason
          <Input
            maxLength={500}
            placeholder="Reason"
            value={deactivateReason}
            onChange={(event) => setDeactivateReason(event.target.value)}
          />
        </label>
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
              deleteWorker.isPending
                ? "Deleting Permanently"
                : "Delete Permanently"
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
