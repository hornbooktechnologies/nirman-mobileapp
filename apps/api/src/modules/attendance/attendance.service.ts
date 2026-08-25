import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AttendanceException,
  AttendanceRecord,
  AttendanceSummaryResponse,
  AttendanceSummaryRow,
  DerivedAttendanceState,
  EffectiveWorkCalendarDay,
  ErrorCode,
  WorkerAttendancePeriodResponse,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CalendarService } from "../calendar/calendar.service";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  AttendanceSummaryQueryDto,
  CreateAttendanceExceptionDto,
  UpdateAttendanceExceptionDto,
} from "./dto/attendance-exception.dto";
import type { SaveAttendanceDto } from "./dto/save-attendance.dto";
import type { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import {
  AttendanceRepository,
  type AttendanceRosterPeriodRow,
} from "./attendance.repository";

const MAX_ATTENDANCE_DAYS = 366;

type DerivedDailyRow = {
  roster: AttendanceRosterPeriodRow;
  date: string;
  expectedWorking: boolean;
  state: DerivedAttendanceState;
  workedFraction: 0 | 0.5 | 1;
  exception: AttendanceException | null;
};

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

function coversDate(row: AttendanceRosterPeriodRow, date: string) {
  const withinAssignment =
    row.assignmentStartsOn <= date &&
    (row.assignmentEndsOn === null || row.assignmentEndsOn >= date);
  const withinPrimary =
    row.primaryStartsOn <= date &&
    (row.primaryEndsOn === null || row.primaryEndsOn >= date);
  const beforeDeactivation =
    row.deactivatedAt === null || date < row.deactivatedAt.slice(0, 10);
  return withinAssignment && withinPrimary && beforeDeactivation;
}

export function deriveAttendanceDailyRows(
  rosterPeriods: AttendanceRosterPeriodRow[],
  calendarDays: EffectiveWorkCalendarDay[],
  exceptions: AttendanceException[],
): DerivedDailyRow[] {
  const grouped = new Map<string, AttendanceRosterPeriodRow[]>();
  for (const period of rosterPeriods) {
    const values = grouped.get(period.workerAssignmentId) ?? [];
    values.push(period);
    grouped.set(period.workerAssignmentId, values);
  }
  const exceptionMap = new Map(
    exceptions.map((item) => [
      `${item.workerAssignmentId}:${item.workDate}`,
      item,
    ]),
  );
  const result: DerivedDailyRow[] = [];
  for (const periods of grouped.values()) {
    const roster = periods[0];
    for (const day of calendarDays) {
      if (!periods.some((period) => coversDate(period, day.date))) continue;
      const exception = exceptionMap.get(
        `${roster.workerAssignmentId}:${day.date}`,
      ) ?? null;
      if (day.isWorking !== true) {
        result.push({
          roster,
          date: day.date,
          expectedWorking: false,
          state: "NON_WORKING",
          workedFraction: 0,
          exception: null,
        });
      } else if (exception?.duration === "FULL_DAY") {
        result.push({
          roster,
          date: day.date,
          expectedWorking: true,
          state: "ABSENT",
          workedFraction: 0,
          exception,
        });
      } else if (exception?.duration === "HALF_DAY") {
        result.push({
          roster,
          date: day.date,
          expectedWorking: true,
          state: "HALF_DAY",
          workedFraction: 0.5,
          exception,
        });
      } else {
        result.push({
          roster,
          date: day.date,
          expectedWorking: true,
          state: "PRESENT",
          workedFraction: 1,
          exception: null,
        });
      }
    }
  }
  return result;
}

export function deriveAttendanceSummary(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  rosterPeriods: AttendanceRosterPeriodRow[],
  calendarDays: EffectiveWorkCalendarDay[],
  exceptions: AttendanceException[],
  options: {
    selectedDate?: string;
    exceptionsOnly?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
): AttendanceSummaryResponse {
  const dailyRows = deriveAttendanceDailyRows(
    rosterPeriods,
    calendarDays,
    exceptions,
  );
  const grouped = new Map<string, DerivedDailyRow[]>();
  for (const row of dailyRows) {
    const rows = grouped.get(row.roster.workerAssignmentId) ?? [];
    rows.push(row);
    grouped.set(row.roster.workerAssignmentId, rows);
  }
  let rows: AttendanceSummaryRow[] = [];
  for (const values of grouped.values()) {
    const selected = options.selectedDate
      ? values.find((item) => item.date === options.selectedDate)
      : undefined;
    if (options.selectedDate && !selected) continue;
    if (options.exceptionsOnly && !values.some((item) => item.exception)) {
      continue;
    }
    const roster = values[0].roster;
    rows.push({
      worker: {
        id: roster.workerId,
        workerCode: roster.workerCode,
        name: roster.workerName,
        trade: roster.trade,
      },
      workerAssignmentId: roster.workerAssignmentId,
      expectedWorkingDays: values.filter((item) => item.expectedWorking).length,
      presentDays: values
        .filter((item) => item.expectedWorking)
        .reduce((total, item) => total + item.workedFraction, 0),
      absentDays: values
        .filter((item) => item.expectedWorking)
        .reduce((total, item) => total + (1 - item.workedFraction), 0),
      ...(selected
        ? {
            selectedDate: {
              date: selected.date,
              state: selected.state,
              exception: selected.exception,
            },
          }
        : {}),
    });
  }
  rows = rows.sort((a, b) =>
    a.worker.name.localeCompare(b.worker.name) ||
    a.worker.workerCode.localeCompare(b.worker.workerCode),
  );
  const total = rows.length;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const totals = rows.reduce(
    (value, row) => ({
      workers: value.workers + 1,
      expectedWorkingDays:
        value.expectedWorkingDays + row.expectedWorkingDays,
      presentDays: value.presentDays + row.presentDays,
      absentDays: value.absentDays + row.absentDays,
    }),
    {
      workers: 0,
      expectedWorkingDays: 0,
      presentDays: 0,
      absentDays: 0,
    },
  );
  return {
    organizationId,
    projectId,
    startDate,
    endDate,
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    totals,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly calendarService: CalendarService,
  ) {}

  async summary(
    organizationId: string,
    projectId: string,
    query: AttendanceSummaryQueryDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:read",
    );
    this.validatePeriod(query.startDate, query.endDate, query.selectedDate);
    const [roster, exceptions, days] = await Promise.all([
      this.attendanceRepo.findPrimaryRosterPeriods(
        organizationId,
        projectId,
        query.startDate,
        query.endDate,
        query.search?.trim() || undefined,
      ),
      this.attendanceRepo.findExceptions(
        organizationId,
        projectId,
        query.startDate,
        query.endDate,
      ),
      this.calendarService.resolveDaysForAttendance(
        organizationId,
        projectId,
        query.startDate,
        query.endDate,
      ),
    ]);
    this.assertConfigured(days);
    return deriveAttendanceSummary(
      organizationId,
      projectId,
      query.startDate,
      query.endDate,
      roster,
      days,
      exceptions,
      query,
    );
  }

  async workerPeriod(
    organizationId: string,
    projectId: string,
    workerId: string,
    startDate: string,
    endDate: string,
    actor: AuthenticatedUser,
  ): Promise<WorkerAttendancePeriodResponse> {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:read",
    );
    this.validatePeriod(startDate, endDate);
    const [roster, exceptions, days] = await Promise.all([
      this.attendanceRepo.findPrimaryRosterPeriods(
        organizationId,
        projectId,
        startDate,
        endDate,
        undefined,
        workerId,
      ),
      this.attendanceRepo.findExceptions(
        organizationId,
        projectId,
        startDate,
        endDate,
      ),
      this.calendarService.resolveDaysForAttendance(
        organizationId,
        projectId,
        startDate,
        endDate,
      ),
    ]);
    this.assertConfigured(days);
    const rows = deriveAttendanceDailyRows(roster, days, exceptions);
    const expectedRows = rows.filter((row) => row.expectedWorking);
    return {
      organizationId,
      projectId,
      workerId,
      startDate,
      endDate,
      totals: {
        expectedWorkingDays: expectedRows.length,
        presentDays: expectedRows.reduce(
          (total, row) => total + row.workedFraction,
          0,
        ),
        absentDays: expectedRows.reduce(
          (total, row) => total + (1 - row.workedFraction),
          0,
        ),
      },
      exceptions: rows
        .flatMap((row) => (row.exception ? [row.exception] : []))
        .sort((left, right) => right.workDate.localeCompare(left.workDate)),
    };
  }

  async createException(
    organizationId: string,
    projectId: string,
    dto: CreateAttendanceExceptionDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:mark",
    );
    await this.validateExceptionTarget(
      organizationId,
      projectId,
      dto.workerAssignmentId,
      dto.workDate,
    );
    try {
      const created = await this.attendanceRepo.createException(
        organizationId,
        projectId,
        dto,
        actor.id,
      );
      if (!created) throw new Error("ATTENDANCE_EXCEPTION_NOT_FOUND");
      return created;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "ATTENDANCE_EXCEPTION_DUPLICATE" ||
          (error as any).code === "ER_DUP_ENTRY")
      ) {
        throw new ConflictException(
          this.error(
            "ATTENDANCE_EXCEPTION_DUPLICATE",
            "An active Attendance exception already exists for this Worker and date",
          ),
        );
      }
      throw error;
    }
  }

  async updateException(
    organizationId: string,
    projectId: string,
    exceptionId: string,
    dto: UpdateAttendanceExceptionDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:update",
    );
    const existing = await this.attendanceRepo.findExceptionById(
      organizationId,
      projectId,
      exceptionId,
    );
    if (!existing) throw this.exceptionNotFound();
    await this.validateExceptionTarget(
      organizationId,
      projectId,
      existing.workerAssignmentId,
      existing.workDate,
    );
    const updated = await this.attendanceRepo.updateException(
      organizationId,
      projectId,
      exceptionId,
      dto,
      actor.id,
    );
    if (!updated) throw this.exceptionNotFound();
    return updated;
  }

  async removeException(
    organizationId: string,
    projectId: string,
    exceptionId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:update",
    );
    const removed = await this.attendanceRepo.removeException(
      organizationId,
      projectId,
      exceptionId,
      actor.id,
    );
    if (!removed) throw this.exceptionNotFound();
    return { id: exceptionId, removed: true, restoredState: "PRESENT" as const };
  }

  async exportPeriod(
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:export",
    );
    this.validatePeriod(startDate, endDate);
    const [roster, exceptions, days] = await Promise.all([
      this.attendanceRepo.findPrimaryRosterPeriods(
        organizationId,
        projectId,
        startDate,
        endDate,
      ),
      this.attendanceRepo.findExceptions(
        organizationId,
        projectId,
        startDate,
        endDate,
      ),
      this.calendarService.resolveDaysForAttendance(
        organizationId,
        projectId,
        startDate,
        endDate,
      ),
    ]);
    this.assertConfigured(days);
    const rows = deriveAttendanceDailyRows(roster, days, exceptions);
    const headers = [
      "Worker Code",
      "Worker Name",
      "Trade",
      "Worker Assignment ID",
      "Date",
      "Expected Working",
      "State",
      "Worked Fraction",
      "Reason",
      "Notes",
    ];
    const csvRows = rows.map((row) => [
      row.roster.workerCode,
      row.roster.workerName,
      row.roster.trade,
      row.roster.workerAssignmentId,
      row.date,
      row.expectedWorking,
      row.state,
      row.workedFraction,
      row.exception?.reasonCode ?? "",
      row.exception?.notes ?? "",
    ]);
    return {
      filename: `attendance-${projectId}-${startDate}-${endDate}.csv`,
      csv: `${[headers, ...csvRows]
        .map((row) => row.map((value) => this.csvCell(value)).join(","))
        .join("\r\n")}\r\n`,
    };
  }

  /** @deprecated Sequential Web/Mobile compatibility adapter. */
  async findByDate(
    organizationId: string,
    projectId: string,
    date: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:read",
    );
    return (
      await this.attendanceRepo.findExceptions(
        organizationId,
        projectId,
        date,
        date,
      )
    ).map((item) => this.toLegacyRecord(item));
  }

  /** @deprecated Sequential Web/Mobile compatibility adapter. */
  async saveForDate(
    organizationId: string,
    projectId: string,
    dto: SaveAttendanceDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:mark",
    );
    if (!dto.entries?.length) {
      throw new BadRequestException(
        this.error("ATTENDANCE_EMPTY", "At least one Attendance entry is required"),
      );
    }
    const ids = dto.entries.map((entry) => entry.workerAssignmentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        this.error("ATTENDANCE_DUPLICATE_ENTRY", "Attendance entries must contain each Worker assignment once"),
      );
    }
    for (const entry of dto.entries) {
      if (entry.checkIn || entry.checkOut || entry.status === "HOLIDAY") {
        throw this.unsupportedLegacy();
      }
      if (entry.status === "PRESENT") {
        await this.attendanceRepo.removeExceptionByAssignmentDate(
          organizationId,
          projectId,
          entry.workerAssignmentId,
          dto.date,
          actor.id,
        );
        continue;
      }
      await this.validateExceptionTarget(
        organizationId,
        projectId,
        entry.workerAssignmentId,
        dto.date,
      );
      const existing = await this.attendanceRepo.findExceptionByAssignmentDate(
        organizationId,
        projectId,
        entry.workerAssignmentId,
        dto.date,
      );
      const duration = entry.status === "HALF_DAY" ? "HALF_DAY" : "FULL_DAY";
      if (existing) {
        await this.attendanceRepo.updateException(
          organizationId,
          projectId,
          existing.id,
          { duration, notes: entry.notes },
          actor.id,
        );
      } else {
        await this.attendanceRepo.createException(
          organizationId,
          projectId,
          {
            workerAssignmentId: entry.workerAssignmentId,
            workDate: dto.date,
            exceptionType: "ABSENCE",
            duration,
            notes: entry.notes,
          },
          actor.id,
        );
      }
    }
    return { date: dto.date, data: await this.findByDate(organizationId, projectId, dto.date, actor) };
  }

  /** @deprecated Sequential Web/Mobile compatibility adapter. */
  async updateAttendance(
    organizationId: string,
    projectId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(actor, organizationId, projectId, "attendance:update");
    if (dto.checkIn || dto.checkOut || dto.status === "HOLIDAY") throw this.unsupportedLegacy();
    const existing = await this.attendanceRepo.findExceptionById(organizationId, projectId, attendanceId);
    if (!existing) throw this.exceptionNotFound();
    if (dto.status === "PRESENT") {
      await this.attendanceRepo.removeException(organizationId, projectId, attendanceId, actor.id);
      return { ...this.toLegacyRecord(existing), status: "PRESENT" as const };
    }
    const updated = await this.attendanceRepo.updateException(
      organizationId,
      projectId,
      attendanceId,
      {
        duration:
          dto.status === undefined
            ? undefined
            : dto.status === "HALF_DAY"
              ? "HALF_DAY"
              : "FULL_DAY",
        notes: dto.notes,
      },
      actor.id,
    );
    if (!updated) throw this.exceptionNotFound();
    return this.toLegacyRecord(updated);
  }

  private async validateExceptionTarget(
    organizationId: string,
    projectId: string,
    workerAssignmentId: string,
    workDate: string,
  ) {
    if (!parseDateOnly(workDate)) {
      throw new BadRequestException(
        this.error("ATTENDANCE_PERIOD_INVALID", "Attendance date is invalid"),
      );
    }
    const [assignment, days] = await Promise.all([
      this.attendanceRepo.findPrimaryAssignmentForDate(
        organizationId,
        projectId,
        workerAssignmentId,
        workDate,
      ),
      this.calendarService.resolveDaysForAttendance(
        organizationId,
        projectId,
        workDate,
        workDate,
      ),
    ]);
    if (!assignment) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_PRIMARY_PROJECT_REQUIRED",
          "Worker assignment must be the effective primary Project assignment on this date",
        ),
      );
    }
    this.assertConfigured(days);
    if (days[0]?.isWorking !== true) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_NON_WORKING_DATE",
          "Attendance exceptions cannot be recorded on a non-working date",
        ),
      );
    }
    if (
      assignment.worker_status !== "ACTIVE" &&
      (!assignment.deactivated_at ||
        workDate >= new Date(assignment.deactivated_at).toISOString().slice(0, 10))
    ) {
      throw new BadRequestException(
        this.error("ATTENDANCE_WORKER_NOT_ASSIGNED", "Worker is not active for Attendance on this date"),
      );
    }
  }

  private validatePeriod(startDate: string, endDate: string, selectedDate?: string) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end || end < start || (selectedDate && (selectedDate < startDate || selectedDate > endDate || !parseDateOnly(selectedDate)))) {
      throw new BadRequestException(this.error("ATTENDANCE_PERIOD_INVALID", "Attendance period is invalid"));
    }
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > MAX_ATTENDANCE_DAYS) {
      throw new BadRequestException(this.error("ATTENDANCE_PERIOD_TOO_LARGE", `Attendance period cannot exceed ${MAX_ATTENDANCE_DAYS} days`));
    }
  }

  private assertConfigured(days: EffectiveWorkCalendarDay[]) {
    if (days.some((day) => day.isWorking === null)) {
      throw new BadRequestException(this.error("WORK_CALENDAR_NOT_CONFIGURED", "Organization work calendar must be configured before deriving Attendance"));
    }
  }

  private toLegacyRecord(item: AttendanceException): AttendanceRecord {
    return {
      id: item.id,
      organizationId: item.organizationId,
      projectId: item.projectId,
      workerAssignmentId: item.workerAssignmentId,
      workDate: item.workDate,
      status: item.duration === "HALF_DAY" ? "HALF_DAY" : "ABSENT",
      checkIn: null,
      checkOut: null,
      overtimeHours: null,
      notes: item.notes,
      markedBy: item.recordedBy,
      markedAt: item.recordedAt,
      lastEditedBy: item.updatedBy,
      lastEditedAt: item.updatedAt,
      syncMetadata: null,
      deletedAt: null,
      deletedBy: null,
      createdAt: item.recordedAt,
      updatedAt: item.updatedAt,
    };
  }

  private exceptionNotFound() {
    return new NotFoundException(this.error("ATTENDANCE_EXCEPTION_NOT_FOUND", "Attendance exception not found"));
  }

  private unsupportedLegacy() {
    return new BadRequestException(this.error("ATTENDANCE_LEGACY_INPUT_UNSUPPORTED", "Legacy HOLIDAY, check-in, check-out, overtime, and offline sync input cannot be translated safely"));
  }

  private csvCell(value: string | number | boolean | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }
}
