"use client";

import Link from "next/link";
import type { PermissionKey } from "@nirman-app/shared";
import { Pencil, Plus, UserMinus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  Button,
  Card,
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
  useEndWorkerAssignment,
  useProjectWorkers,
  useUpdateWorkerAssignment,
  useWorkers,
} from "@/features/workers/hooks/use-workers";
import type {
  ProjectWorkerRosterItem,
  WorkerSummary,
} from "@/features/workers/types/workers.types";

const today = () => new Date().toISOString().slice(0, 10);

export function ProjectWorkersPanel({
  organizationId,
  projectId,
  effectivePermissions,
}: {
  organizationId: string;
  projectId: string;
  effectivePermissions?: PermissionKey[];
}) {
  const { hasPermission } = useAuth();
  const hasAccess = (permission: PermissionKey) =>
    effectivePermissions
      ? effectivePermissions.includes(permission)
      : hasPermission(permission);
  const canCreate = hasAccess("workers:create");
  const canAssign = hasAccess("workers:assign-project");
  const [workerSearch, setWorkerSearch] = useState("");
  const roster = useProjectWorkers(organizationId, projectId, {
    pageSize: 100,
    assignmentScope: "ALL_ACTIVE",
  });
  const workers = useWorkers(organizationId, {
    search: workerSearch,
    status: "ACTIVE",
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const assignWorker = useAssignWorker(organizationId, projectId);
  const updateAssignment = useUpdateWorkerAssignment(organizationId, projectId);
  const endAssignment = useEndWorkerAssignment(organizationId, projectId);
  const rosterRows = useMemo(
    () => roster.data?.data ?? [],
    [roster.data?.data],
  );
  const rosterByWorkerId = useMemo(
    () => new Map(rosterRows.map((worker) => [worker.id, worker])),
    [rosterRows],
  );
  const workerRows = workers.data?.data ?? [];
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
  const [actionError, setActionError] = useState("");

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningWorker) return;
    setActionError("");
    try {
      await assignWorker.mutateAsync({
        workerId: assigningWorker.id,
        input: {
          startsOn: assignStartsOn,
        },
      });
      setAssigningWorker(null);
      setAssignStartsOn(today());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to assign worker",
      );
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
    if (!editingWorker) return;
    setActionError("");
    try {
      await updateAssignment.mutateAsync({
        workerId: editingWorker.id,
        input: {
          startsOn: editForm.startsOn,
          endsOn: editForm.endsOn || null,
        },
      });
      setEditingWorker(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update assignment",
      );
    }
  }

  async function submitEnd() {
    if (!endingWorker) return;
    setActionError("");
    try {
      await endAssignment.mutateAsync({
        workerId: endingWorker.id,
        input: {
          endsOn: endForm.endsOn,
          reason: endForm.reason || null,
        },
      });
      setEndingWorker(null);
      setEndForm({ endsOn: today(), reason: "" });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to end assignment",
      );
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-body">Workers</h2>
          <p className="text-[13px] text-sub">
            Active project roster used later by Attendance, Wages, and Kharchi.
          </p>
        </div>
        {canCreate && canAssign ? (
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

      {actionError ? (
        <p className="text-[13px] text-red-600">{actionError}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="w-full sm:w-72"
          type="search"
          placeholder="Search organization workers"
          aria-label="Search organization workers"
          value={workerSearch}
          onChange={(event) => setWorkerSearch(event.target.value)}
        />
        <p className="text-[12px] text-sub">
          {rosterByWorkerId.size} assigned to this Project
        </p>
      </div>

      {roster.isLoading || workers.isLoading ? (
        <p className="text-[13px] text-body">Loading organization workers</p>
      ) : roster.isError || workers.isError ? (
        <p className="text-[13px] text-red-600">
          Unable to load organization workers
        </p>
      ) : workerRows.length === 0 ? (
        <p className="text-[13px] text-body">
          No active workers are available in this organization.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Daily Rate</TableHead>
              <TableHead>Project Status</TableHead>
              {canAssign ? <TableHead>Actions</TableHead> : null}
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
                  <TableCell>{worker.baseDailyRate ?? "-"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={assignedWorker ? "active" : "inactive"}>
                      {assignedWorker ? "ASSIGNED" : "UNASSIGNED"}
                    </StatusBadge>
                  </TableCell>
                  {canAssign ? (
                    <TableCell>
                      {assignedWorker ? (
                        <RowActionMenu
                          actions={[
                            {
                              label: "Edit assignment dates",
                              icon: <Pencil size={15} />,
                              onSelect: () => openEdit(assignedWorker),
                            },
                            {
                              label: "End assignment",
                              icon: <UserMinus size={15} />,
                              destructive: true,
                              onSelect: () => setEndingWorker(assignedWorker),
                            },
                          ]}
                        />
                      ) : (
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
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={Boolean(assigningWorker)}
        title={`Assign ${assigningWorker?.name ?? "worker"}?`}
        description="Trade and daily rate come from the Worker record. Choose only when this Project assignment starts."
        onOpenChange={(open) => !open && setAssigningWorker(null)}
      >
        <form className="space-y-4" onSubmit={submitAssignment}>
          <div className="grid gap-2 rounded-inner border border-hairline bg-sunken/40 p-3 text-[12px] text-body sm:grid-cols-2">
            <span>Trade: {assigningWorker?.trade ?? "-"}</span>
            <span>
              Daily rate: {assigningWorker?.baseDailyRate ?? "Not set"}
            </span>
          </div>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
              Assignment start date
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
              onClick={() => setAssigningWorker(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={assignWorker.isPending}>
              {assignWorker.isPending ? "Assigning" : "Assign Worker"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(editingWorker)}
        title={`Update ${editingWorker?.name ?? "worker"} assignment`}
        description="Update only the Project assignment dates. Trade and daily rate come from the Worker record."
        onOpenChange={(open) => !open && setEditingWorker(null)}
      >
        <form className="space-y-3" onSubmit={submitEdit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
                Start date
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-sub">
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
              onClick={() => setEditingWorker(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateAssignment.isPending}>
              {updateAssignment.isPending ? "Saving" : "Save Assignment"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(endingWorker)}
        title={`End ${endingWorker?.name ?? "worker"} assignment?`}
        description="The assignment history remains available and the worker stays active in the organization."
        onOpenChange={(open) => !open && setEndingWorker(null)}
        footer={
          <ConfirmDialogActions
            confirmLabel={endAssignment.isPending ? "Ending" : "End Assignment"}
            onCancel={() => setEndingWorker(null)}
            confirmProps={{
              disabled: endAssignment.isPending || !endForm.endsOn,
              onClick: () => void submitEnd(),
            }}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="date"
            value={endForm.endsOn}
            onChange={(event) =>
              setEndForm({ ...endForm, endsOn: event.target.value })
            }
            required
          />
          <Input
            placeholder="Reason (optional)"
            value={endForm.reason}
            onChange={(event) =>
              setEndForm({ ...endForm, reason: event.target.value })
            }
          />
        </div>
      </Dialog>
    </Card>
  );
}
