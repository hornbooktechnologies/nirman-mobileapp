"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AttendanceDuration,
  AttendanceSummaryRow,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  ConfirmDialogActions,
  Dialog,
  EmptyState,
  Input,
  LoadingState,
  NotificationBanner,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useAttendanceSummary,
  useCreateAttendanceException,
  useRemoveAttendanceException,
  useUpdateAttendanceException,
} from "@/features/attendance/hooks/use-attendance";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { ApiError } from "@/lib/api/api-client";

const PAGE_SIZE = 100;

type ExceptionDraft = {
  duration: AttendanceDuration;
  reasonCode: string;
  notes: string;
};

const emptyDraft: ExceptionDraft = {
  duration: "FULL_DAY",
  reasonCode: "",
  notes: "",
};

function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "The request could not be completed. Try again.";
}

function statusLabel(row: AttendanceSummaryRow) {
  switch (row.selectedDate?.state) {
    case "ABSENT": return "Absent";
    case "HALF_DAY": return "Half day";
    case "NON_WORKING": return "Non-working";
    default: return "Present";
  }
}

function statusTone(row: AttendanceSummaryRow) {
  switch (row.selectedDate?.state) {
    case "ABSENT": return "danger" as const;
    case "HALF_DAY": return "warning" as const;
    case "NON_WORKING": return "neutral" as const;
    default: return "active" as const;
  }
}

export function MarkAttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizationId, hasPermission } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const projects = useMemo(() => access.data?.projects ?? [], [access.data?.projects]);
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const selectedProject = projects.find((project) => project.id === requestedProjectId)
    ?? projects.find((project) => project.isDefault)
    ?? projects[0]
    ?? null;
  const projectId = selectedProject?.id ?? "";
  const date = searchParams.get("date") ?? todayValue();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<AttendanceSummaryRow | null>(null);
  const [restoreRow, setRestoreRow] = useState<AttendanceSummaryRow | null>(null);
  const [draft, setDraft] = useState<ExceptionDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const permissions: readonly string[] = selectedProject?.permissions ?? [];
  const can = (permission: string) => hasPermission(permission) || permissions.includes(permission);
  const canRead = can("attendance:read");
  const canMark = can("attendance:mark");
  const canUpdate = can("attendance:update");
  const summary = useAttendanceSummary(activeOrganizationId, projectId, {
    startDate: date,
    endDate: date,
    selectedDate: date,
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const createException = useCreateAttendanceException(activeOrganizationId, projectId);
  const updateException = useUpdateAttendanceException(activeOrganizationId, projectId);
  const removeException = useRemoveAttendanceException(activeOrganizationId, projectId);
  const isSaving = createException.isPending || updateException.isPending;

  function replaceQuery(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => next.set(key, value));
    router.replace(`/attendance/mark?${next.toString()}`, { scroll: false });
    setPage(1);
  }

  function openException(row: AttendanceSummaryRow) {
    const exception = row.selectedDate?.exception;
    setEditingRow(row);
    setDraft(exception ? {
      duration: exception.duration,
      reasonCode: exception.reasonCode ?? "",
      notes: exception.notes ?? "",
    } : emptyDraft);
    setFormError("");
  }

  function closeException() {
    if (isSaving) return;
    setEditingRow(null);
    setFormError("");
  }

  const handleExceptionOpenChange = useCallback((open: boolean) => {
    if (!open && !isSaving) {
      setEditingRow(null);
      setFormError("");
    }
  }, [isSaving]);

  const handleRestoreOpenChange = useCallback((open: boolean) => {
    if (!open && !removeException.isPending) setRestoreRow(null);
  }, [removeException.isPending]);

  async function saveException() {
    if (!editingRow) return;
    setFormError("");
    const exception = editingRow.selectedDate?.exception;
    const input = {
      duration: draft.duration,
      reasonCode: draft.reasonCode.trim() || null,
      notes: draft.notes.trim() || null,
    };
    try {
      if (exception) {
        await updateException.mutateAsync({ exceptionId: exception.id, input });
      } else {
        await createException.mutateAsync({
          workerAssignmentId: editingRow.workerAssignmentId,
          workDate: date,
          exceptionType: "ABSENCE",
          ...input,
        });
      }
      setEditingRow(null);
      setSuccess(`${editingRow.worker.name} marked ${draft.duration === "FULL_DAY" ? "absent" : "half day"}.`);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  async function confirmRestore() {
    const exception = restoreRow?.selectedDate?.exception;
    if (!restoreRow || !exception) return;
    try {
      await removeException.mutateAsync(exception.id);
      setSuccess(`${restoreRow.worker.name} restored to Present.`);
      setRestoreRow(null);
    } catch (error) {
      setRestoreRow(null);
      setSuccess(`Restore failed. ${errorMessage(error)}`);
    }
  }

  const rows = summary.data?.rows ?? [];
  const nonWorking = rows.length > 0 && rows.every((row) => row.selectedDate?.state === "NON_WORKING");

  return (
    <div className="space-y-4 pb-8 text-base sm:text-[13px]">
      <PageHeader
        title="Mark attendance"
        description="Workers are Present by default. Record only Full-day or Half-day absences."
        onBack={() => router.push(projectId ? `/attendance?projectId=${projectId}` : "/attendance")}
        actions={<Link href={projectId ? `/attendance?projectId=${projectId}` : "/attendance"}><Button variant="outline"><ArrowLeft size={16} aria-hidden="true" />Attendance summary</Button></Link>}
      />

      {success ? (
        <div aria-live="polite">
          <NotificationBanner
            variant={success.startsWith("Restore failed") ? "danger" : "success"}
            title={success}
            onClose={() => setSuccess("")}
          />
        </div>
      ) : null}

      {!activeOrganizationId ? (
        <EmptyState title="No active organization" description="Select an organization before marking attendance." />
      ) : access.isLoading ? (
        <LoadingState label="Loading accessible projects" />
      ) : access.isError ? (
        <NotificationBanner variant="danger" title="Projects could not be loaded" action={<Button variant="outline" onClick={() => access.refetch()}>Retry</Button>} />
      ) : !selectedProject ? (
        <EmptyState title="No accessible projects" description="Project access is required to mark attendance." />
      ) : !canRead ? (
        <NotificationBanner variant="warning" title="Attendance is unavailable" description="Attendance read permission is required." />
      ) : (
        <>
          <Card padding="compact">
            <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px_minmax(240px,1fr)] md:items-end">
              <label className="grid gap-1.5 font-semibold">
                Project
                <Select value={projectId} onChange={(event) => replaceQuery({ projectId: event.target.value })}>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.projectCode ? ` · ${project.projectCode}` : ""}</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 font-semibold">
                Attendance date
                <Input type="date" value={date} onChange={(event) => replaceQuery({ date: event.target.value })} />
              </label>
              <label className="grid gap-1.5 font-semibold">
                Search workers
                <span className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} aria-hidden="true" />
                  <Input className="pl-9" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, code or trade" />
                </span>
              </label>
            </div>
          </Card>

          {nonWorking ? <NotificationBanner variant="info" title="Non-working day" description="Absence cannot be recorded because this date is non-working in the effective Project calendar." /> : null}

          {summary.isLoading ? (
            <LoadingState label="Loading daily roster" />
          ) : summary.isError ? (
            <NotificationBanner variant="danger" title="Daily attendance could not be loaded" description={errorMessage(summary.error)} action={<Button variant="outline" onClick={() => summary.refetch()}><RefreshCw size={15} aria-hidden="true" />Retry</Button>} />
          ) : rows.length === 0 ? (
            <EmptyState title="No workers for this date" description={search ? "No workers match your search." : "No primary worker assignments cover the selected date."} />
          ) : (
            <DailyRoster rows={rows} canMark={canMark} canUpdate={canUpdate} onEdit={openException} onRestore={setRestoreRow} />
          )}

          {summary.data && summary.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sub">Page {summary.data.meta.page} of {summary.data.meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <Button variant="outline" disabled={page >= summary.data.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={Boolean(editingRow)}
        title={editingRow?.selectedDate?.exception ? `Edit ${editingRow.worker.name}` : `Mark ${editingRow?.worker.name ?? "worker"} absent`}
        description={`Attendance exception for ${date}. Present is restored by removing the exception.`}
        onOpenChange={handleExceptionOpenChange}
        footer={<><Button variant="outline" disabled={isSaving} onClick={closeException}>Cancel</Button><Button disabled={isSaving} onClick={() => void saveException()}>{isSaving ? "Saving" : "Save absence"}</Button></>}
      >
        <div className="grid gap-4">
          {formError ? <p role="alert" className="rounded-inner bg-danger/10 px-3 py-2 text-danger">{formError}</p> : null}
          <label className="grid gap-1.5 font-semibold">
            Absence duration
            <Select value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value as AttendanceDuration }))}>
              <option value="FULL_DAY">Full day</option>
              <option value="HALF_DAY">Half day</option>
            </Select>
          </label>
          <label className="grid gap-1.5 font-semibold">
            Reason <span className="font-normal text-sub">(Optional)</span>
            <Input maxLength={80} value={draft.reasonCode} onChange={(event) => setDraft((current) => ({ ...current, reasonCode: event.target.value }))} placeholder="For example: Sick leave" />
          </label>
          <label className="grid gap-1.5 font-semibold">
            Notes <span className="font-normal text-sub">(Optional)</span>
            <Textarea maxLength={2000} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Additional details" />
          </label>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(restoreRow)}
        title={`Restore ${restoreRow?.worker.name ?? "worker"} to Present?`}
        description={`This removes the absence exception for ${date}.`}
        onOpenChange={handleRestoreOpenChange}
        footer={<ConfirmDialogActions confirmLabel={removeException.isPending ? "Restoring" : "Restore Present"} onCancel={() => setRestoreRow(null)} confirmProps={{ disabled: removeException.isPending, onClick: () => void confirmRestore() }} />}
      >
        <p>The worker will return to the automatically derived Present state.</p>
      </Dialog>
    </div>
  );
}

function DailyRoster({ rows, canMark, canUpdate, onEdit, onRestore }: { rows: AttendanceSummaryRow[]; canMark: boolean; canUpdate: boolean; onEdit: (row: AttendanceSummaryRow) => void; onRestore: (row: AttendanceSummaryRow) => void }) {
  return (
    <section aria-label="Daily worker attendance">
      <div className="hidden md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Worker</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((row) => <TableRow key={row.workerAssignmentId}><TableCell><p className="font-semibold">{row.worker.name}</p><p className="text-[12px] text-sub">{row.worker.workerCode} · {row.worker.trade}</p></TableCell><TableCell><StatusBadge tone={statusTone(row)}>{statusLabel(row)}</StatusBadge></TableCell><TableCell><div className="flex justify-end gap-2"><RowActions row={row} canMark={canMark} canUpdate={canUpdate} onEdit={onEdit} onRestore={onRestore} /></div></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row.workerAssignmentId} padding="compact"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{row.worker.name}</p><p className="text-sm text-sub">{row.worker.workerCode} · {row.worker.trade}</p></div><StatusBadge tone={statusTone(row)}>{statusLabel(row)}</StatusBadge></div><div className="mt-4 flex flex-wrap justify-end gap-2"><RowActions row={row} canMark={canMark} canUpdate={canUpdate} onEdit={onEdit} onRestore={onRestore} /></div></Card>)}</div>
    </section>
  );
}

function RowActions({ row, canMark, canUpdate, onEdit, onRestore }: { row: AttendanceSummaryRow; canMark: boolean; canUpdate: boolean; onEdit: (row: AttendanceSummaryRow) => void; onRestore: (row: AttendanceSummaryRow) => void }) {
  if (row.selectedDate?.state === "NON_WORKING") return <span className="text-sub">No action</span>;
  if (row.selectedDate?.exception) {
    if (!canUpdate) return <span className="text-sub">Read only</span>;
    return <><Button variant="outline" onClick={() => onEdit(row)}>Edit</Button><Button variant="outline" onClick={() => onRestore(row)}>Restore Present</Button></>;
  }
  return canMark ? <Button variant="outline" onClick={() => onEdit(row)}>Mark absent</Button> : <span className="text-sub">Read only</span>;
}
