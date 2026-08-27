import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  AttendanceException,
  CreateAttendanceExceptionInput,
  UpdateAttendanceExceptionInput,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

export type AttendanceRosterPeriodRow = {
  workerId: string;
  workerCode: string;
  workerName: string;
  trade: string;
  workerStatus: string;
  deactivatedAt: string | null;
  workerAssignmentId: string;
  dailyRate: string | null;
  assignmentStartsOn: string;
  assignmentEndsOn: string | null;
  primaryStartsOn: string;
  primaryEndsOn: string | null;
};

function dateOnly(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

function nullableDateOnly(value: Date | string | null) {
  return value ? dateOnly(value) : null;
}

@Injectable()
export class AttendanceRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPrimaryRosterPeriods(
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    search?: string,
    workerId?: string,
  ): Promise<AttendanceRosterPeriodRow[]> {
    const rows = await this.database.query<any>(
      `SELECT
         w.id AS worker_id, w.worker_code, w.name AS worker_name, w.trade,
         w.status AS worker_status, w.deactivated_at,
         wpa.id AS worker_assignment_id,
         wpa.daily_rate,
         wpa.starts_on AS assignment_starts_on, wpa.ends_on AS assignment_ends_on,
         wpp.starts_on AS primary_starts_on, wpp.ends_on AS primary_ends_on
       FROM worker_primary_project_periods wpp
       INNER JOIN worker_project_assignments wpa
         ON wpa.id = wpp.worker_assignment_id
        AND wpa.organization_id = wpp.organization_id
        AND wpa.worker_id = wpp.worker_id
       INNER JOIN workers w
         ON w.id = wpp.worker_id AND w.organization_id = wpp.organization_id
       WHERE wpp.organization_id = ?
         AND wpa.project_id = ?
         AND wpp.starts_on <= ?
         AND COALESCE(wpp.ends_on, '9999-12-31') >= ?
          AND wpa.starts_on <= ?
          AND COALESCE(wpa.ends_on, '9999-12-31') >= ?
          ${workerId ? "AND w.id = ?" : ""}
          ${search ? "AND (w.name LIKE ? OR w.worker_code LIKE ? OR w.trade LIKE ?)" : ""}
       ORDER BY w.name ASC, w.worker_code ASC, wpp.starts_on ASC`,
      [
        organizationId,
        projectId,
        endDate,
        startDate,
        endDate,
        startDate,
        ...(workerId ? [workerId] : []),
        ...(search
          ? [`%${search}%`, `%${search}%`, `%${search}%`]
          : []),
      ],
    );
    return rows.map((row: any) => ({
      workerId: row.worker_id,
      workerCode: row.worker_code,
      workerName: row.worker_name,
      trade: row.trade,
      workerStatus: row.worker_status,
      deactivatedAt: row.deactivated_at
        ? new Date(row.deactivated_at).toISOString()
        : null,
      workerAssignmentId: row.worker_assignment_id,
      dailyRate: row.daily_rate === null ? null : String(row.daily_rate),
      assignmentStartsOn: dateOnly(row.assignment_starts_on),
      assignmentEndsOn: nullableDateOnly(row.assignment_ends_on),
      primaryStartsOn: dateOnly(row.primary_starts_on),
      primaryEndsOn: nullableDateOnly(row.primary_ends_on),
    }));
  }

  async findExceptions(
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
  ): Promise<AttendanceException[]> {
    const rows = await this.database.query<any>(
      `SELECT * FROM attendance_exceptions
       WHERE organization_id = ? AND project_id = ?
         AND work_date BETWEEN ? AND ? AND deleted_at IS NULL
       ORDER BY work_date ASC`,
      [organizationId, projectId, startDate, endDate],
    );
    return rows.map((row: any) => this.mapException(row));
  }

  async findExceptionById(
    organizationId: string,
    projectId: string,
    exceptionId: string,
    includeDeleted = false,
  ) {
    const rows = await this.database.query<any>(
      `SELECT * FROM attendance_exceptions
       WHERE id = ? AND organization_id = ? AND project_id = ?
         ${includeDeleted ? "" : "AND deleted_at IS NULL"}
       LIMIT 1`,
      [exceptionId, organizationId, projectId],
    );
    return rows[0] ? this.mapException(rows[0]) : null;
  }

  async findExceptionByAssignmentDate(
    organizationId: string,
    projectId: string,
    workerAssignmentId: string,
    workDate: string,
    connection?: DatabaseConnection,
  ) {
    const rows = await this.database.query<any>(
      `SELECT * FROM attendance_exceptions
       WHERE organization_id = ? AND project_id = ?
         AND worker_assignment_id = ? AND work_date = ?
         AND deleted_at IS NULL LIMIT 1`,
      [organizationId, projectId, workerAssignmentId, workDate],
      connection,
    );
    return rows[0] ? this.mapException(rows[0]) : null;
  }

  async findPrimaryAssignmentForDate(
    organizationId: string,
    projectId: string,
    workerAssignmentId: string,
    workDate: string,
  ) {
    const rows = await this.database.query<any>(
      `SELECT wpa.id, wpa.worker_id, wpa.project_id,
              w.status AS worker_status, w.deactivated_at
       FROM worker_project_assignments wpa
       INNER JOIN workers w
         ON w.id = wpa.worker_id AND w.organization_id = wpa.organization_id
       INNER JOIN worker_primary_project_periods wpp
         ON wpp.worker_assignment_id = wpa.id
        AND wpp.organization_id = wpa.organization_id
        AND wpp.worker_id = wpa.worker_id
        AND wpp.starts_on <= ?
        AND (wpp.ends_on IS NULL OR wpp.ends_on >= ?)
       WHERE wpa.id = ? AND wpa.organization_id = ? AND wpa.project_id = ?
         AND wpa.starts_on <= ?
         AND (wpa.ends_on IS NULL OR wpa.ends_on >= ?)
       LIMIT 1`,
      [
        workDate,
        workDate,
        workerAssignmentId,
        organizationId,
        projectId,
        workDate,
        workDate,
      ],
    );
    return rows[0] ?? null;
  }

  async createException(
    organizationId: string,
    projectId: string,
    input: CreateAttendanceExceptionInput,
    actorId: string,
  ) {
    let unchanged: AttendanceException | null = null;
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.query<any>(
        `SELECT id FROM worker_project_assignments
         WHERE id = ? AND organization_id = ? FOR UPDATE`,
        [input.workerAssignmentId, organizationId],
        connection,
      );
      const existing = await this.findExceptionByAssignmentDate(
        organizationId,
        projectId,
        input.workerAssignmentId,
        input.workDate,
        connection,
      );
      if (existing) {
        if (
          existing.exceptionType === input.exceptionType &&
          existing.duration === input.duration &&
          existing.reasonCode === (input.reasonCode?.trim() || null) &&
          existing.notes === (input.notes?.trim() || null)
        ) {
          unchanged = existing;
          return;
        }
        throw new Error("ATTENDANCE_EXCEPTION_DUPLICATE");
      }
      await this.database.execute(
        `INSERT INTO attendance_exceptions
          (id, organization_id, project_id, worker_assignment_id, work_date,
           exception_type, duration, reason_code, notes, recorded_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          input.workerAssignmentId,
          input.workDate,
          input.exceptionType,
          input.duration,
          input.reasonCode?.trim() || null,
          input.notes?.trim() || null,
          actorId,
          actorId,
        ],
        connection,
      );
    });
    return unchanged ?? this.findExceptionById(organizationId, projectId, id);
  }

  async updateException(
    organizationId: string,
    projectId: string,
    exceptionId: string,
    input: UpdateAttendanceExceptionInput,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE attendance_exceptions SET
         duration = COALESCE(?, duration),
         reason_code = CASE WHEN ? THEN ? ELSE reason_code END,
         notes = CASE WHEN ? THEN ? ELSE notes END,
         updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND organization_id = ? AND project_id = ?
         AND deleted_at IS NULL`,
      [
        input.duration ?? null,
        input.reasonCode !== undefined,
        input.reasonCode?.trim() || null,
        input.notes !== undefined,
        input.notes?.trim() || null,
        actorId,
        exceptionId,
        organizationId,
        projectId,
      ],
    );
    if (result.affectedRows === 0) return null;
    return this.findExceptionById(organizationId, projectId, exceptionId);
  }

  async removeException(
    organizationId: string,
    projectId: string,
    exceptionId: string,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE attendance_exceptions
       SET deleted_at = CURRENT_TIMESTAMP(3), deleted_by = ?,
           updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND organization_id = ? AND project_id = ?
         AND deleted_at IS NULL`,
      [actorId, actorId, exceptionId, organizationId, projectId],
    );
    if (result.affectedRows > 0) return true;
    return Boolean(
      await this.findExceptionById(
        organizationId,
        projectId,
        exceptionId,
        true,
      ),
    );
  }

  async removeExceptionByAssignmentDate(
    organizationId: string,
    projectId: string,
    workerAssignmentId: string,
    workDate: string,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE attendance_exceptions
       SET deleted_at = CURRENT_TIMESTAMP(3), deleted_by = ?,
           updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE organization_id = ? AND project_id = ?
         AND worker_assignment_id = ? AND work_date = ?
         AND deleted_at IS NULL`,
      [
        actorId,
        actorId,
        organizationId,
        projectId,
        workerAssignmentId,
        workDate,
      ],
    );
    return result.affectedRows > 0;
  }

  private mapException(row: any): AttendanceException {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      workerAssignmentId: row.worker_assignment_id,
      workDate: dateOnly(row.work_date),
      exceptionType: row.exception_type,
      duration: row.duration,
      reasonCode: row.reason_code,
      notes: row.notes,
      recordedBy: row.recorded_by,
      recordedAt: new Date(row.recorded_at).toISOString(),
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
