"use client";

import { RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

function currentMonthRange() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Worker attendance could not be loaded. Try again.";
}

function reasonLabel(value: string | null) {
  if (!value) return "Not provided";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function WorkerAttendancePanel({
  organizationId,
  workerId,
  assignments,
}: {
  organizationId: string;
  workerId: string;
  assignments: WorkerProjectAssignmentSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projects = Array.from(
    new Map(
      assignments.map((assignment) => [
        assignment.projectId,
        {
          id: assignment.projectId,
          name: assignment.projectName ?? assignment.projectId,
        },
      ]),
    ).values(),
  );
  const requestedProjectId = searchParams.get("projectId") ?? "";
  const projectId = projects.some((project) => project.id === requestedProjectId)
    ? requestedProjectId
    : (projects[0]?.id ?? "");
  const defaults = currentMonthRange();
  const startDate = searchParams.get("startDate") ?? defaults.startDate;
  const endDate = searchParams.get("endDate") ?? defaults.endDate;
  const attendance = useWorkerAttendancePeriod(
    organizationId,
    projectId,
    workerId,
    startDate,
    endDate,
  );

  function replaceQuery(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "attendance");
    Object.entries(updates).forEach(([key, value]) => next.set(key, value));
    router.replace(`/workers/${workerId}?${next.toString()}`, { scroll: false });
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No project attendance"
        description="Attendance becomes available after this worker has a project assignment."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="compact">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1.5 font-semibold">
            Project
            <Select
              className="text-base sm:text-[13px]"
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
            Start date
            <Input
              className="text-base sm:text-[13px]"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => replaceQuery({ startDate: event.target.value })}
            />
          </label>
          <label className="grid gap-1.5 font-semibold">
            End date
            <Input
              className="text-base sm:text-[13px]"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => replaceQuery({ endDate: event.target.value })}
            />
          </label>
        </div>
      </Card>

      {attendance.data ? (
        <section aria-label="Worker attendance totals" className="grid grid-cols-3 gap-2">
          <Metric label="Expected days" value={attendance.data.totals.expectedWorkingDays} />
          <Metric label="Present days" value={attendance.data.totals.presentDays} />
          <Metric label="Absent days" value={attendance.data.totals.absentDays} />
        </section>
      ) : null}

      {attendance.isLoading ? (
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
          title="No absences in this period"
          description="The worker is derived as present on every expected working day."
        />
      ) : (
        <AbsenceList exceptions={attendance.data?.exceptions ?? []} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="compact">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sub">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function AbsenceList({ exceptions }: { exceptions: AttendanceException[] }) {
  return (
    <Card className="space-y-4" padding="compact">
      <div>
        <h2 className="text-[17px] font-semibold text-body">Absence details</h2>
        <p className="text-[13px] text-sub">Full-day and half-day exceptions in the selected period.</p>
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
                <TableCell className="font-semibold">{displayDate(item.workDate)}</TableCell>
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
              <p className="font-semibold">{displayDate(item.workDate)}</p>
              <StatusBadge tone={item.duration === "FULL_DAY" ? "danger" : "warning"}>
                {item.duration === "FULL_DAY" ? "Absent" : "Half day"}
              </StatusBadge>
            </div>
            <dl className="mt-3 grid gap-2 text-[13px]">
              <div><dt className="text-sub">Reason</dt><dd>{reasonLabel(item.reasonCode)}</dd></div>
              <div><dt className="text-sub">Notes</dt><dd>{item.notes || "—"}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </Card>
  );
}
