"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PROJECT_PROGRESS_STAGES, type ProjectProgressStage } from "@nirman-app/shared";
import { Button, Card, LoadingState, StatusBadge } from "@/components/ui";
import { validDate } from "@/features/attendance/date-utils";
import { ProgressHistoryFilters, type ProgressHistoryFiltersValue } from "@/features/activity-collection-filters";
import { ProjectActivityNavigation } from "@/features/project-activity-navigation";
import { activityFilterHref, activityOrigin } from "@/features/activity-query";
import { useProgressHistory, useProgressSummary } from "../hooks/use-progress";
import { canUpdateProgress, progressKey, stageLabel } from "../progress-rules";
import { progressService } from "../services/progress.service";
import { ProgressWorkspace, type ProgressContext } from "./progress-workspace";
import { ProgressForm } from "./progress-form";
import { dateLabel, Failure } from "./progress-ui";

function ProjectProgress({ context: c }: { context: ProgressContext }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rawStage = params.get("stage") ?? "";
  const stage = PROJECT_PROGRESS_STAGES.includes(rawStage as ProjectProgressStage) ? rawStage as ProjectProgressStage : undefined;
  const dateFrom = params.get("dateFrom") ?? "";
  const dateTo = params.get("dateTo") ?? "";
  const invalid = Boolean((dateFrom && !validDate(dateFrom)) || (dateTo && !validDate(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo));
  const rawPage = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters = { stage, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
  const summary = useProgressSummary(c.org, c.project);
  const history = useProgressHistory(c.org, c.project, { ...filters, page, pageSize: 25 }, !invalid);
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    if (name !== "page") next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  function applyFilters(nextFilters: ProgressHistoryFiltersValue) {
    router.replace(activityFilterHref(pathname, new URLSearchParams(params.toString()), nextFilters, ["stage", "dateFrom", "dateTo"]), { scroll: false });
  }
  async function download() {
    if (exportController.current || invalid) return;
    const controller = new AbortController(); exportController.current = controller;
    setExporting(true); setExportError("");
    try {
      const csv = await progressService.export(c.org, c.project, filters, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `project-progress-${c.project}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess("CSV downloaded for the selected filters.");
    } catch (e) { if (!controller.signal.aborted) setExportError(e instanceof Error ? e.message : "Export failed. Please retry."); }
    finally { if (!controller.signal.aborted) { setExporting(false); exportController.current = null; } }
  }
  const canUpdate = canUpdateProgress(c.permissions, c.active);
  return <div className="space-y-5">
    <ProjectActivityNavigation projectId={c.project} permissions={c.permissions} current="progress" date={summary.data?.latestUpdate?.updateDate} origin={activityOrigin(pathname, new URLSearchParams(params.toString()))} returnTo={params.get("returnTo")} />
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Project Progress</h1><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { void cache.invalidateQueries(); }}>Refresh</Button>{canUpdate && <Button disabled={!summary.data || summary.isError} onClick={() => setOpen(true)}>Record progress</Button>}</div></header>
    {success && <p role="status">{success}</p>}
    {summary.isPending ? <LoadingState label="Loading progress summary" /> : summary.isError ? <Failure error={summary.error} retry={() => void summary.refetch()} /> : <>
      <Card><div className="grid gap-5 sm:grid-cols-3"><div><p className="text-sm text-sub">Overall progress</p><p className="text-3xl font-semibold tabular-nums">{summary.data.overallPercentage}%</p></div><div><p className="text-sm text-sub">Stage coverage</p><p>{summary.data.updatedStages} of {summary.data.stages.length} updated · {summary.data.completedStages} complete</p></div><div><p className="text-sm text-sub">Latest update</p><p>{summary.data.latestUpdate ? `${stageLabel(summary.data.latestUpdate.stage)} · ${dateLabel(summary.data.latestUpdate.updateDate)}` : "No updates yet"}</p></div></div><p className="mt-4 text-sm text-sub">Overall progress includes all nine stages equally. Stages without updates contribute 0%.</p></Card>
      <section aria-label="Construction stages" className="grid gap-3 sm:grid-cols-3">{summary.data.stages.map(s => <Card key={s.stage} className="space-y-2"><div className="flex flex-wrap justify-between gap-2 font-semibold"><h2 className="text-base font-semibold">{stageLabel(s.stage)}</h2><span className="tabular-nums">{s.percentage}%</span></div><progress aria-label={`${stageLabel(s.stage)} completion`} max={100} value={s.percentage} className="h-2 w-full accent-lime" /><StatusBadge tone={!s.lastUpdate ? "neutral" : s.percentage === 100 ? "success" : "info"}>{!s.lastUpdate ? "Not updated" : s.percentage === 100 ? "Complete" : "In progress"}</StatusBadge><p className="text-sm text-sub">{s.lastUpdate ? `${dateLabel(s.lastUpdate.updateDate)} · ${s.lastUpdate.updatedBy}` : "No update recorded"}</p></Card>)}</section>
    </>}
    <section className="space-y-4" aria-labelledby="progress-history"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="progress-history" className="text-xl font-semibold">Update history</h2>{c.permissions.includes("progress:export") && <Button variant="outline" disabled={exporting || invalid} onClick={() => void download()}>{exporting ? "Preparing CSV…" : "Export CSV"}</Button>}</div>
      {c.permissions.includes("gallery:read") && <p className="text-sm text-sub">Project gallery is available above. Photos are not attached to individual progress updates in the current API.</p>}
      {exportError && <p role="alert">{exportError} Use Export CSV to retry.</p>}
      <ProgressHistoryFilters value={filters} onApply={applyFilters} stageLabel={stageLabel} />
      {(stage || dateFrom || dateTo) && <Button variant="outline" onClick={() => applyFilters({})}>Clear all</Button>}
      {invalid ? <p role="alert">Enter valid dates with the end date on or after the start date.</p> : history.isPending ? <LoadingState label="Loading update history" /> : history.isError ? <Failure error={history.error} retry={() => void history.refetch()} /> : <>
        {history.isFetching && <p role="status">Refreshing history…</p>}
        {!history.data.items.length && <Card>{stage || dateFrom || dateTo ? "No updates match these filters." : "No progress updates recorded yet."}</Card>}
        <ol className="space-y-3">{history.data.items.map(row => <li key={row.id}><Card><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{stageLabel(row.stage)}</h3><p className="text-sm text-sub">{dateLabel(row.updateDate)} · {row.updatedBy}</p></div><div className="text-right"><p className="font-semibold tabular-nums">{row.previousPercentage === null ? "First update" : `${row.previousPercentage}%`} → {row.percentage}%</p><StatusBadge tone={row.percentage < (row.previousPercentage ?? row.percentage) ? "warning" : row.percentage === 100 ? "success" : "neutral"}>{row.percentage < (row.previousPercentage ?? row.percentage) ? "Correction" : row.percentage === 100 ? "Complete" : "Recorded"}</StatusBadge></div></div><p className="mt-3 whitespace-pre-wrap break-words">{row.notes || "No notes"}</p><p className="mt-2 text-xs text-sub">Recorded {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: c.timezone }).format(new Date(row.createdAt))} IST</p></Card></li>)}</ol>
        <nav aria-label="History pagination" className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => filter("page", String(page - 1))}>Previous</Button><p className="text-sm">Page {page} of {Math.max(1, history.data.pagination.totalPages)} · {history.data.pagination.total} updates</p><Button variant="outline" disabled={page >= history.data.pagination.totalPages} onClick={() => filter("page", String(page + 1))}>Next</Button></nav>
      </>}
    </section>
    {open && canUpdate && summary.data && <ProgressForm context={c} summary={summary.data} close={() => setOpen(false)} saved={next => { cache.setQueryData([...progressKey(c.org, c.project), "summary"], next); void cache.invalidateQueries({ queryKey: progressKey(c.org, c.project) }); setOpen(false); setSuccess("Progress update recorded."); }} reload={async () => { const result = await summary.refetch(); if (result.error) throw result.error; if (!result.data) throw new Error("Summary unavailable"); return result.data; }} />}
  </div>;
}
export function ProgressPage({ projectId }: { projectId?: string }) {
  return <Suspense fallback={<LoadingState label="Loading progress" />}><ProgressWorkspace projectId={projectId}>{context => <ProjectProgress context={context} />}</ProgressWorkspace></Suspense>;
}
