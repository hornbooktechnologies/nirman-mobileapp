"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { periodError, workMonthRange, workToday } from "@/features/attendance/date-utils";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AttendanceException, WorkerProjectAssignmentSummary } from "@nirman-app/shared";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  NotificationBanner,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useWorkerAttendancePeriod } from "@/features/attendance/hooks/use-attendance";
import { ApiError } from "@/lib/api/api-client";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Worker attendance could not be loaded. Try again.";
}

function reasonLabel(value: string | null) {
  if (!value) return "Not provided";
  return value;
}

export function WorkerAttendancePanel({
  organizationId,
  workerId,
  assignments,
}: {
  organizationId: string;
  workerId: string;
  assignments?: WorkerProjectAssignmentSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { activeOrganizationTimezone, refreshUser } = useAuth();
  const access = useProjectAccess(organizationId);
  const projects = (access.data?.projects ?? []).filter(project => project.permissions.includes("attendance:read") && (!assignments || assignments.some(assignment => assignment.projectId === project.id)));
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const projectId = requestedProjectId ? projects.find(project => project.id === requestedProjectId)?.id ?? "" : projects[0]?.id ?? "";
  const defaults = workMonthRange(activeOrganizationTimezone ? workToday(activeOrganizationTimezone).slice(0, 7) : "2000-01");
  const startDate = searchParams.get("startDate") ?? defaults.startDate;
  const endDate = searchParams.get("endDate") ?? defaults.endDate;
  const invalidPeriod = periodError(startDate, endDate);
  const attendance = useWorkerAttendancePeriod(
    organizationId,
    projectId,
    workerId,
    startDate,
    endDate,
    access.isSuccess && Boolean(activeOrganizationTimezone),
  );

  function replaceQuery(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    if (pathname.startsWith("/workers/")) next.set("tab", "attendance");
    else next.set("workerId", workerId);
    Object.entries(updates).forEach(([key, value]) => next.set(key, value));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  if (access.isLoading) return <LoadingState label="Checking attendance access" />;
  if (access.isError) return <NotificationBanner variant="danger" title="Attendance access could not be loaded" action={<Button onClick={() => void access.refetch()}>Retry</Button>} />;
  if (!activeOrganizationTimezone) return <NotificationBanner variant="warning" title="Organization timezone unavailable" description="Refresh access before selecting attendance dates." action={<Button onClick={() => void refreshUser()}>Refresh access</Button>} />;
  if (requestedProjectId && !projectId) return <NotificationBanner variant="warning" title="Project attendance access required" description="This project is unavailable with your current effective permissions." />;
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project attendance"
        description="No worker assignment is available with your current attendance permissions."
      />
    );
  }

  return (
    <div className="space-y-4 text-base [&_button]:min-h-11 [&_button]:text-sm [&_input]:min-h-11 [&_select]:min-h-11 [&_td]:text-sm [&_th]:text-sm">
      <Card padding="compact">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 font-semibold">
            Project
            <Select
              className="text-base"
              value={projectId}
              onChange={(event) => replaceQuery({ projectId: event.target.value })}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 font-semibold">
            Start date *
            <Input
              className="text-base"
              required
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => replaceQuery({ startDate: event.target.value })}
            />
          </label>
          <label className="grid gap-1.5 font-semibold">
            End date *
            <Input
              className="text-base"
              required
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => replaceQuery({ endDate: event.target.value })}
            />
          </label>
        </div>
      </Card>

      <p className="text-sm text-sub">Working timezone: {activeOrganizationTimezone}. Totals include only eligible primary-project working dates.</p>
      {invalidPeriod ? <p role="alert" className="text-danger">{invalidPeriod}</p> : null}
      <Link className="inline-flex min-h-11 items-center underline" href={`/attendance?${new URLSearchParams({ projectId, startDate, endDate, search: searchParams.get("search") ?? "", exceptionsOnly: searchParams.get("exceptionsOnly") ?? "", page: searchParams.get("page") ?? "1" })}`}>Attendance summary</Link>
      <Link className="inline-flex min-h-11 items-center px-3 underline" href={`/attendance/mark?${new URLSearchParams({ projectId, date: endDate, returnTo: `${pathname}?${searchParams}` })}`}>Daily attendance</Link>
      {attendance.data && !attendance.isError && !invalidPeriod ? (
        <section aria-label="Worker attendance totals" className="grid grid-cols-3 gap-2">
          <Metric label="Expected days" value={attendance.data.totals.expectedWorkingDays} />
          <Metric label="Present days" value={attendance.data.totals.presentDays} />
          <Metric label="Absent days" value={attendance.data.totals.absentDays} />
        </section>
      ) : null}

      {invalidPeriod ? null : attendance.isLoading ? (
        <LoadingState label="Loading worker attendance" />
      ) : attendance.isError ? (
        <NotificationBanner
          variant="danger"
          title="Worker attendance could not be loaded"
          description={errorMessage(attendance.error)}
          action={
            <Button variant="outline" onClick={() => attendance.refetch()}>
              <RefreshCw size={15} aria-hidden="true" />
              Retry
            </Button>
          }
        />
      ) : attendance.data?.exceptions.length === 0 ? (
        <EmptyState
          title={attendance.data.totals.expectedWorkingDays === 0 ? "No expected working days" : "No absences in this period"}
          description={attendance.data.totals.expectedWorkingDays === 0 ? "There are no eligible primary-project working dates in this period. Non-working dates do not count as absences." : "The worker is derived as present on every expected working day."}
        />
      ) : (
        <AbsenceList exceptions={attendance.data?.exceptions ?? []} projectId={projectId} returnTo={`${pathname}?${searchParams}`} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="compact">
      <p className="text-xs font-bold uppercase tracking-wide text-sub">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function AbsenceList({ exceptions, projectId, returnTo }: { exceptions: AttendanceException[]; projectId: string; returnTo: string }) {
  const dailyHref = (date: string) => `/attendance/mark?${new URLSearchParams({ projectId, date, returnTo })}`;
  return (
    <Card className="space-y-4" padding="compact">
      <div>
        <h2 className="text-[17px] font-semibold text-body">Absence details</h2>
        <p className="text-sm text-sub">Full-day and half-day exceptions in the selected period.</p>
      </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exceptions.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-semibold"><Link className="underline" href={dailyHref(item.workDate)}>{displayDate(item.workDate)}</Link></TableCell>
                <TableCell>
                  <StatusBadge tone={item.duration === "FULL_DAY" ? "danger" : "warning"}>
                    {item.duration === "FULL_DAY" ? "Absent" : "Half day"}
                  </StatusBadge>
                </TableCell>
                <TableCell>{reasonLabel(item.reasonCode)}</TableCell>
                <TableCell className="max-w-md whitespace-normal text-sub">
                  {item.notes || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-3 md:hidden">
        {exceptions.map((item) => (
          <div key={item.id} className="rounded-xl border border-hairline p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link className="font-semibold underline" href={dailyHref(item.workDate)}>{displayDate(item.workDate)}</Link>
              <StatusBadge tone={item.duration === "FULL_DAY" ? "danger" : "warning"}>
                {item.duration === "FULL_DAY" ? "Absent" : "Half day"}
              </StatusBadge>
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-sub">Reason</dt><dd>{reasonLabel(item.reasonCode)}</dd></div>
              <div><dt className="text-sub">Notes</dt><dd>{item.notes || "—"}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </Card>
  );
}
