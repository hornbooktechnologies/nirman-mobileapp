"use client";

import Link from "next/link";
import { Pencil, Plus, UserMinus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ConfirmDialogActions,
  Dialog,
  Input,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useAssignWorker,
  useEndWorkerAssignment,
  useProjectWorkers,
  useUpdateWorkerAssignment,
  useUpdateWorkerRate,
  useWorkers,
} from "@/features/workers/hooks/use-workers";
import type { ProjectWorkerRosterItem } from "@/features/workers/types/workers.types";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ENDED: "inactive",
} as const;

const today = () => new Date().toISOString().slice(0, 10);

export function ProjectWorkersPanel({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("workers:create");
  const canAssign = hasPermission("workers:assign-project");
  const roster = useProjectWorkers(organizationId, projectId, { pageSize: 100 });
  const workers = useWorkers(organizationId, {
    status: "ACTIVE",
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
  const assignWorker = useAssignWorker(organizationId, projectId);
  const updateAssignment = useUpdateWorkerAssignment(organizationId, projectId);
  const endAssignment = useEndWorkerAssignment(organizationId, projectId);
  const rosterRows = useMemo(() => roster.data?.data ?? [], [roster.data?.data]);
  const assignedWorkerIds = useMemo(
    () => new Set(rosterRows.map((worker) => worker.id)),
    [rosterRows],
  );
  const availableWorkers = (workers.data?.data ?? []).filter(
    (worker) => !assignedWorkerIds.has(worker.id),
  );
  const [assignForm, setAssignForm] = useState({
    workerId: "",
    roleLabel: "",
    dailyRate: "",
    startsOn: today(),
  });
  const [editingWorker, setEditingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [editForm, setEditForm] = useState({
    roleLabel: "",
    startsOn: today(),
    endsOn: "",
    dailyRate: "",
    effectiveDate: today(),
  });
  const updateRate = useUpdateWorkerRate(
    organizationId,
    projectId,
    editingWorker?.id ?? "",
  );
  const [endingWorker, setEndingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [endForm, setEndForm] = useState({ endsOn: today(), reason: "" });
  const [actionError, setActionError] = useState("");

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignForm.workerId) return;
    setActionError("");
    try {
      await assignWorker.mutateAsync({
        workerId: assignForm.workerId,
        input: {
          roleLabel: assignForm.roleLabel || null,
          dailyRate: assignForm.dailyRate || null,
          startsOn: assignForm.startsOn,
        },
      });
      setAssignForm({ workerId: "", roleLabel: "", dailyRate: "", startsOn: today() });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to assign worker");
    }
  }

  function openEdit(worker: ProjectWorkerRosterItem) {
    setActionError("");
    setEditingWorker(worker);
    setEditForm({
      roleLabel: worker.currentAssignment.roleLabel ?? "",
      startsOn: worker.currentAssignment.startsOn.slice(0, 10),
      endsOn: worker.currentAssignment.endsOn?.slice(0, 10) ?? "",
      dailyRate: worker.currentAssignment.dailyRate ?? "",
      effectiveDate: today(),
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
          roleLabel: editForm.roleLabel || null,
          startsOn: editForm.startsOn,
          endsOn: editForm.endsOn || null,
        },
      });
      if (
        editForm.dailyRate !== "" &&
        editForm.dailyRate !== (editingWorker.currentAssignment.dailyRate ?? "")
      ) {
        await updateRate.mutateAsync({
          dailyRate: editForm.dailyRate,
          effectiveDate: editForm.effectiveDate,
          reason: "Project roster update",
        });
      }
      setEditingWorker(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update assignment");
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
      setActionError(error instanceof Error ? error.message : "Unable to end assignment");
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
          <Link href={`/workers/new?organizationId=${organizationId}&projectId=${projectId}`}>
            <Button size="sm">
              <Plus size={16} />
              Add New Worker
            </Button>
          </Link>
        ) : null}
      </div>

      {canAssign ? (
        <form
          className="grid gap-3 rounded-inner border border-hairline bg-sunken/40 p-4 lg:grid-cols-[minmax(220px,1fr)_180px_150px_160px_auto]"
          onSubmit={submitAssignment}
        >
          <Select
            aria-label="Existing worker"
            value={assignForm.workerId}
            onChange={(event) =>
              setAssignForm({ ...assignForm, workerId: event.target.value })
            }
            required
          >
            <option value="">Assign an existing worker</option>
            {availableWorkers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.workerCode} · {worker.name} · {worker.trade}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Project role"
            value={assignForm.roleLabel}
            onChange={(event) =>
              setAssignForm({ ...assignForm, roleLabel: event.target.value })
            }
          />
          <Input
            type="number"
            min="0"
            placeholder="Daily rate"
            value={assignForm.dailyRate}
            onChange={(event) =>
              setAssignForm({ ...assignForm, dailyRate: event.target.value })
            }
          />
          <Input
            type="date"
            value={assignForm.startsOn}
            onChange={(event) =>
              setAssignForm({ ...assignForm, startsOn: event.target.value })
            }
            required
          />
          <Button type="submit" size="sm" disabled={assignWorker.isPending}>
            {assignWorker.isPending ? "Assigning" : "Assign"}
          </Button>
        </form>
      ) : null}

      {actionError ? <p className="text-[13px] text-red-600">{actionError}</p> : null}

      {roster.isLoading ? (
        <p className="text-[13px] text-body">Loading project workers</p>
      ) : roster.isError ? (
        <p className="text-[13px] text-red-600">Unable to load project workers</p>
      ) : rosterRows.length === 0 ? (
        <p className="text-[13px] text-body">No active workers assigned to this project.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
              {canAssign ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rosterRows.map((worker) => (
              <TableRow key={worker.currentAssignment.id}>
                <TableCell>
                  <Link href={`/workers/${worker.id}?organizationId=${organizationId}`}>
                    {worker.workerCode}
                  </Link>
                </TableCell>
                <TableCell>{worker.name}</TableCell>
                <TableCell>{worker.trade}</TableCell>
                <TableCell>{worker.currentAssignment.dailyRate ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone[worker.currentAssignment.status]}>
                    {worker.currentAssignment.status}
                  </StatusBadge>
                </TableCell>
                {canAssign ? (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(worker)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEndingWorker(worker)}
                      >
                        <UserMinus size={14} /> End
                      </Button>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={Boolean(editingWorker)}
        title={`Update ${editingWorker?.name ?? "worker"} assignment`}
        description="Change project role, dates, or the current pre-Attendance rate."
        onOpenChange={(open) => !open && setEditingWorker(null)}
      >
        <form className="space-y-3" onSubmit={submitEdit}>
          <Input
            placeholder="Project role"
            value={editForm.roleLabel}
            onChange={(event) => setEditForm({ ...editForm, roleLabel: event.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={editForm.startsOn}
              onChange={(event) => setEditForm({ ...editForm, startsOn: event.target.value })}
              required
            />
            <Input
              type="date"
              value={editForm.endsOn}
              onChange={(event) => setEditForm({ ...editForm, endsOn: event.target.value })}
            />
            <Input
              type="number"
              min="0"
              placeholder="Daily rate"
              value={editForm.dailyRate}
              onChange={(event) => setEditForm({ ...editForm, dailyRate: event.target.value })}
            />
            <Input
              type="date"
              value={editForm.effectiveDate}
              onChange={(event) => setEditForm({ ...editForm, effectiveDate: event.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingWorker(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAssignment.isPending || updateRate.isPending}>
              {updateAssignment.isPending || updateRate.isPending ? "Saving" : "Save Assignment"}
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
            onChange={(event) => setEndForm({ ...endForm, endsOn: event.target.value })}
            required
          />
          <Input
            placeholder="Reason (optional)"
            value={endForm.reason}
            onChange={(event) => setEndForm({ ...endForm, reason: event.target.value })}
          />
        </div>
      </Dialog>
    </Card>
  );
}
