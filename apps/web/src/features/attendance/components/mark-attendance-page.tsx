"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AttendanceDuration,
  AttendanceSummaryRow,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Checkbox,
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
import { useUnsavedAttendanceForm } from "../use-unsaved-attendance-form";
import { validDate, workToday } from "../date-utils";
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
    case "PRESENT": return "Present";
    default: return "Unavailable";
  }
}

function statusTone(row: AttendanceSummaryRow) {
  switch (row.selectedDate?.state) {
    case "ABSENT": return "danger" as const;
    case "HALF_DAY": return "warning" as const;
    case "NON_WORKING": return "neutral" as const;
    case "PRESENT": return "active" as const;
    default: return "neutral" as const;
  }
}

export function MarkAttendancePage() {
  const { user, activeOrganizationId } = useAuth();
  const params = useSearchParams();
  const access = useProjectAccess(activeOrganizationId);
  const accessKey = JSON.stringify(access.data?.projects.map(project => [project.id, project.isDefault, project.permissions]));
  return <DailyAttendance key={`${user?.id}:${activeOrganizationId}:${accessKey}:${params.toString()}`} />;
}

function DailyAttendance() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizationId, activeOrganizationTimezone, refreshUser } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const projects = useMemo(() => (access.data?.projects ?? []).filter(project => project.permissions.includes("attendance:read")), [access.data?.projects]);
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const selectedProject = requestedProjectId ? projects.find(project => project.id === requestedProjectId) ?? null : projects.find(project => project.isDefault) ?? projects[0] ?? null;
  const projectId = selectedProject?.id ?? "";
  const date = searchParams.get("date") ?? (activeOrganizationTimezone ? workToday(activeOrganizationTimezone) : "");
  const rawSearch = searchParams.get("markSearch") ?? "";
  const [search, setSearch] = useState(rawSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const page = Math.max(1, Math.floor(Number(searchParams.get("markPage")) || 1));
  const exceptionsOnly = searchParams.get("markExceptionsOnly") === "true";
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const [editingRow, setEditingRow] = useState<AttendanceSummaryRow | null>(null);
  const [restoreRow, setRestoreRow] = useState<AttendanceSummaryRow | null>(null);
  const [draft, setDraft] = useState<ExceptionDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const permissions: readonly string[] = selectedProject?.permissions ?? [];
  const can = (permission: string) => access.isSuccess && permissions.includes(permission);
  const canRead = can("attendance:read");
  const canMark = can("attendance:mark");
  const canUpdate = can("attendance:update");
  const summary = useAttendanceSummary(activeOrganizationId, projectId, {
    startDate: date,
    endDate: date,
    selectedDate: date,
    search: debouncedSearch || undefined,
    exceptionsOnly: exceptionsOnly || undefined,
    page,
    pageSize: PAGE_SIZE,
  }, canRead && validDate(date) && Boolean(activeOrganizationTimezone));
  const createException = useCreateAttendanceException(activeOrganizationId, projectId);
  const updateException = useUpdateAttendanceException(activeOrganizationId, projectId);
  const removeException = useRemoveAttendanceException(activeOrganizationId, projectId);
  const isSaving = createException.isPending || updateException.isPending;

  function replaceQuery(updates: Record<string, string>) {
    if (isSaving || removeException.isPending || (dirty && !window.confirm("Discard changes to this absence?"))) return;
    const next = new URLSearchParams(searchParams.toString());
    if (!("markPage" in updates)) next.set("markPage", "1");
    Object.entries(updates).forEach(([key, value]) => next.set(key, value));
    router.replace(`/attendance/mark?${next.toString()}`, { scroll: false });

  }

  useEffect(() => {
    if (debouncedSearch === rawSearch) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("markSearch", debouncedSearch); next.set("markPage", "1");
    router.replace(`/attendance/mark?${next}`, { scroll: false });
    // Only a completed search edit writes the URL; navigation remounts this workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const requestedReturn = searchParams.get("returnTo");
  const backParams = new URLSearchParams(searchParams.toString());
  ["returnTo", "markSearch", "markPage", "markExceptionsOnly", "date", "workerId", "workerName"].forEach(key => backParams.delete(key));
  if (projectId) backParams.set("projectId", projectId);
  const backHref = requestedReturn && (requestedReturn.startsWith("/attendance?") || /^\/workers\/[0-9a-f-]+\?/i.test(requestedReturn)) ? requestedReturn : `/attendance?${backParams}`;

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
    if (dirty && !window.confirm("Discard changes to this absence?")) return;
    setEditingRow(null);
    setFormError("");
  }

  const originalDraft = editingRow?.selectedDate?.exception;
  const dirty = Boolean(editingRow && (draft.duration !== (originalDraft?.duration ?? "FULL_DAY") || draft.reasonCode !== (originalDraft?.reasonCode ?? "") || draft.notes !== (originalDraft?.notes ?? "")));
  const confirmDiscard = useUnsavedAttendanceForm(dirty);
  const handleExceptionOpenChange = useCallback((open: boolean) => {
    if (!open && !isSaving && (!dirty || window.confirm("Discard changes to this absence?"))) {
      setEditingRow(null);
      setFormError("");
    }
  }, [isSaving, dirty]);

  const handleRestoreOpenChange = useCallback((open: boolean) => {
    if (!open && !removeException.isPending) setRestoreRow(null);
  }, [removeException.isPending]);

  async function saveException() {
    if (!editingRow || isSaving) return;
    if (!canRead || !(editingRow.selectedDate?.exception ? canUpdate : canMark)) { setFormError("Your attendance permission changed. Refresh access before saving."); return; }
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
    if (!restoreRow || !exception || removeException.isPending || !canUpdate) return;
    try {
      await removeException.mutateAsync(exception.id);
      setSuccess(`Absence removed for ${restoreRow.worker.name}. Attendance has been refreshed.`);
      setRestoreRow(null);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  const rows = summary.data?.rows ?? [];
  const nonWorking = rows.length > 0 && rows.every((row) => row.selectedDate?.state === "NON_WORKING");

  return (
    <div className="space-y-4 pb-8 text-base [&_button]:min-h-11 [&_button]:text-sm [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_td]:text-sm [&_th]:text-sm">
      <PageHeader
        title="Mark attendance"
        description="Record full-day or half-day absences on eligible working dates. Present is derived automatically."
        onBack={() => { if (confirmDiscard()) router.push(backHref); }}
        actions={<Button variant="outline" onClick={() => { if (confirmDiscard()) router.push(backHref); }}><ArrowLeft size={16} aria-hidden="true" />Back to attendance</Button>}
      />

      {selectedProject?.status === "ARCHIVED" ? <NotificationBanner variant="info" title="Archived project" description="You are viewing attendance for an archived project. Changes remain subject to API validation." /> : null}
      <p className="text-sm text-sub">Working timezone: {activeOrganizationTimezone ?? "Unavailable"}. Eligibility uses the effective primary-project allocation for this date.</p>
      {success ? (
        <div aria-live="polite">
          <NotificationBanner
            variant="success"
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
      ) : !activeOrganizationTimezone ? (
        <NotificationBanner variant="warning" title="Organization timezone unavailable" action={<Button onClick={() => void refreshUser()}>Refresh access</Button>} />
      ) : !selectedProject ? (
        <EmptyState title={requestedProjectId ? "Project attendance access required" : "No accessible projects"} description="Select a project with effective attendance permission." action={<Button onClick={() => router.replace("/attendance/mark")}>Choose an accessible project</Button>} />
      ) : !canRead ? (
        <NotificationBanner variant="warning" title="Attendance is unavailable" description="Attendance read permission is required." />
      ) : (
        <>
          <Card padding="compact">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_minmax(0,1fr)] md:items-end">
              <label className="grid gap-1.5 font-semibold">
                Project
                <Select value={projectId} onChange={(event) => replaceQuery({ projectId: event.target.value, returnTo: "" })}>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.projectCode ? ` · ${project.projectCode}` : ""}</option>)}
                </Select>
              </label>
              <label className="grid gap-1.5 font-semibold">
                Attendance date *
                <Input required type="date" value={date} onChange={(event) => replaceQuery({ date: event.target.value })} />
              </label>
              <label className="grid gap-1.5 font-semibold">
                Search workers
                <span className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} aria-hidden="true" />
                  <Input className="pl-9" type="search" maxLength={160} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, code or trade" />
                </span>
              </label>
            </div>
          </Card>

          <Checkbox label="With exceptions only" checked={exceptionsOnly} onChange={event => replaceQuery({ markExceptionsOnly: String(event.target.checked) })} />
          {!canMark && !canUpdate ? <NotificationBanner variant="info" title="Read-only attendance" description="You can review this roster but cannot change absences." /> : null}
          {summary.data && !summary.isError ? <section aria-label="Daily attendance totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Workers", summary.data.totals.workers], ["Expected worker-days", summary.data.totals.expectedWorkingDays], ["Present worker-days", summary.data.totals.presentDays], ["Absent worker-days", summary.data.totals.absentDays]].map(([label, value]) => <Card key={label} padding="compact"><p className="text-sm text-sub">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></Card>)}</section> : null}
          {nonWorking ? <NotificationBanner variant="info" title="Non-working day" description="Absence cannot be recorded because this date is non-working in the effective Project calendar." /> : null}

          {!validDate(date) ? <p role="alert" className="text-danger">Choose a valid attendance date.</p> : summary.isLoading ? (
            <LoadingState label="Loading daily roster" />
          ) : summary.isError ? (
            <NotificationBanner variant="danger" title="Daily attendance could not be loaded" description={errorMessage(summary.error)} action={<Button variant="outline" onClick={() => summary.refetch()}><RefreshCw size={15} aria-hidden="true" />Retry</Button>} />
          ) : rows.length === 0 ? (
            <EmptyState title="No workers for this date" description={search || exceptionsOnly ? "No workers match your filters. Clear search or the exceptions-only filter." : "No primary worker assignments cover the selected date."} />
          ) : (
            <DailyRoster projectId={projectId} rows={rows} canMark={canMark} canUpdate={canUpdate} onEdit={openException} onRestore={row => { setFormError(""); setRestoreRow(row); }} />
          )}

          {summary.data && page > Math.max(1, summary.data.meta.totalPages) ? <NotificationBanner variant="info" title="This page is no longer available" action={<Button onClick={() => replaceQuery({ markPage: "1" })}>Return to first page</Button>} /> : null}
          {summary.data && summary.data.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sub">Page {summary.data.meta.page} of {summary.data.meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => replaceQuery({ markPage: String(page - 1) })}>Previous</Button>
                <Button variant="outline" disabled={page >= summary.data.meta.totalPages} onClick={() => replaceQuery({ markPage: String(page + 1) })}>Next</Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={Boolean(editingRow) && canRead}
        title={editingRow?.selectedDate?.exception ? `Edit ${editingRow.worker.name}` : `Mark ${editingRow?.worker.name ?? "worker"} absent`}
        description={`Attendance exception for ${date}. Removing it restores attendance derived from the calendar and assignment.`}
        onOpenChange={handleExceptionOpenChange}
        footer={<><Button variant="outline" disabled={isSaving} onClick={closeException}>Cancel</Button><Button type="submit" form="attendance-exception" disabled={isSaving || !canRead || !(editingRow?.selectedDate?.exception ? canUpdate : canMark)}>{isSaving ? "Saving" : "Save absence"}</Button></>}
      >
        <form id="attendance-exception" className="grid gap-4 text-base" onSubmit={event => { event.preventDefault(); void saveException(); }}>
          {formError ? <p role="alert" className="rounded-inner bg-danger/10 px-3 py-2 text-danger">{formError}</p> : null}
          <label className="grid gap-1.5 font-semibold">
            Absence duration *
            <Select className="text-base" required disabled={isSaving} value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value as AttendanceDuration }))}>
              <option value="FULL_DAY">Full day</option>
              <option value="HALF_DAY">Half day</option>
            </Select>
          </label>
          <label className="grid gap-1.5 font-semibold">
            Reason
            <Input className="text-base" disabled={isSaving} maxLength={80} value={draft.reasonCode} onChange={(event) => setDraft((current) => ({ ...current, reasonCode: event.target.value }))} placeholder="For example: Sick leave" />
          </label>
          <label className="grid gap-1.5 font-semibold">
            Notes
            <Textarea className="text-base" disabled={isSaving} maxLength={2000} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Additional details" />
          </label>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(restoreRow) && canRead}
        title={`Remove absence for ${restoreRow?.worker.name ?? "worker"}?`}
        description={`This removes the absence exception for ${date}.`}
        onOpenChange={handleRestoreOpenChange}
        footer={<><Button variant="outline" disabled={removeException.isPending} onClick={() => setRestoreRow(null)}>Cancel</Button><Button disabled={removeException.isPending || !canUpdate} onClick={() => void confirmRestore()}>{removeException.isPending ? "Removing" : "Remove absence"}</Button></>}
      >
        {formError ? <p role="alert" className="text-danger">{formError}</p> : null}
        <p>The absence exception will be removed. Attendance will follow the current calendar and effective assignment.</p>
      </Dialog>
    </div>
  );
}

function DailyRoster({ projectId, rows, canMark, canUpdate, onEdit, onRestore }: { projectId: string; rows: AttendanceSummaryRow[]; canMark: boolean; canUpdate: boolean; onEdit: (row: AttendanceSummaryRow) => void; onRestore: (row: AttendanceSummaryRow) => void }) {
  return (
    <section aria-label="Daily worker attendance">
      <div className="hidden md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Worker</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{rows.map((row) => <TableRow key={row.workerAssignmentId}><TableCell><WorkerHistoryLink row={row} projectId={projectId} /><p className="text-[12px] text-sub">{row.worker.workerCode} · {row.worker.trade}</p></TableCell><TableCell><StatusBadge tone={statusTone(row)}>{statusLabel(row)}</StatusBadge></TableCell><TableCell><div className="flex justify-end gap-2"><RowActions row={row} canMark={canMark} canUpdate={canUpdate} onEdit={onEdit} onRestore={onRestore} /></div></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row.workerAssignmentId} padding="compact"><div className="flex flex-wrap items-start justify-between gap-2"><div><WorkerHistoryLink row={row} projectId={projectId} /><p className="text-sm text-sub">{row.worker.workerCode} · {row.worker.trade}</p></div><StatusBadge tone={statusTone(row)}>{statusLabel(row)}</StatusBadge></div><div className="mt-4 flex flex-wrap justify-end gap-2"><RowActions row={row} canMark={canMark} canUpdate={canUpdate} onEdit={onEdit} onRestore={onRestore} /></div></Card>)}</div>
    </section>
  );
}

function RowActions({ row, canMark, canUpdate, onEdit, onRestore }: { row: AttendanceSummaryRow; canMark: boolean; canUpdate: boolean; onEdit: (row: AttendanceSummaryRow) => void; onRestore: (row: AttendanceSummaryRow) => void }) {
  if (!row.selectedDate) return <span className="text-sub">Date unavailable</span>;
  if (row.selectedDate.state === "NON_WORKING") return <span className="text-sub">No action</span>;
  if (row.selectedDate?.exception) {
    if (!canUpdate) return <span className="text-sub">Read only</span>;
    return <><Button variant="outline" onClick={() => onEdit(row)}>Edit</Button><Button variant="outline" onClick={() => onRestore(row)}>Restore Present</Button></>;
  }
  return canMark ? <Button variant="outline" onClick={() => onEdit(row)}>Mark absent</Button> : <span className="text-sub">Read only</span>;
}

function WorkerHistoryLink({ row, projectId }: { row: AttendanceSummaryRow; projectId: string }) {
  const params = useSearchParams();
  const next = new URLSearchParams(params.toString());
  next.set("workerId", row.worker.id);
  next.set("workerName", row.worker.name);
  next.set("projectId", projectId);
  next.set("startDate", row.selectedDate?.date ?? "");
  next.set("endDate", row.selectedDate?.date ?? "");
  next.delete("returnTo");
  return <Link className="font-semibold underline decoration-hairline underline-offset-4" href={`/attendance?${next}`}>{row.worker.name}</Link>;
}
