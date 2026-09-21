"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardCheck, Download, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceSummaryRow } from "@nirman-app/shared";
import { Button, Card, Checkbox, EmptyState, Input, LoadingState, NotificationBanner, PageHeader, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { WorkerAttendancePanel } from "@/features/workers/components/worker-attendance-panel";
import { periodError, workMonthRange, workToday } from "../date-utils";
import { ApiError } from "@/lib/api/api-client";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import { useAttendanceSummary } from "@/features/attendance/hooks/use-attendance";

const PAGE_SIZE = 20;

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "The request could not be completed. Check your connection and try again.";
}

export function AttendancePage() {
  const { user, activeOrganizationId } = useAuth();
  const params = useSearchParams();
  const access = useProjectAccess(activeOrganizationId);
  const accessKey = JSON.stringify(access.data?.projects.map(project => [project.id, project.isDefault, project.permissions]));
  return <AttendanceWorkspace key={`${user?.id}:${activeOrganizationId}:${accessKey}:${params.toString()}`} />;
}

function AttendanceWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganizationId, activeOrganizationTimezone, hasPermission, refreshUser } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const projects = useMemo(() => (access.data?.projects ?? []).filter(project => project.permissions.includes("attendance:read")), [access.data?.projects]);
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const selectedProject = requestedProjectId ? projects.find((project) => project.id === requestedProjectId) ?? null : projects.find(project => project.isDefault) ?? projects[0] ?? null;
  const projectId = selectedProject?.id ?? "";
  const defaultRange = workMonthRange(activeOrganizationTimezone ? workToday(activeOrganizationTimezone).slice(0, 7) : "2000-01");
  const startDate = searchParams.get("startDate") ?? defaultRange.startDate;
  const endDate = searchParams.get("endDate") ?? defaultRange.endDate;
  const invalidPeriod = periodError(startDate, endDate);
  const workerId = searchParams.get("workerId") ?? "";
  const rawSearch = searchParams.get("search") ?? "";
  const exceptionsOnly = searchParams.get("exceptionsOnly") === "true";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [search, setSearch] = useState(rawSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch);
  const [success, setSuccess] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function replaceQuery(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(`/attendance?${next.toString()}`);
  }

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

  const selectedPermissions: readonly string[] = selectedProject?.permissions ?? [];
  const can = (permission: string) => access.isSuccess && selectedPermissions.includes(permission);
  const canRead = can("attendance:read");
  const canMark = can("attendance:mark") || can("attendance:update");
  const canExport = can("attendance:export");
  const summary = useAttendanceSummary(activeOrganizationId, projectId, query, canRead && Boolean(activeOrganizationTimezone) && !workerId);
  const context = new URLSearchParams(searchParams.toString());
  if (projectId) context.set("projectId", projectId);
  context.set("startDate", startDate); context.set("endDate", endDate);
  const summaryContext = new URLSearchParams(context); summaryContext.delete("workerId"); summaryContext.delete("tab"); summaryContext.delete("workerName");
  const dailyContext = new URLSearchParams(context); dailyContext.set("returnTo", `/attendance?${summaryContext}`);

  async function exportPeriod() {
    if (!activeOrganizationId || !projectId || !canExport || invalidPeriod || isExporting) return;
    setIsExporting(true);
    try {
      const csv = await attendanceService.exportCsv(activeOrganizationId, projectId, startDate, endDate);
      if (!mounted.current) return;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${projectId}-${startDate}-${endDate}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccess("Attendance CSV downloaded for the full selected period. Search and exception filters do not limit the export.");
    } catch (error) { setSuccess(`Export failed. ${errorMessage(error)}`); }
    finally { setIsExporting(false); }
  }

  const totals = summary.isError ? undefined : summary.data?.totals;
  if (!activeOrganizationTimezone && activeOrganizationId) return <NotificationBanner variant="warning" title="Organization timezone unavailable" action={<Button onClick={() => void refreshUser()}>Refresh access</Button>} />;
  if (access.isSuccess && requestedProjectId && !selectedProject) return <NotificationBanner variant="warning" title="Attendance access required" description="This project is unavailable with your effective permissions." action={<Button onClick={() => replaceQuery({ projectId: null, workerId: null })}>Choose an accessible project</Button>} />;
  if (workerId && activeOrganizationId && selectedProject && canRead) return <div className="space-y-4 text-base"><PageHeader title={searchParams.get("workerName") ? `${searchParams.get("workerName")} · Attendance` : "Worker attendance"} description="Server-derived working days and absence history." onBack={() => router.push(`/attendance?${summaryContext}`)} actions={hasPermission("workers:read") ? <Link className="underline" href={`/workers/${workerId}?tab=attendance&${summaryContext}`}>Worker details</Link> : undefined} /><WorkerAttendancePanel organizationId={activeOrganizationId} workerId={workerId} /></div>;
  return (
    <div className="space-y-4 pb-8 text-base [&_button]:min-h-11 [&_button]:text-sm [&_input]:min-h-11 [&_select]:min-h-11 [&_td]:text-sm [&_th]:text-sm">
      <PageHeader title="Attendance" description="Review worker attendance totals for a selected period." actions={<div className="flex flex-wrap gap-2">{canMark ? <Button onClick={() => router.push(`/attendance/mark?${dailyContext}`)}><ClipboardCheck size={16} aria-hidden="true" />Mark attendance</Button> : null}{can("work-calendar:read") ? <Button variant="outline" onClick={() => router.push(`/work-calendar?projectId=${projectId}`)}><CalendarDays size={16} aria-hidden="true" />Work Calendar</Button> : null}{canExport ? <Button variant="outline" onClick={exportPeriod} disabled={isExporting || !projectId || Boolean(invalidPeriod)} title="Exports the full period, regardless of list filters"><Download size={16} aria-hidden="true" />{isExporting ? "Exporting" : "Export"}</Button> : null}</div>} />
      {selectedProject?.status === "ARCHIVED" ? <NotificationBanner variant="info" title="Archived project" description="Attendance history remains available for this archived project." /> : null}
      <p className="text-sm text-sub">Working timezone: {activeOrganizationTimezone}. Only effective primary-project working dates contribute to totals.</p>
      {invalidPeriod ? <p role="alert" className="text-danger">{invalidPeriod}</p> : null}
      {success ? <div aria-live="polite"><NotificationBanner variant={success.startsWith("Export failed") ? "danger" : "success"} title={success} onClose={() => setSuccess("")} /></div> : null}
      {!activeOrganizationId ? <EmptyState title="No active organization" description="Select an organization before opening Attendance." /> : access.isLoading ? <LoadingState label="Loading accessible projects" /> : access.isError ? <NotificationBanner variant="danger" title="Projects could not be loaded" description="Retry to restore your accessible project list." action={<Button variant="outline" onClick={() => access.refetch()}>Retry</Button>} /> : projects.length === 0 ? <EmptyState title="No accessible projects" description="Attendance becomes available after you receive access to a project." /> : !selectedProject ? <LoadingState label="Selecting an accessible project" /> : !canRead ? <NotificationBanner variant="warning" title="Attendance access removed" description="Your permissions changed. Ask an administrator for attendance read access." /> : <AttendanceContent projectId={projectId} projects={projects} startDate={startDate} endDate={endDate} search={search} setSearch={setSearch} exceptionsOnly={exceptionsOnly} replaceQuery={replaceQuery} totals={totals} summary={summary} debouncedSearch={debouncedSearch} page={page} />}
    </div>
  );
}

type ProjectOption = { id: string; name: string; projectCode: string | null };
function AttendanceContent({ projectId, projects, startDate, endDate, search, setSearch, exceptionsOnly, replaceQuery, totals, summary, debouncedSearch, page }: { projectId: string; projects: ProjectOption[]; startDate: string; endDate: string; search: string; setSearch: (value: string) => void; exceptionsOnly: boolean; replaceQuery: (updates: Record<string, string | null>) => void; totals?: { workers: number; expectedWorkingDays: number; presentDays: number; absentDays: number }; summary: ReturnType<typeof useAttendanceSummary>; debouncedSearch: string; page: number }) {
  return <><Card padding="compact"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.2fr)_170px_170px_minmax(220px,1fr)_auto] xl:items-end"><label className="grid gap-1.5 font-semibold">Project<Select className="text-base" value={projectId} onChange={(event) => replaceQuery({ projectId: event.target.value, page: null })}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}{project.projectCode ? ` · ${project.projectCode}` : ""}</option>)}</Select></label><label className="grid gap-1.5 font-semibold">Start date *<Input required className="text-base" type="date" value={startDate} max={endDate} onChange={(event) => replaceQuery({ startDate: event.target.value, month: null, selectedDate: null, page: null })} /></label><label className="grid gap-1.5 font-semibold">End date *<Input required className="text-base" type="date" value={endDate} min={startDate} onChange={(event) => replaceQuery({ endDate: event.target.value, month: null, selectedDate: null, page: null })} /></label><label className="grid gap-1.5 font-semibold">Search workers<span className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub" size={16} aria-hidden="true" /><Input className="pl-9 text-base" type="search" maxLength={160} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, code or trade" /></span></label><Checkbox className="min-h-10" label="With exceptions only" checked={exceptionsOnly} onChange={(event) => replaceQuery({ exceptionsOnly: event.target.checked ? "true" : null, page: null })} /></div></Card>{totals ? <section aria-label="Attendance totals" className="grid grid-cols-2 gap-2 lg:grid-cols-4"><Metric label="Workers" value={totals.workers} /><Metric label="Expected worker-days" value={totals.expectedWorkingDays} /><Metric label="Present worker-days" value={totals.presentDays} /><Metric label="Absent worker-days" value={totals.absentDays} /></section> : null}{!periodError(startDate, endDate) && summary.isLoading ? <LoadingState label="Loading attendance summary" /> : summary.isError ? <NotificationBanner variant="danger" title="Attendance could not be loaded" description={errorMessage(summary.error)} action={<Button variant="outline" onClick={() => summary.refetch()}><RefreshCw size={15} aria-hidden="true" />Retry</Button>} /> : summary.data?.rows.length === 0 ? <EmptyState title={debouncedSearch || exceptionsOnly ? "No matching workers" : "No workers in this period"} description={debouncedSearch || exceptionsOnly ? "Clear or change the filters to see more workers." : "Workers appear after a primary project assignment covers the selected period."} /> : periodError(startDate, endDate) ? null : <WorkerList rows={summary.data?.rows ?? []} refreshing={summary.isFetching} projectId={projectId} startDate={startDate} endDate={endDate} />}{summary.data && page > Math.max(1, summary.data.meta.totalPages) ? <NotificationBanner variant="info" title="This page is no longer available" action={<Button onClick={() => replaceQuery({ page: null })}>Return to first page</Button>} /> : null}{summary.data && summary.data.meta.totalPages > 1 ? <div className="flex items-center justify-between gap-3"><p className="text-sub">Page <span className="tabular-nums">{summary.data.meta.page}</span> of <span className="tabular-nums">{summary.data.meta.totalPages}</span></p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => replaceQuery({ page: String(page - 1) })}>Previous</Button><Button variant="outline" disabled={page >= summary.data.meta.totalPages} onClick={() => replaceQuery({ page: String(page + 1) })}>Next</Button></div></div> : null}</>;
}

function Metric({ label, value }: { label: string; value: number }) { return <Card padding="compact"><p className="text-xs font-bold uppercase tracking-wide text-sub">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></Card>; }
function WorkerList({ rows, refreshing, projectId, startDate, endDate }: { rows: AttendanceSummaryRow[]; refreshing: boolean; projectId: string; startDate: string; endDate: string }) { const params = useSearchParams(); const href = (workerId: string, name: string) => { const next = new URLSearchParams(params.toString()); next.set("workerId", workerId); next.set("workerName", name); next.set("projectId", projectId); next.set("startDate", startDate); next.set("endDate", endDate); return `/attendance?${next}`; }; return <section aria-label="Workers" aria-busy={refreshing} className="space-y-2"><p className="sr-only" aria-live="polite">{refreshing ? "Refreshing attendance" : "Attendance loaded"}</p><div className="hidden md:block"><Table><TableHeader><TableRow><TableHead>Worker</TableHead><TableHead className="text-right">Expected days</TableHead><TableHead className="text-right">Present days</TableHead><TableHead className="text-right">Absent days</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.workerAssignmentId}><TableCell><p className="font-semibold">{row.worker.name}</p><p className="text-[12px] text-sub">{row.worker.workerCode} · {row.worker.trade}</p></TableCell><TableCell className="text-right tabular-nums">{row.expectedWorkingDays}</TableCell><TableCell className="text-right tabular-nums">{row.presentDays}</TableCell><TableCell className="text-right tabular-nums">{row.absentDays}</TableCell><TableCell className="text-right"><Link className="inline-flex min-h-11 items-center rounded-inner border border-hairline px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime" href={href(row.worker.id, row.worker.name)}>View attendance</Link></TableCell></TableRow>)}</TableBody></Table></div><div className="grid gap-3 md:hidden">{rows.map((row) => <Card key={row.workerAssignmentId} padding="compact"><div><p className="font-semibold">{row.worker.name}</p><p className="text-sm text-sub">{row.worker.workerCode} · {row.worker.trade}</p></div><dl className="mt-4 grid grid-cols-3 gap-2 border-y border-hairline py-3 text-center"><MetricItem label="Expected" value={row.expectedWorkingDays} /><MetricItem label="Present" value={row.presentDays} /><MetricItem label="Absent" value={row.absentDays} /></dl><div className="mt-3 flex justify-end"><Link className="inline-flex min-h-11 items-center rounded-inner border border-hairline px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime" href={href(row.worker.id, row.worker.name)}>View attendance</Link></div></Card>)}</div></section>; }
function MetricItem({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs text-sub">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>; }
