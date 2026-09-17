"use client";

import { useRef, useState, type FormEvent } from "react";
import type { WorkerDetail, WorkerPrimaryProjectPeriod } from "@nirman-app/shared";
import { Button, Card, Dialog, Input, LoadingState, Select, StatusBadge } from "@/components/ui";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { useSaveWorkerPrimaryPeriod, useWorkerPrimaryPeriods } from "../hooks/use-workers";
import { workerError, workerToday } from "../worker-utils";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function WorkerPrimaryPeriods({ organizationId, worker }: { organizationId: string; worker: WorkerDetail }) {
  const { activeOrganizationTimezone } = useAuth();
  const today = workerToday(activeOrganizationTimezone ?? undefined);
  const periods = useWorkerPrimaryPeriods(organizationId, worker.id);
  const access = useProjectAccess(organizationId);
  const save = useSaveWorkerPrimaryPeriod(organizationId, worker.id);
  const [editor, setEditor] = useState<{ kind: "create" | "transfer" | "correct" | "end"; period?: WorkerPrimaryProjectPeriod } | null>(null);
  const [form, setForm] = useState({ workerAssignmentId: "", startsOn: today, endsOn: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const pending = useRef(false);
  const canManage = (projectId: string) => !access.isError && Boolean(access.data?.projects.some(project => project.id === projectId && project.status !== "ARCHIVED" && project.permissions.includes("workers:assign-project")));
  const assignments = worker.assignments.filter(assignment => canManage(assignment.projectId) && (editor?.kind === "correct" || assignment.status === "ACTIVE"));
  const selected = assignments.find(assignment => assignment.id === form.workerAssignmentId);
  const rows = [...(periods.data ?? [])].sort((a, b) => b.startsOn.localeCompare(a.startsOn));

  function open(kind: "create" | "transfer" | "correct" | "end", period?: WorkerPrimaryProjectPeriod) {
    setError(""); setSuccess(""); setEditor({ kind, period });
    setForm({ workerAssignmentId: period?.workerAssignmentId ?? "", startsOn: period?.startsOn.slice(0, 10) ?? today, endsOn: kind === "end" ? period?.endsOn?.slice(0, 10) ?? today : period?.endsOn?.slice(0, 10) ?? "" });
  }
  function close() {
    if (!pending.current && window.confirm("Discard changes to this period?")) setEditor(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || pending.current) return;
    pending.current = true; setError("");
    try {
      if (editor.period && !canManage(editor.period.projectId)) throw new Error("You do not have permission to change this period.");
      if (editor.kind !== "end" && (!selected || !canManage(selected.projectId))) throw new Error("Select an assignment you can manage.");
      if (editor.kind === "end" && editor.period) await save.mutateAsync({ kind: "end", periodId: editor.period.id, input: { endsOn: form.endsOn } });
      else {
        const input = { ...form, endsOn: form.endsOn || null };
        if (editor.kind === "transfer") await save.mutateAsync({ kind: "transfer", input: { ...input, endsOn: selected?.endsOn?.slice(0, 10) ?? null }, permittedProjectIds: access.data?.projects.filter(project => canManage(project.id)).map(project => project.id) ?? [] });
        else if (editor.kind === "correct" && editor.period) await save.mutateAsync({ kind: "correct", periodId: editor.period.id, input });
        else await save.mutateAsync({ kind: "create", input });
      }
      setEditor(null); setSuccess("Primary-project period saved. Attendance will use the updated allocation.");
    } catch (failure) {
      setError(workerError(failure));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { pending.current = false; }
  }

  return <Card className="space-y-4 text-base">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Primary-project allocation</h2><p className="text-sm text-sub">Attendance follows these dated allocations. Earlier corrections can change attendance totals.</p></div>
      {worker.status === "ACTIVE" && assignments.some(assignment => assignment.status === "ACTIVE") ? <div className="flex flex-wrap gap-2"><Button onClick={() => open("transfer")}>Change primary project</Button><Button variant="outline" onClick={() => open("create")}>Add period</Button></div> : null}
    </div>
    {success ? <p role="status" className="text-success">{success}</p> : null}
    {periods.isPending || access.isPending ? <LoadingState label="Loading allocation history" /> : periods.isError || access.isError ? <div role="alert"><p>{workerError(periods.error ?? access.error)}</p><Button variant="outline" onClick={() => { void periods.refetch(); void access.refetch(); }}>Retry</Button></div> : <>
      {!assignments.length ? <p className="text-sm text-sub">No assignments are available for you to manage. Existing allocation history is read-only.</p> : null}
      {!rows.length ? <p>No primary-project periods yet. Assign the worker to a project before adding a period.</p> : <ul className="space-y-3">
        {rows.map(period => {
          const state = period.startsOn.slice(0, 10) > today ? "Scheduled" : period.endsOn && period.endsOn.slice(0, 10) < today ? "Past" : "Current";
          return <li key={period.id} className="flex flex-wrap items-center justify-between gap-3 rounded-inner border border-hairline p-4">
            <div className="min-w-0"><p className="break-words font-semibold">{period.projectName ?? period.projectId}</p><p className="text-sm text-sub">{period.startsOn.slice(0, 10)} → {period.endsOn?.slice(0, 10) ?? "Open-ended"}</p><StatusBadge tone={state === "Current" ? "active" : "inactive"}>{state}</StatusBadge></div>
            {canManage(period.projectId) ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => open("correct", period)}>Correct period</Button><Button variant="outline" onClick={() => open("end", period)}>End period</Button></div> : null}
          </li>;
        })}
      </ul>}
      <Button variant="outline" disabled={periods.isFetching} onClick={() => void periods.refetch()}>{periods.isFetching ? "Refreshing…" : "Refresh history"}</Button>
    </>}
    <Dialog open={Boolean(editor)} title={editor?.kind === "end" ? "End primary-project period" : editor?.kind === "correct" ? "Correct primary-project period" : editor?.kind === "transfer" ? "Change primary project" : "Add primary-project period"} description="Dates must fit the assignment. Changing primary project closes the previous period on the day before the effective date and preserves later scheduled periods." onOpenChange={open => { if (!open) close(); }}>
      <form onSubmit={submit} className="space-y-4 text-base">
        {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-danger">{error}</p> : null}
        <fieldset disabled={save.isPending} className="space-y-4">
          {editor?.kind !== "end" ? <>
            <label className="grid gap-1">Project assignment *<Select required value={form.workerAssignmentId} onChange={event => setForm({ ...form, workerAssignmentId: event.target.value })}><option value="">Choose an assignment</option>{assignments.map(assignment => <option key={assignment.id} value={assignment.id}>{assignment.projectName ?? assignment.projectId} · {assignment.startsOn.slice(0, 10)} – {assignment.endsOn?.slice(0, 10) ?? "open"}</option>)}</Select></label>
            <label className="grid gap-1">Start date *<Input type="date" required min={selected?.startsOn.slice(0, 10)} max={editor?.kind === "transfer" ? selected?.endsOn?.slice(0, 10) : form.endsOn || selected?.endsOn?.slice(0, 10)} value={form.startsOn} onChange={event => setForm({ ...form, startsOn: event.target.value })} /></label>
          </> : null}
          {editor?.kind !== "transfer" ? <label className="grid gap-1">End date {editor?.kind === "end" || selected?.endsOn ? "*" : ""}<Input type="date" required={editor?.kind === "end" || Boolean(selected?.endsOn)} min={form.startsOn} max={selected?.endsOn?.slice(0, 10)} value={form.endsOn} onChange={event => setForm({ ...form, endsOn: event.target.value })} /></label> : null}
          <p className="text-sm text-sub">Both dates are inclusive. Saving historical dates can affect attendance and unconfirmed wages. The server validates the final allocation.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit">{save.isPending ? "Saving…" : "Save period"}</Button></div>
        </fieldset>
      </form>
    </Dialog>
  </Card>;
}
