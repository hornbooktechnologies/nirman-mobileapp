"use client";

import { useRef, useState } from "react";
import type { AttendanceDuration, AttendanceException } from "@nirman-app/shared";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { ValidatedForm, ValidatedField } from "@/components/ui/validated-form";
import { useRemoveAttendanceException, useUpdateAttendanceException } from "../hooks/use-attendance";

export function AttendanceHistoryCorrection({ organizationId, projectId, workerName, exception, mode, close, canUpdate }: {
  organizationId: string;
  projectId: string;
  workerName: string;
  exception: AttendanceException;
  mode: "edit" | "restore";
  canUpdate: boolean;
  close: () => void;
}) {
  const update = useUpdateAttendanceException(organizationId, projectId);
  const remove = useRemoveAttendanceException(organizationId, projectId);
  const [duration, setDuration] = useState<AttendanceDuration>(exception.duration);
  const [reasonCode, setReasonCode] = useState(exception.reasonCode ?? "");
  const [notes, setNotes] = useState(exception.notes ?? "");
  const [error, setError] = useState("");
  const busy = update.isPending || remove.isPending;
  const lock = useRef(false);
  const dirty = duration !== exception.duration || reasonCode !== (exception.reasonCode ?? "") || notes !== (exception.notes ?? "");
  function requestClose() {
    if (!lock.current && (!dirty || window.confirm("Discard changes to this absence?"))) close();
  }
  async function submit() {
    if (busy || lock.current || !canUpdate) return;
    lock.current = true;
    setError("");
    try {
      if (mode === "restore") await remove.mutateAsync(exception.id);
      else await update.mutateAsync({ exceptionId: exception.id, input: { duration, reasonCode: reasonCode.trim() || null, notes: notes.trim() || null } });
      close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Attendance could not be saved. Try again."); }
    finally { lock.current = false; }
  }
  return <Dialog open title={mode === "restore" ? "Restore Present" : "Edit attendance"} description={`${workerName} · ${exception.workDate}`} onOpenChange={(open) => { if (!open) requestClose(); }} footer={<>
    <Button variant="outline" disabled={busy} onClick={requestClose}>Cancel</Button>
    <Button type="submit" form="attendance-history-correction" disabled={busy || !canUpdate}>{busy ? "Saving" : mode === "restore" ? "Restore Present" : "Update attendance"}</Button>
  </>}>
    <ValidatedForm id="attendance-history-correction" className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      <ValidatedField className="grid gap-1">Worker<Input readOnly value={workerName} /></ValidatedField>
      <ValidatedField className="grid gap-1">Attendance date<Input readOnly type="date" value={exception.workDate} /></ValidatedField>
      {mode === "restore" ? <p>Remove this absence exception? Attendance will follow the current calendar and effective assignment.</p> : <fieldset disabled={busy || !canUpdate} className="space-y-4">
        <ValidatedField className="grid gap-1">Duration<Select required value={duration} onChange={(event) => setDuration(event.target.value as AttendanceDuration)}><option value="FULL_DAY">Full day</option><option value="HALF_DAY">Half day</option></Select></ValidatedField>
        <ValidatedField className="grid gap-1">Reason<Input maxLength={80} value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} /></ValidatedField>
        <ValidatedField className="grid gap-1">Notes<Textarea maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></ValidatedField>
      </fieldset>}
    </ValidatedForm>
  </Dialog>;
}
