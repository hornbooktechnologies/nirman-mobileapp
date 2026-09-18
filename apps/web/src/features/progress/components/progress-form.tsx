"use client";
import { useEffect, useRef, useState } from "react";
import { PROJECT_PROGRESS_STAGES, type ProjectProgressStage, type ProjectProgressSummary } from "@nirman-app/shared";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { ApiError } from "@/lib/api/api-client";
import { failureKind, retainAttempt, stageLabel, todayInIndia, updateErrors } from "../progress-rules";
import { progressService } from "../services/progress.service";
import type { ProgressInput } from "../types/progress.types";
import type { ProgressContext } from "./progress-workspace";

export function ProgressForm({ context, summary, close, saved, reload }: {
  context: ProgressContext; summary: ProjectProgressSummary; close: () => void;
  saved: (summary: ProjectProgressSummary) => void; reload: () => Promise<ProjectProgressSummary>;
}) {
  const [baseline, setBaseline] = useState(summary);
  const initial = summary.stages.find(s => s.percentage < 100) ?? summary.stages[0];
  const [stage, setStage] = useState<ProjectProgressStage>(initial.stage);
  const [percentage, setPercentage] = useState(String(initial.percentage));
  const [date, setDate] = useState(todayInIndia);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<ProgressInput | null>(null);
  const [mode, setMode] = useState<"edit" | "uncertain" | "stale" | "denied">("edit");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({ percentage: "", date: "", notes: "" });
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const discardMessage = mode === "uncertain" ? "The save may have succeeded. Leaving loses its retry key. Check history before recording again. Leave?" : "Discard unsaved progress changes?";
  useEffect(() => {
    if (!dirty && !attempt) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const navigate = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("a[href]") && (locked.current || !window.confirm(discardMessage))) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, attempt, discardMessage]);
  const current = baseline.stages.find(s => s.stage === stage)!;
  const previous = current.lastUpdate ? current.percentage : null;
  const requestClose = () => { if (!locked.current && (!(dirty || attempt) || window.confirm(discardMessage))) close(); };
  async function submit() {
    if (locked.current || mode === "stale" || mode === "denied") return;
    const issues = updateErrors(percentage, date, notes, previous, todayInIndia());
    if (!attempt && Object.values(issues).some(Boolean)) {
      setErrors(issues);
      document.getElementById(`progress-${Object.keys(issues).find(k => issues[k as keyof typeof issues])}`)?.focus();
      return;
    }
    const command = retainAttempt(attempt, { stage, percentage: Number(percentage), updateDate: date, notes: notes.trim() || null, expectedPreviousPercentage: previous }, () => crypto.randomUUID());
    setAttempt(command); locked.current = true; setBusy(true); setError("");
    try {
      const result = await progressService.record(context.org, context.project, command);
      if (mounted.current) saved(result);
    } catch (e) {
      if (!mounted.current) return;
      const kind = e instanceof ApiError && e.code === "PROJECT_STATUS_INVALID" ? "denied" : failureKind(e instanceof ApiError ? e.statusCode : undefined);
      setError(e instanceof Error ? e.message : "Could not save progress.");
      if (kind === "uncertain") { setMode("uncertain"); }
      else { setAttempt(null); setMode(kind === "rejected" ? "edit" : kind); }
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function review() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const next = await reload();
      if (mounted.current) { setBaseline(next); setMode("edit"); setAttempt(null); setError("Latest stage values loaded. Review your percentage and note, then save deliberately."); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Refresh failed. Retry."); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  return <Dialog open title="Record progress" description="Updates are retained in history. A correction creates a new entry." onOpenChange={requestClose} footer={<><Button variant="outline" disabled={busy} onClick={requestClose}>Cancel</Button>{mode === "stale" ? <Button disabled={busy} onClick={() => void review()}>Reload latest values</Button> : <Button disabled={busy || mode === "denied"} onClick={() => void submit()}>{busy ? "Saving…" : mode === "uncertain" ? "Retry original update" : "Save update"}</Button>}</>}>
    <form className="space-y-4 text-base [&_input]:text-base [&_input]:min-h-11 [&_select]:text-base [&_select]:min-h-11 [&_textarea]:text-base" onSubmit={e => { e.preventDefault(); void submit(); }}>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {mode === "uncertain" && <p role="alert">The outcome is unknown. Retry sends the exact original update and key.</p>}
      {mode === "stale" && <p role="alert">The stage or retry key changed. Reload current values before saving again.</p>}
      {mode === "denied" && <p role="alert">Your access changed. Close this form and refresh access.</p>}
      <fieldset disabled={busy || mode !== "edit"} className="space-y-4">
        <label className="block">Stage *<Select value={stage} onChange={e => { const next = e.target.value as ProjectProgressStage; setStage(next); setPercentage(String(baseline.stages.find(s => s.stage === next)?.percentage ?? 0)); setDirty(true); }}>{PROJECT_PROGRESS_STAGES.map(s => <option key={s} value={s}>{stageLabel(s)}</option>)}</Select></label>
        <p>Current: <strong>{current.percentage}%</strong> · {current.lastUpdate ? "Previously recorded" : "No update yet"}</p>
        <label className="block" htmlFor="progress-percentage">Percentage *</label>
        <div className="flex flex-wrap gap-2">{[0, 25, 50, 75, 100].map(n => <Button key={n} type="button" variant="outline" aria-pressed={percentage === String(n)} onClick={() => { setPercentage(String(n)); setDirty(true); }}>{n}%</Button>)}</div>
        <Input id="progress-percentage" inputMode="decimal" value={percentage} invalid={Boolean(errors.percentage)} aria-describedby="progress-percentage-error" onChange={e => { setPercentage(e.target.value); setDirty(true); }} />
        <p id="progress-percentage-error" className="text-danger">{errors.percentage}</p>
        <label className="block" htmlFor="progress-date">Update date *</label><Input id="progress-date" type="date" max={todayInIndia()} value={date} invalid={Boolean(errors.date)} aria-describedby="progress-date-error" onChange={e => { setDate(e.target.value); setDirty(true); }} /><p id="progress-date-error" className="text-danger">{errors.date}</p>
        <p className="text-sm text-sub">Dates follow India time. A backdated entry may not replace the latest stage value.</p>
        <label className="block" htmlFor="progress-notes">Notes {Number(percentage) < current.percentage ? "*" : ""}</label><Textarea id="progress-notes" maxLength={2000} value={notes} invalid={Boolean(errors.notes)} aria-describedby="progress-notes-error" onChange={e => { setNotes(e.target.value); setDirty(true); }} /><p id="progress-notes-error" className="text-danger">{errors.notes}</p>
      </fieldset>
    </form>
  </Dialog>;
}
