"use client";

import Link from "next/link";
import { CalendarCheck, Check, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectWorkers } from "@/features/workers/hooks/use-workers";
import { useAttendance, useSaveAttendance } from "@/features/attendance/hooks/use-attendance";
import { attendanceService } from "@/features/attendance/services/attendance.service";
import type { AttendanceEntryInput, AttendanceRecord } from "@/features/attendance/types/attendance.types";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@nirman-app/shared";

const today = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
};

const currentTime = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(11, 16);
};

const toTimeValue = (value: string | null | undefined) => {
    if (!value) return "";
    const timeValue = /^(\d{2}:\d{2})(?::\d{2})?$/.exec(value);
    if (timeValue) return timeValue[1];
    if (Number.isNaN(Date.parse(value))) return "";
    const date = new Date(value);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(11, 16);
};

const timeToSeconds = (value: string | null | undefined) => {
    if (!value) return null;
    const [hours, minutes, seconds = "0"] = value.split(":");
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const statusLabels: Record<AttendanceStatus, string> = {
    PRESENT: "Present",
    HALF_DAY: "Half day",
    ABSENT: "Absent",
    HOLIDAY: "Holiday",
};

function initialEntry(assignmentId: string, record?: AttendanceRecord): AttendanceEntryInput {
    return {
        workerAssignmentId: assignmentId,
        status: record?.status ?? "PRESENT",
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        notes: record?.notes ?? null,
    };
}

export function AttendancePage({ projectId }: { projectId: string }) {
    const { activeOrganizationId, hasPermission } = useAuth();
    const organizationId = activeOrganizationId ?? "";
    const [date, setDate] = useState(today);
    const [defaultTime] = useState(currentTime);
    const [search, setSearch] = useState("");
    const [entries, setEntries] = useState<Record<string, AttendanceEntryInput>>({});
    const roster = useProjectWorkers(organizationId, projectId, { pageSize: 100, assignmentScope: "ALL_ACTIVE", sortBy: "name", sortOrder: "asc" });
    const attendance = useAttendance(organizationId, projectId, date);
    const saveAttendance = useSaveAttendance(organizationId, projectId, date);
    const canMark = hasPermission("attendance:mark");
    const canRead = hasPermission("attendance:read");
    const canExport = hasPermission("attendance:export");
    const [isExporting, setIsExporting] = useState(false);
    const [validationError, setValidationError] = useState("");

    useEffect(() => {
        if (!roster.data?.data) return;
        const existing = new Map((attendance.data ?? []).map((record) => [record.workerAssignmentId, record]));
        setEntries(Object.fromEntries(roster.data.data.map((worker) => [
            worker.currentAssignment.id,
            initialEntry(worker.currentAssignment.id, existing.get(worker.currentAssignment.id)),
        ])));
    }, [attendance.data, roster.data]);

    const visibleWorkers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return (roster.data?.data ?? []).filter((worker) =>
            !needle || worker.name.toLowerCase().includes(needle) || worker.trade.toLowerCase().includes(needle) || worker.workerCode.toLowerCase().includes(needle),
        );
    }, [roster.data?.data, search]);

    function updateEntry(assignmentId: string, patch: Partial<AttendanceEntryInput>) {
        setEntries((current) => ({ ...current, [assignmentId]: { ...current[assignmentId], ...patch } }));
    }

    function useDisplayedTime(assignmentId: string, field: "checkIn" | "checkOut") {
        setEntries((current) => {
            const entry = current[assignmentId] ?? initialEntry(assignmentId);
            if (entry[field]) return current;
            return { ...current, [assignmentId]: { ...entry, [field]: defaultTime } };
        });
    }

    function markAllPresent() {
        setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, status: "PRESENT" }])));
    }

    async function save() {
        setValidationError("");
        const invalidRange = Object.values(entries).find((entry) => {
            const checkIn = timeToSeconds(entry.checkIn);
            const checkOut = timeToSeconds(entry.checkOut);
            return checkIn !== null && checkOut !== null && checkOut < checkIn;
        });
        if (invalidRange) {
            setValidationError("Check-out time cannot be before check-in time.");
            return;
        }
        await saveAttendance.mutateAsync(Object.values(entries));
    }

    async function exportAttendance() {
        if (!organizationId) return;
        setIsExporting(true);
        try {
            const csv = await attendanceService.exportCsv(organizationId, projectId, date);
            const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `attendance-${projectId}-${date}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <PermissionGuard permission="attendance:read">
            <div className="space-y-4 pb-8">
                <PageHeader
                    title="Attendance"
                    description="Record the daily status of workers assigned to this project."
                    onBack={() => window.history.back()}
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/projects/${projectId}`}><Button variant="outline">Project</Button></Link>
                            {canExport ? <Button onClick={exportAttendance} disabled={isExporting} variant="outline"><Download size={16} /> {isExporting ? "Exporting" : "Export"}</Button> : null}
                            {canMark ? <Button onClick={markAllPresent} variant="outline"><Check size={16} /> Mark all present</Button> : null}
                        </div>
                    }
                />

                <Card className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">
                            Attendance date
                            <Input
                                className="min-w-[180px]"
                                type="date"
                                max={today()}
                                value={date}
                                onChange={(event) => setDate(event.target.value || today())}
                            />
                        </label>
                        <label className="relative w-full sm:w-72">
                            <span className="sr-only">Search workers</span>
                            <Search className="pointer-events-none absolute left-2.5 top-3.5 text-sub" size={16} />
                            <Input className="w-full pl-8" type="search" placeholder="Search workers" value={search} onChange={(event) => setSearch(event.target.value)} />
                        </label>
                    </div>
                    <div className="flex items-center justify-between text-[12px] text-sub">
                        <span>{visibleWorkers.length} workers in this project</span>
                        <span>{attendance.isFetching ? "Refreshing" : "Project scoped"}</span>
                    </div>
                </Card>

                {!organizationId ? <Card>No active organization is available.</Card> : attendance.isError || roster.isError ? <Card className="text-red-600">Unable to load attendance or project workers.</Card> : roster.isLoading || attendance.isLoading ? <Card>Loading attendance</Card> : !visibleWorkers.length ? <Card className="py-12 text-center"><CalendarCheck className="mx-auto mb-3 text-sub" size={28} /><p className="font-semibold text-body">No assigned workers found</p><p className="mt-1 text-[13px] text-sub">Assign workers to this project before marking attendance.</p></Card> : (
                    <Card className="overflow-hidden p-0">
                        <div className="hidden grid-cols-[minmax(180px,1.4fr)_140px_180px_180px_minmax(160px,1fr)] gap-3 border-b border-hairline bg-sunken px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-sub md:grid">
                            <span>Worker</span><span>Status</span><span>Check in</span><span>Check out</span><span>Notes</span>
                        </div>
                        <div className="divide-y divide-hairline">
                            {visibleWorkers.map((worker) => {
                                const assignmentId = worker.currentAssignment.id;
                                const entry = entries[assignmentId] ?? initialEntry(assignmentId);
                                return (
                                    <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(180px,1.4fr)_140px_180px_180px_minmax(160px,1fr)] md:items-center md:px-5" key={assignmentId}>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-body">{worker.name}</p>
                                            <p className="text-[12px] text-sub">{worker.workerCode} · {worker.trade}</p>
                                        </div>
                                        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sub">
                                            <span className="md:hidden">Status</span>
                                            <Select className="min-h-9 !text-[12px] !font-semibold" disabled={!canMark} value={entry.status} onChange={(event) => updateEntry(assignmentId, { status: event.target.value as AttendanceStatus })}>
                                                {ATTENDANCE_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                                            </Select>
                                        </label>
                                        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sub">
                                            <span className="md:hidden">Check in</span>
                                            <Input className="min-h-9 !text-[12px]" disabled={!canMark} type="time" value={toTimeValue(entry.checkIn) || defaultTime} onFocus={() => useDisplayedTime(assignmentId, "checkIn")} onChange={(event) => updateEntry(assignmentId, { checkIn: event.target.value || null })} />
                                        </label>
                                        <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-sub">
                                            <span className="md:hidden">Check out</span>
                                            <Input className="min-h-9 !text-[12px]" disabled={!canMark} type="time" value={toTimeValue(entry.checkOut) || defaultTime} onFocus={() => useDisplayedTime(assignmentId, "checkOut")} onChange={(event) => updateEntry(assignmentId, { checkOut: event.target.value || null })} />
                                        </label>
                                        <Input className="min-h-9 !h-9 !text-[11px]" disabled={!canMark} placeholder="Optional note" value={entry.notes ?? ""} onChange={(event) => updateEntry(assignmentId, { notes: event.target.value || null })} />
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {canMark && visibleWorkers.length ? <div className="flex justify-end"><Button onClick={save} disabled={saveAttendance.isPending}>{saveAttendance.isPending ? "Saving attendance" : "Save attendance"}</Button></div> : null}
                {!canMark && canRead ? <Card className="text-[13px] text-sub">You have read-only attendance access. An authorised project member must save changes.</Card> : null}
                {validationError ? <p className="text-[13px] text-red-600">{validationError}</p> : null}
                {saveAttendance.isError ? <p className="text-[13px] text-red-600">Unable to save attendance. Check your project access and try again.</p> : null}
                {saveAttendance.isSuccess ? <p className="text-[13px] text-success">Attendance saved for {date}.</p> : null}
            </div>
        </PermissionGuard>
    );
}
