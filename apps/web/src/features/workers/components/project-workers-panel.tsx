"use client";

import Link from "next/link";
import { workerError, workerToday, workerRate } from "../worker-utils";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import type { PermissionKey } from "@nirman-app/shared";
import { BadgeIndianRupee, Pencil, Plus, UserMinus } from "lucide-react";
import { LoadingState } from "@/components/ui";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialogActions,
  Dialog,
  Input,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { RowActionMenu } from "@/components/common/row-action-menu";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useAssignWorker,
  useWorkerPrimaryPeriods,
  useEndWorkerAssignment,
  useProjectWorkers,
  useUpdateWorkerAssignment,
  useUpdateWorkerRate,
  useWorkers,
} from "@/features/workers/hooks/use-workers";
import type {
  ProjectWorkerRosterItem,
  WorkerSummary,
} from "@/features/workers/types/workers.types";

export function ProjectWorkersPanel(props: {
  organizationId: string;
  projectId: string;
  focusedWorker?: WorkerSummary;
  effectivePermissions?: PermissionKey[];
}) {
  const { user } = useAuth();
  return (
    <ProjectWorkersContent
      key={`${user?.id}:${props.organizationId}:${props.projectId}:${props.focusedWorker?.id ?? "all"}`}
      {...props}
    />
  );
}

function ProjectWorkersContent({
  organizationId,
  projectId,
  effectivePermissions,
  focusedWorker,
}: {
  organizationId: string;
  projectId: string;
  focusedWorker?: WorkerSummary;
  effectivePermissions?: PermissionKey[];
}) {
  const { activeOrganizationTimezone } = useAuth();
  const today = () => workerToday(activeOrganizationTimezone ?? undefined);
  const access = useProjectAccess(organizationId);
  const project = access.data?.projects.find((item) => item.id === projectId);
  const hasAccess = (permission: PermissionKey) =>
    Boolean(
      access.isSuccess &&
      project &&
      project.status !== "ARCHIVED" &&
      project.permissions.includes(permission) &&
      (!effectivePermissions || effectivePermissions.includes(permission)),
    );
  const busy = useRef(false);
  const canCreate = hasAccess("workers:create");
  const canAssign =
    hasAccess("workers:assign-project") && focusedWorker?.status !== "INACTIVE";
  const canUpdateRate =
    hasAccess("workers:update-rate") && focusedWorker?.status !== "INACTIVE";
  const [page, setPage] = useState(1);
  const [workerSearch, setWorkerSearch] = useState("");
  const roster = useProjectWorkers(
    project?.permissions.includes("workers:read") ? organizationId : null,
    projectId,
    {
      pageSize: 100,
      assignmentScope: "ALL_ACTIVE",
    },
  );
  const workers = useWorkers(
    !focusedWorker && project?.permissions.includes("workers:read")
      ? organizationId
      : null,
    {
      search: workerSearch,
      page,
      status: "ACTIVE",
      pageSize: 100,
      sortBy: "name",
      sortOrder: "asc",
    },
  );
  const assignWorker = useAssignWorker(organizationId, projectId);
  const updateAssignment = useUpdateWorkerAssignment(organizationId, projectId);
  const endAssignment = useEndWorkerAssignment(organizationId, projectId);
  const [rateWorker, setRateWorker] = useState<ProjectWorkerRosterItem | null>(
    null,
  );
  const updateRate = useUpdateWorkerRate(
    organizationId,
    projectId,
    rateWorker?.id ?? "",
  );
  const rosterRows = useMemo(
    () => roster.data?.data ?? [],
    [roster.data?.data],
  );
  const rosterByWorkerId = useMemo(
    () => new Map(rosterRows.map((worker) => [worker.id, worker])),
    [rosterRows],
  );
  const workerRows = focusedWorker
    ? [focusedWorker]
    : (workers.data?.data ?? []);
  const [assigningWorker, setAssigningWorker] = useState<WorkerSummary | null>(
    null,
  );
  const [assignStartsOn, setAssignStartsOn] = useState(today());
  const [editingWorker, setEditingWorker] =
    useState<ProjectWorkerRosterItem | null>(null);
  const [editForm, setEditForm] = useState({
    startsOn: today(),
    endsOn: "",
  });
  const [endingWorker, setEndingWorker] =
    useState<ProjectWorkerRosterItem | null>(null);
  const [endForm, setEndForm] = useState({ endsOn: today(), reason: "" });
  const primaryPeriods = useWorkerPrimaryPeriods(
    organizationId,
    endingWorker?.id ?? "",
  );
  const [endPrimaryPeriod, setEndPrimaryPeriod] = useState(false);
  const linkedPeriods = (primaryPeriods.data ?? []).filter(
    (period) =>
      period.workerAssignmentId === endingWorker?.currentAssignment.id,
  );
  const futurePrimaryConflict = linkedPeriods.some(
    (period) => period.startsOn.slice(0, 10) > endForm.endsOn,
  );
  const requiresPrimaryEnd = linkedPeriods.some(
    (period) =>
      period.startsOn.slice(0, 10) <= endForm.endsOn &&
      (!period.endsOn || period.endsOn.slice(0, 10) > endForm.endsOn),
  );
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [rateForm, setRateForm] = useState({
    dailyRate: "",
    effectiveDate: today(),
    reason: "",
  });

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningWorker || busy.current || !canAssign) return;
    busy.current = true;
    setActionError("");
    try {
      await assignWorker.mutateAsync({
        workerId: assigningWorker.id,
        input: {
          startsOn: assignStartsOn,
        },
      });
      setActionSuccess(
        "Worker assigned to this project. Set its primary allocation from worker details when needed.",
      );
      setAssigningWorker(null);
      setAssignStartsOn(today());
    } catch (error) {
      setActionError(workerError(error));
    } finally {
      busy.current = false;
    }
  }

  function openEdit(worker: ProjectWorkerRosterItem) {
    setActionError("");
    setEditingWorker(worker);
    setEditForm({
      startsOn: worker.currentAssignment.startsOn.slice(0, 10),
      endsOn: worker.currentAssignment.endsOn?.slice(0, 10) ?? "",
    });
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingWorker || busy.current || !canAssign) return;
    busy.current = true;
    setActionError("");
    try {
      await updateAssignment.mutateAsync({
        workerId: editingWorker.id,
        input: {
          startsOn: editForm.startsOn,
          endsOn: editForm.endsOn || null,
        },
      });
      setActionSuccess("Assignment dates saved.");
      setEditingWorker(null);
    } catch (error) {
      setActionError(workerError(error));
    } finally {
      busy.current = false;
    }
  }

  async function submitEnd() {
    if (!endingWorker || busy.current || !canAssign) return;
    if (
      !endForm.endsOn ||
      endForm.endsOn < endingWorker.currentAssignment.startsOn.slice(0, 10)
    ) {
      setActionError("Choose an end date on or after the assignment start.");
      return;
    }
    if (
      primaryPeriods.isPending ||
      primaryPeriods.isError ||
      futurePrimaryConflict ||
      (requiresPrimaryEnd && !endPrimaryPeriod)
    ) {
      setActionError(
        "Review the linked primary periods before ending this assignment.",
      );
      return;
    }
    if (endForm.endsOn > today()) {
      setActionError(
        "End assignment can use only today or an earlier date. Use Edit assignment dates to schedule a future end.",
      );
      return;
    }
    setActionError("");
    busy.current = true;
    try {
      await endAssignment.mutateAsync({
        workerId: endingWorker.id,
        input: {
          endsOn: endForm.endsOn,
          reason: endForm.reason.trim() || null,
          endPrimaryPeriod: requiresPrimaryEnd && endPrimaryPeriod,
        },
      });
      setActionSuccess("Assignment ended. History remains available.");
      setEndingWorker(null);
      setEndForm({ endsOn: today(), reason: "" });
    } catch (error) {
      setActionError(workerError(error));
    } finally {
      busy.current = false;
    }
  }

  function canChangeRate(worker: ProjectWorkerRosterItem) {
    return worker.currentAssignment.startsOn.slice(0, 10) > workerToday()
      ? false
      : worker.currentAssignment.startsOn.slice(0, 10) < workerToday()
        ? canUpdateRate
        : canAssign || canUpdateRate;
  }

  function openRate(worker: ProjectWorkerRosterItem) {
    setActionError("");
    setActionSuccess("");
    setRateWorker(worker);
    setRateForm({
      dailyRate: worker.currentAssignment.dailyRate ?? "",
      effectiveDate: workerToday(),
      reason: "",
    });
  }

  async function submitRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rateWorker || busy.current || !canChangeRate(rateWorker)) return;
    const dailyRate = Number(rateForm.dailyRate);
    if (
      !rateForm.dailyRate.trim() ||
      !Number.isFinite(dailyRate) ||
      dailyRate < 0
    ) {
      setActionError("Enter a valid non-negative daily rate.");
      return;
    }
    if (
      !rateForm.effectiveDate ||
      rateForm.effectiveDate > workerToday() ||
      rateForm.effectiveDate <
        rateWorker.currentAssignment.startsOn.slice(0, 10) ||
      (rateWorker.currentAssignment.endsOn &&
        rateForm.effectiveDate >
          rateWorker.currentAssignment.endsOn.slice(0, 10))
    ) {
      setActionError(
        "Choose today or an earlier date covered by this assignment.",
      );
      return;
    }
    setActionError("");
    busy.current = true;
    try {
      await updateRate.mutateAsync({
        dailyRate,
        effectiveDate: rateForm.effectiveDate,
        reason: rateForm.reason.trim() || null,
      });
      setRateWorker(null);
      setActionSuccess(`${rateWorker.name}'s daily rate was changed.`);
    } catch (error) {
      setActionError(workerError(error));
    } finally {
      busy.current = false;
    }
  }

  if (access.isPending)
    return <LoadingState label="Checking worker project access" />;
  if (access.isError)
    return (
      <Card>
        <p role="alert">{access.error.message}</p>
        <Button onClick={() => void access.refetch()}>Retry access</Button>
      </Card>
    );
  if (!project?.permissions.includes("workers:read"))
    return (
      <Card>
        <p role="alert">
          You do not have permission to view workers in this project.
        </p>
      </Card>
    );

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-body">Workers</h2>
          <p className="text-sm text-sub">
            Active project roster used later by Attendance, Wages, and Kharchi.
          </p>
        </div>
        {!focusedWorker && canCreate && canAssign ? (
          <Link
            href={`/workers/new?organizationId=${organizationId}&projectId=${projectId}`}
          >
            <Button size="sm">
              <Plus size={16} />
              Add New Worker
            </Button>
          </Link>
        ) : null}
      </div>

      {focusedWorker?.status === "INACTIVE" ? (
        <p role="status">
          This worker is inactive. Assignment and rate changes are unavailable.
        </p>
      ) : null}
      {project.status === "ARCHIVED" ? (
        <p role="status">This archived project is read-only.</p>
      ) : null}
      {actionError &&
      !rateWorker &&
      !assigningWorker &&
      !editingWorker &&
      !endingWorker ? (
        <p className="text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p className="text-sm font-medium text-success" role="status">
          {actionSuccess}
        </p>
      ) : null}

      {!focusedWorker ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            className="w-full sm:w-72"
            type="search"
            placeholder="Search organization workers"
            aria-label="Search organization workers"
            value={workerSearch}
            onChange={(event) => {
              setWorkerSearch(event.target.value);
              setPage(1);
            }}
          />
          <p className="text-[12px] text-sub">
            {rosterByWorkerId.size} assigned to this Project
          </p>
        </div>
      ) : null}

      {roster.isLoading || (!focusedWorker && workers.isLoading) ? (
        <LoadingState label="Loading organization workers" />
      ) : roster.isError || (!focusedWorker && workers.isError) ? (
        <div role="alert">
          <p>Unable to load workers.</p>
          <Button
            onClick={() => {
              void roster.refetch();
              void workers.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : workerRows.length === 0 ? (
        <p className="text-sm text-body">
          No active workers are available in this organization.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Daily rate (project or base)</TableHead>
              <TableHead>Project Status</TableHead>
              {canAssign || canUpdateRate ? (
                <TableHead>Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {workerRows.map((worker) => {
              const assignedWorker = rosterByWorkerId.get(worker.id);
              return (
                <TableRow key={worker.id}>
                  <TableCell>
                    <Link
                      href={`/workers/${worker.id}?organizationId=${organizationId}`}
                    >
                      {worker.workerCode}
                    </Link>
                  </TableCell>
                  <TableCell>{worker.name}</TableCell>
                  <TableCell>{worker.trade}</TableCell>
                  <TableCell>
                    {workerRate(
                      assignedWorker
                        ? assignedWorker.currentAssignment.dailyRate
                        : worker.baseDailyRate,
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={assignedWorker ? "active" : "inactive"}>
                      {worker.status === "INACTIVE"
                        ? "Inactive"
                        : assignedWorker
                          ? "Assigned"
                          : "Not assigned here"}
                    </StatusBadge>
                  </TableCell>
                  {canAssign || canUpdateRate ? (
                    <TableCell>
                      {assignedWorker ? (
                        <RowActionMenu
                          actions={[
                            ...(canChangeRate(assignedWorker)
                              ? [
                                  {
                                    label: "Change daily rate",
                                    icon: (
                                      <BadgeIndianRupee
                                        size={15}
                                        aria-hidden="true"
                                      />
                                    ),
                                    onSelect: () => openRate(assignedWorker),
                                  },
                                ]
                              : []),
                            ...(canAssign
                              ? [
                                  {
                                    label: "Edit assignment dates",
                                    icon: <Pencil size={15} />,
                                    onSelect: () => openEdit(assignedWorker),
                                  },
                                  {
                                    label: "End assignment",
                                    icon: <UserMinus size={15} />,
                                    destructive: true,
                                    onSelect: () => {
                                      setActionError("");
                                      setActionSuccess("");
                                      setEndPrimaryPeriod(false);
                                      setEndForm({
                                        endsOn: today(),
                                        reason: "",
                                      });
                                      setEndingWorker(assignedWorker);
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      ) : canAssign ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionError("");
                            setAssigningWorker(worker);
                            setAssignStartsOn(today());
                          }}
                        >
                          Assign
                        </Button>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {!focusedWorker && workers.data && workers.data.meta.pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-sub">
            Page {page} of {workers.data.meta.pageCount} ·{" "}
            {workers.data.meta.total} workers
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || workers.isFetching}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                page >= workers.data.meta.pageCount || workers.isFetching
              }
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(rateWorker)}
        title={`Change ${rateWorker?.name ?? "worker"}'s daily rate`}
        description="Use an effective date so earlier Attendance and Wage calculations retain the rate that applied then."
        onOpenChange={(open) => {
          if (!open && !busy.current && window.confirm("Discard rate changes?"))
            setRateWorker(null);
        }}
      >
        <form className="space-y-4" onSubmit={submitRate}>
          <fieldset className="space-y-4" disabled={updateRate.isPending}>
            <div className="rounded-inner border border-hairline bg-sunken/40 p-3 text-sm text-body">
              Current Project rate:{" "}
              {workerRate(rateWorker?.currentAssignment.dailyRate)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-base font-medium text-body">
                  New daily rate *
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={rateForm.dailyRate}
                  onChange={(event) =>
                    setRateForm({ ...rateForm, dailyRate: event.target.value })
                  }
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-base font-medium text-body">
                  Effective date *
                </span>
                <Input
                  type="date"
                  min={rateWorker?.currentAssignment.startsOn.slice(0, 10)}
                  max={
                    rateWorker?.currentAssignment.endsOn &&
                    rateWorker.currentAssignment.endsOn.slice(0, 10) <
                      workerToday()
                      ? rateWorker.currentAssignment.endsOn.slice(0, 10)
                      : workerToday()
                  }
                  value={rateForm.effectiveDate}
                  onChange={(event) =>
                    setRateForm({
                      ...rateForm,
                      effectiveDate: event.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="text-base font-medium text-body">Reason</span>
              <Input
                maxLength={500}
                value={rateForm.reason}
                onChange={(event) =>
                  setRateForm({ ...rateForm, reason: event.target.value })
                }
              />
            </label>
            {actionError ? (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateRate.isPending}
                onClick={() => {
                  if (window.confirm("Discard rate changes?"))
                    setRateWorker(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateRate.isPending}>
                {updateRate.isPending ? "Changing" : "Change Rate"}
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(assigningWorker)}
        title={`Assign ${assigningWorker?.name ?? "worker"}?`}
        description="The starting rate is copied from the Worker record. Choose the actual assignment start date; primary allocation is managed separately."
        onOpenChange={(open) => {
          if (
            !open &&
            !busy.current &&
            window.confirm("Discard assignment changes?")
          )
            setAssigningWorker(null);
        }}
      >
        <form className="space-y-4" onSubmit={submitAssignment}>
          <fieldset className="space-y-4" disabled={assignWorker.isPending}>
            {actionError ? (
              <p role="alert" className="text-danger">
                {actionError}
              </p>
            ) : null}
            <div className="grid gap-2 rounded-inner border border-hairline bg-sunken/40 p-3 text-sm text-body sm:grid-cols-2">
              <span>Trade: {assigningWorker?.trade ?? "-"}</span>
              <span>
                Daily rate: {workerRate(assigningWorker?.baseDailyRate)}
              </span>
            </div>
            <label className="space-y-1">
              <span className="text-base font-medium text-body">
                Assignment start date *
              </span>
              <Input
                type="date"
                value={assignStartsOn}
                onChange={(event) => setAssignStartsOn(event.target.value)}
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={assignWorker.isPending}
                onClick={() => setAssigningWorker(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assignWorker.isPending}>
                {assignWorker.isPending ? "Assigning" : "Assign Worker"}
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editingWorker)}
        title={`Update ${editingWorker?.name ?? "worker"} assignment`}
        description="Update assignment dates. Linked primary periods must remain inside this range. Rates are changed separately using an effective date."
        onOpenChange={(open) => {
          if (
            !open &&
            !busy.current &&
            window.confirm("Discard assignment changes?")
          )
            setEditingWorker(null);
        }}
      >
        <form className="space-y-3" onSubmit={submitEdit}>
          <fieldset className="space-y-4" disabled={updateAssignment.isPending}>
            {actionError ? (
              <p role="alert" className="text-danger">
                {actionError}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-base font-medium text-body">
                  Start date *
                </span>
                <Input
                  type="date"
                  value={editForm.startsOn}
                  onChange={(event) =>
                    setEditForm({ ...editForm, startsOn: event.target.value })
                  }
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-base font-medium text-body">
                  End date
                </span>
                <Input
                  type="date"
                  min={editForm.startsOn}
                  value={editForm.endsOn}
                  onChange={(event) =>
                    setEditForm({ ...editForm, endsOn: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateAssignment.isPending}
                onClick={() => setEditingWorker(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateAssignment.isPending}>
                {updateAssignment.isPending ? "Saving" : "Save Assignment"}
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(endingWorker)}
        title={`End ${endingWorker?.name ?? "worker"} assignment?`}
        description="The assignment history remains available and the worker stays active in the organization."
        onOpenChange={(open) => {
          if (!open && !busy.current) setEndingWorker(null);
        }}
        footer={
          <ConfirmDialogActions
            confirmLabel={endAssignment.isPending ? "Ending" : "End Assignment"}
            onCancel={() => {
              if (!busy.current) setEndingWorker(null);
            }}
            confirmProps={{
              disabled:
                endAssignment.isPending ||
                !endForm.endsOn ||
                primaryPeriods.isPending ||
                primaryPeriods.isError ||
                futurePrimaryConflict ||
                (requiresPrimaryEnd && !endPrimaryPeriod),
              onClick: () => void submitEnd(),
            }}
          />
        }
      >
        {actionError ? (
          <p role="alert" className="mb-3 text-danger">
            {actionError}
          </p>
        ) : null}
        {primaryPeriods.isPending ? (
          <LoadingState label="Checking primary periods" />
        ) : primaryPeriods.isError ? (
          <div role="alert">
            <p>{workerError(primaryPeriods.error)}</p>
            <Button onClick={() => void primaryPeriods.refetch()}>
              Retry period check
            </Button>
          </div>
        ) : null}
        {futurePrimaryConflict ? (
          <p role="alert" className="mb-3 text-danger">
            A primary period starts after this end date. Correct that period
            from worker details first.
          </p>
        ) : null}
        {requiresPrimaryEnd ? (
          <div className="mb-4 space-y-2">
            <p>
              Ending the assignment also requires closing its overlapping
              primary allocation on {endForm.endsOn}.
            </p>
            <Checkbox
              label="End the linked primary period on this date"
              checked={endPrimaryPeriod}
              disabled={endAssignment.isPending}
              onChange={(event) => setEndPrimaryPeriod(event.target.checked)}
            />
          </div>
        ) : null}
        <Link
          className="mb-3 block underline"
          href={`/workers/${endingWorker?.id}?organizationId=${organizationId}`}
        >
          Review worker allocation history
        </Link>
        <fieldset
          disabled={endAssignment.isPending}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="grid gap-1">
            End date *
            <Input
              type="date"
              min={endingWorker?.currentAssignment.startsOn.slice(0, 10)}
              max={today()}
              value={endForm.endsOn}
              onChange={(event) => (
                setEndPrimaryPeriod(false),
                setEndForm({ ...endForm, endsOn: event.target.value })
              )}
              required
            />
          </label>
          <label className="grid gap-1">
            Reason
            <Input
              maxLength={500}
              placeholder="Reason"
              value={endForm.reason}
              onChange={(event) =>
                setEndForm({ ...endForm, reason: event.target.value })
              }
            />
          </label>
        </fieldset>
      </Dialog>
    </Card>
  );
}
