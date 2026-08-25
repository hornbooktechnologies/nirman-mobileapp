"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardCheck, Download, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceSummaryRow } from "@nirman-app/shared";
import { Button, Card, Checkbox, EmptyState, Input, LoadingState, NotificationBanner, PageHeader, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { ApiError } from "@/lib/api/api-client";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { useAttendanceSummary } from "@/features/attendance/hooks/use-attendance";

const PAGE_SIZE = 20;

function dateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRange(month: string) {
  const [year, value] = month.split("-").map(Number);
  const last = new Date(year, value, 0).getDate();
  return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, "0")}` };
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed. Check your connection and try again.";
}

export function AttendancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizationId, hasPermission } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const projects = useMemo(() => access.data?.projects ?? [], [access.data?.projects]);
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? null;
  const projectId = selectedProject?.id ?? "";
  const defaultRange = monthRange(dateValue().slice(0, 7));
  const startDate = searchParams.get("startDate") ?? defaultRange.startDate;
  const endDate = searchParams.get("endDate") ?? defaultRange.endDate;
  const rawSearch = searchParams.get("search") ?? "";
  const exceptionsOnly = searchParams.get("exceptionsOnly") === "true";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [search, setSearch] = useState(rawSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch);
  const [success, setSuccess] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  function replaceQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(`/attendance?${next.toString()}`);
  }

  useEffect(() => {
    if (!access.isSuccess || projects.length === 0 || selectedProject) return;
    const fallback = projects.find((project) => project.isDefault) ?? projects[0];
    const next = new URLSearchParams(searchParams.toString());
    next.set("projectId", fallback.id);
    router.replace(`/attendance?${next.toString()}`);
  }, [access.isSuccess, projects, router, searchParams, selectedProject]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === rawSearch) return;
    replaceQuery({ search: debouncedSearch || null, page: null });
    // URL synchronization intentionally reacts to the debounced value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const query = useMemo(() => ({ startDate, endDate, search: debouncedSearch || undefined, exceptionsOnly: exceptionsOnly || undefined, page, pageSize: PAGE_SIZE }), [debouncedSearch, endDate, exceptionsOnly, page, startDate]);
  const summary = useAttendanceSummary(activeOrganizationId, projectId, query);
  const selectedPermissions: readonly string[] = selectedProject?.permissions ?? [];
  const can = (permission: string) => hasPermission(permission) || selectedPermissions.includes(permission);
  const canRead = can("attendance:read");
  const canMark = can("attendance:mark");
  const canExport = can("attendance:export");

  async function exportPeriod() {
    if (!activeOrganizationId || !projectId) return;
    setIsExporting(true);
    try {
      const csv = await attendanceService.exportCsv(activeOrganizationId, projectId, startDate, endDate);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${projectId}-${startDate}-${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setSuccess(`Export failed. ${errorMessage(error)}`); }
    finally { setIsExporting(false); }
  }

  const totals = summary.data?.totals;
  return (
    <div className="space-y-4 pb-8 text-base sm:text-[13px]">
      <PageHeader title="Attendance" description="Review worker attendance totals for a selected period." actions={<div className="flex flex-wrap gap-2">{canMark ? <Link href={projectId ? `/attendance/mark?projectId=${projectId}` : "/attendance/mark"}><Button><ClipboardCheck size={16} aria-hidden="true" />Mark attendance</Button></Link> : null}<Link href={projectId ? `/work-calendar?projectId=${projectId}` : "/work-calendar"}><Button variant="outline"><CalendarDays size={16} aria-hidden="true" />Work Calendar</Button></Link>{canExport ? <Button variant="outline" onClick={exportPeriod} disabled={isExporting || !projectId}><Download size={16} aria-hidden="true" />{isExporting ? "Exporting" : "Export"}</Button> : null}</div>} />
      {success ? <div aria-live="polite"><NotificationBanner variant={success.startsWith("Export failed") ? "danger" : "success"} title={success} onClose={() => setSuccess("")} /></div> : null}
      {!activeOrganizationId ? <EmptyState title="No active organization" description="Select an organization before opening Attendance." /> : access.isLoading ? <LoadingState label="Loading accessible projects" /> : access.isError ? <NotificationBanner variant="danger" title="Projects could not be loaded" description="Retry to restore your accessible project list." action={<Button variant="outline" onClick={() => access.refetch()}>Retry</Button>} /> : projects.length === 0 ? <EmptyState title="No accessible projects" description="Attendance becomes available after you receive access to a project." /> : !selectedProject ? <LoadingState label="Selecting an accessible project" /> : !canRead ? <NotificationBanner variant="warning" title="Attendance access removed" description="Your permissions changed. Ask an administrator for attendance read access." /> : <AttendanceContent projectId={projectId} projects={projects} startDate={startDate} endDate={endDate} search={search} setSearch={setSearch} exceptionsOnly={exceptionsOnly} replaceQuery={replaceQuery} totals={totals} summary={summary} debouncedSearch={debouncedSearch} page={page} />}
    </div>
  );
}

type ProjectOption = { id: string; name: string; projectCode: string | null };
function AttendanceContent({ projectId, projects, startDate, endDate, search, setSearch, exceptionsOnly, replaceQuery, totals, summary, debouncedSearch, page }: { projectId: string; projects: ProjectOption[]; startDate: string; endDate: string; search: string; setSearch: (value: string) => void; exceptionsOnly: boolean; replaceQuery: (updates: Record<string, string | null>) => void; totals?: { workers: number; expectedWorkingDays: number; presentDays: number; absentDays: number }; summary: ReturnType<typeof useAttendanceSummary>; debouncedSearch: string; page: number }) {
  return <><Card padding="compact"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_170px_170px_minmax(220px,1fr)_auto] xl:items-end"><label className="grid gap-1.5 font-semibold">Project<Select className="text-base sm:text-[13px]" value={projectId} onChange={(event) => replaceQuery({ projectId: event.target.value, page: null })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.projectCode ? ` · ${project.projectCode}` : ""}</option>)}</Select></label><label className="grid gap-1.5 font-semibold">Start date<Input className="text-base sm:text-[13px]" type="date" value={startDate} max={endDate} onChange={(event) => replaceQuery({ startDate: event.target.value, month: null, selectedDate: null, page: null })} /></label><label className="grid gap-1.5 font-semibold">End date<Input className="text-base sm:text-[13px]" type="date" value={endDate} min={startDate} onChange={(event) => replaceQuery({ endDate: event.target.value, month: null, selectedDate: null, page: null })} /></label><label className="grid gap-1.5 font-semibold">Search workers<span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} aria-hidden="true" /><Input className="pl-9 text-base sm:text-[13px]" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, code or trade" /></span></label><Checkbox className="min-h-10" label="With exceptions only" checked={exceptionsOnly} onChange={(event) => replaceQuery({ exceptionsOnly: event.target.checked ? "true" : null, page: null })} /></div></Card>{totals ? <section aria-label="Attendance totals" className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Metric label="Workers" value={totals.workers} /><Metric label="Expected worker-days" value={totals.expectedWorkingDays} /><Metric label="Present worker-days" value={totals.presentDays} /><Metric label="Absent worker-days" value={totals.absentDays} /></section> : null}{summary.isLoading ? <LoadingState label="Loading attendance summary" /> : summary.isError ? <NotificationBanner variant="danger" title="Attendance could not be loaded" description={errorMessage(summary.error)} action={<Button variant="outline" onClick={() => summary.refetch()}><RefreshCw size={15} aria-hidden="true" />Retry</Button>} /> : summary.data?.rows.length === 0 ? <EmptyState title={debouncedSearch || exceptionsOnly ? "No matching workers" : "No workers in this period"} description={debouncedSearch || exceptionsOnly ? "Clear or change the filters to see more workers." : "Workers appear after a primary project assignment covers the selected period."} /> : <WorkerList rows={summary.data?.rows ?? []} refreshing={summary.isFetching} projectId={projectId} startDate={startDate} endDate={endDate} />}{summary.data && summary.data.meta.totalPages > 1 ? <div className="flex items-center justify-between gap-3"><p className="text-sub">Page <span className="tabular-nums">{summary.data.meta.page}</span> of <span className="tabular-nums">{summary.data.meta.totalPages}</span></p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => replaceQuery({ page: String(page - 1) })}>Previous</Button><Button variant="outline" disabled={page >= summary.data.meta.totalPages} onClick={() => replaceQuery({ page: String(page + 1) })}>Next</Button></div></div> : null}</>;
}

function Metric({ label, value }: { label: string; value: number }) { return <Card padding="compact"><p className="text-[11px] font-bold uppercase tracking-wide text-sub">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></Card>; }
function WorkerList({ rows, refreshing, projectId, startDate, endDate }: { rows: AttendanceSummaryRow[]; refreshing: boolean; projectId: string; startDate: string; endDate: string }) { const href = (workerId: string) => `/workers/${workerId}?tab=attendance&projectId=${projectId}&startDate=${startDate}&endDate=${endDate}`; return <section aria-label="Workers" aria-busy={refreshing} className="space-y-2"><p className="sr-only" aria-live="polite">{refreshing ? "Refreshing attendance" : "Attendance loaded"}</p><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Worker</TableHead><TableHead className="text-right">Expected days</TableHead><TableHead className="text-right">Present days</TableHead><TableHead className="text-right">Absent days</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.workerAssignmentId}><TableCell><p className="font-semibold">{row.worker.name}</p><p className="text-[12px] text-sub">{row.worker.workerCode} · {row.worker.trade}</p></TableCell><TableCell className="text-right tabular-nums">{row.expectedWorkingDays}</TableCell><TableCell className="text-right tabular-nums">{row.presentDays}</TableCell><TableCell className="text-right tabular-nums">{row.absentDays}</TableCell><TableCell className="text-right"><Link href={href(row.worker.id)}><Button variant="outline">View details</Button></Link></TableCell></TableRow>)}</TableBody></Table></div><div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row.workerAssignmentId} padding="compact"><div><p className="font-semibold">{row.worker.name}</p><p className="text-sm text-sub">{row.worker.workerCode} · {row.worker.trade}</p></div><dl className="mt-4 grid grid-cols-3 gap-2 border-y border-hairline py-3 text-center"><MetricItem label="Expected" value={row.expectedWorkingDays} /><MetricItem label="Present" value={row.presentDays} /><MetricItem label="Absent" value={row.absentDays} /></dl><div className="mt-3 flex justify-end"><Link href={href(row.worker.id)}><Button variant="outline">View details</Button></Link></div></Card>)}</div></section>; }
function MetricItem({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs text-sub">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>; }
