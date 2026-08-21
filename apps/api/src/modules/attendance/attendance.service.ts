import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  AttendanceStatus,
  ErrorCode,
  PermissionKey,
} from "@nirman-app/shared";
import { ATTENDANCE_STATUSES } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import {
  AttendanceRepository,
  type AttendanceExportRow,
} from "./attendance.repository";
import type { SaveAttendanceDto } from "./dto/save-attendance.dto";
import type { UpdateAttendanceDto } from "./dto/update-attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

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

    return this.attendanceRepo.findByProjectDate(
      organizationId,
      projectId,
      date,
    );
  }

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

    const date = dto.date;
    const entries = dto.entries ?? [];

    if (!entries.length) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_EMPTY",
          "At least one attendance entry is required",
        ),
      );
    }

    const assignmentIds = entries.map((entry) => entry.workerAssignmentId);
    const uniqueAssignmentIds = new Set(assignmentIds);
    if (uniqueAssignmentIds.size !== assignmentIds.length) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_DUPLICATE_ENTRY",
          "Attendance entries must contain each worker assignment only once",
        ),
      );
    }

    for (const entry of entries) {
      this.validateStatus(entry.status);
      this.validateTimeRange(entry.checkIn, entry.checkOut);
    }

    const assignableAssignmentIds =
      await this.attendanceRepo.findAssignableAssignmentIds(
        organizationId,
        projectId,
        date,
        [...uniqueAssignmentIds],
      );
    if (assignableAssignmentIds.length !== uniqueAssignmentIds.size) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_WORKER_NOT_ASSIGNED",
          "Attendance can only be marked for active workers assigned to this project on the selected date",
        ),
      );
    }

    const saved = await this.attendanceRepo.upsertMany(
      organizationId,
      projectId,
      date,
      entries,
      actor.id,
    );

    return { date, data: saved };
  }

  async exportByDate(
    organizationId: string,
    projectId: string,
    date: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:export",
    );

    const rows = await this.attendanceRepo.findExportRowsByProjectDate(
      organizationId,
      projectId,
      date,
    );

    return {
      filename: `attendance-${projectId}-${date}.csv`,
      csv: this.toCsv(rows),
    };
  }

  async updateAttendance(
    organizationId: string,
    projectId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "attendance:update",
    );

    if (dto.status !== undefined) {
      this.validateStatus(dto.status);
    }

    const existing = await this.attendanceRepo.findById(
      organizationId,
      projectId,
      attendanceId,
    );
    if (!existing) {
      throw new NotFoundException(
        this.error("ATTENDANCE_NOT_FOUND", "Attendance record not found"),
      );
    }

    const previousStatus = existing.status;
    this.validateTimeRange(
      dto.checkIn !== undefined ? dto.checkIn : existing.checkIn,
      dto.checkOut !== undefined ? dto.checkOut : existing.checkOut,
    );
    const updated = await this.attendanceRepo.updateById(
      attendanceId,
      organizationId,
      projectId,
      {
        status: dto.status,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        notes: dto.notes,
        lastEditedBy: actor.id,
        previousStatus,
      },
    );

    return {
      ...updated,
      previousStatus,
    };
  }

  private validateStatus(status: AttendanceStatus) {
    if (!ATTENDANCE_STATUSES.includes(status as any)) {
      throw new BadRequestException(
        this.error("INVALID_ATTENDANCE_STATUS", "Attendance status is invalid"),
      );
    }
  }

  private validateTimeRange(
    checkIn: string | null | undefined,
    checkOut: string | null | undefined,
  ) {
    const checkInSeconds = this.timeToSeconds(checkIn);
    const checkOutSeconds = this.timeToSeconds(checkOut);
    if (
      checkInSeconds !== null &&
      checkOutSeconds !== null &&
      checkOutSeconds < checkInSeconds
    ) {
      throw new BadRequestException(
        this.error(
          "ATTENDANCE_TIME_RANGE_INVALID",
          "Check-out time cannot be before check-in time",
        ),
      );
    }
  }

  private timeToSeconds(value: string | null | undefined) {
    if (!value) return null;
    const [hours, minutes, seconds = "0"] = value.split(":");
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }

  private toCsv(rows: AttendanceExportRow[]) {
    const headers = [
      "Worker Code",
      "Worker Name",
      "Trade",
      "Date",
      "Status",
      "Check In",
      "Check Out",
      "Notes",
      "Marked At",
      "Last Edited At",
    ];
    const lines = [
      headers.map((header) => this.csvCell(header)).join(","),
      ...rows.map((row) =>
        [
          row.workerCode,
          row.workerName,
          row.trade,
          this.formatCsvDate(row.workDate),
          row.status,
          row.checkIn ?? "",
          row.checkOut ?? "",
          row.notes ?? "",
          this.formatCsvDate(row.markedAt),
          this.formatCsvDate(row.lastEditedAt),
        ]
          .map((value) => this.csvCell(value))
          .join(","),
      ),
    ];

    return `${lines.join("\r\n")}\r\n`;
  }

  private csvCell(value: string | number | boolean | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private formatCsvDate(value: string | Date | null | undefined) {
    if (!value) return "";
    return value instanceof Date ? value.toISOString() : String(value);
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }
}
