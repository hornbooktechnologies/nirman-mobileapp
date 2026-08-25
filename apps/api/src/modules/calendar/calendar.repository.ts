import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  CreateWorkCalendarOverrideInput,
  OrganizationWorkCalendar,
  UpdateOrganizationWorkCalendarInput,
  UpdateWorkCalendarOverrideInput,
  WorkCalendarOverride,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

type CalendarRow = Record<string, any>;

function dateOnly(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class CalendarRepository {
  constructor(private readonly database: DatabaseService) {}

  async findOrganizationTimezone(organizationId: string) {
    const rows = await this.database.query<CalendarRow & any>(
      "SELECT timezone FROM organizations WHERE id = ? LIMIT 1",
      [organizationId],
    );
    return rows[0]?.timezone ?? "Asia/Kolkata";
  }

  async findOrganizationCalendar(
    organizationId: string,
  ): Promise<OrganizationWorkCalendar> {
    const [rows, overrides, timezone] = await Promise.all([
      this.database.query<CalendarRow & any>(
        "SELECT * FROM organization_work_calendars WHERE organization_id = ? LIMIT 1",
        [organizationId],
      ),
      this.findOverrides(organizationId, null),
      this.findOrganizationTimezone(organizationId),
    ]);
    const row = rows[0];
    return {
      organizationId,
      configured: Boolean(row),
      timezone: row?.timezone ?? timezone,
      workingWeek: row
        ? {
            MONDAY: Boolean(row.monday_working),
            TUESDAY: Boolean(row.tuesday_working),
            WEDNESDAY: Boolean(row.wednesday_working),
            THURSDAY: Boolean(row.thursday_working),
            FRIDAY: Boolean(row.friday_working),
            SATURDAY: Boolean(row.saturday_working),
            SUNDAY: Boolean(row.sunday_working),
          }
        : null,
      overrides,
      updatedAt: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  async upsertOrganizationCalendar(
    organizationId: string,
    input: UpdateOrganizationWorkCalendarInput,
    actorId: string,
  ) {
    await this.database.execute(
      `INSERT INTO organization_work_calendars (
        id, organization_id, timezone,
        monday_working, tuesday_working, wednesday_working,
        thursday_working, friday_working, saturday_working, sunday_working,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        timezone = VALUES(timezone),
        monday_working = VALUES(monday_working),
        tuesday_working = VALUES(tuesday_working),
        wednesday_working = VALUES(wednesday_working),
        thursday_working = VALUES(thursday_working),
        friday_working = VALUES(friday_working),
        saturday_working = VALUES(saturday_working),
        sunday_working = VALUES(sunday_working),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP(3)`,
      [
        randomUUID(), organizationId, input.timezone,
        input.workingWeek.MONDAY, input.workingWeek.TUESDAY,
        input.workingWeek.WEDNESDAY, input.workingWeek.THURSDAY,
        input.workingWeek.FRIDAY, input.workingWeek.SATURDAY,
        input.workingWeek.SUNDAY, actorId, actorId,
      ],
    );
    return this.findOrganizationCalendar(organizationId);
  }

  async findOverrides(
    organizationId: string,
    projectId: string | null,
    startDate?: string,
    endDate?: string,
  ): Promise<WorkCalendarOverride[]> {
    const rangeSql = startDate && endDate
      ? "AND start_date <= ? AND end_date >= ?"
      : "";
    const rows = await this.database.query<CalendarRow & any>(
      `SELECT * FROM work_calendar_overrides
       WHERE organization_id = ?
         AND ${projectId === null ? "project_id IS NULL" : "project_id = ?"}
         AND deleted_at IS NULL
         ${rangeSql}
       ORDER BY start_date ASC, created_at ASC`,
      [organizationId, ...(projectId === null ? [] : [projectId]), ...(rangeSql ? [endDate!, startDate!] : [])],
    );
    return rows.map((row) => this.mapOverride(row));
  }

  async findOverride(
    organizationId: string,
    projectId: string | null,
    overrideId: string,
    connection?: DatabaseConnection,
    includeDeleted = false,
  ) {
    const rows = await this.database.query<CalendarRow & any>(
      `SELECT * FROM work_calendar_overrides
       WHERE id = ? AND organization_id = ?
         AND ${projectId === null ? "project_id IS NULL" : "project_id = ?"}
         ${includeDeleted ? "" : "AND deleted_at IS NULL"}
       LIMIT 1`,
      [overrideId, organizationId, ...(projectId === null ? [] : [projectId])],
      connection,
    );
    return rows[0] ? this.mapOverride(rows[0]) : null;
  }

  async createOverride(
    organizationId: string,
    projectId: string | null,
    input: CreateWorkCalendarOverrideInput,
    actorId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.lockOrganization(organizationId, connection);
      if (await this.hasOverrideConflict(organizationId, projectId, input.startDate, input.endDate, null, connection)) {
        throw new Error("WORK_CALENDAR_OVERRIDE_CONFLICT");
      }
      await this.database.execute(
        `INSERT INTO work_calendar_overrides
          (id, organization_id, project_id, start_date, end_date, day_type, name, reason, source, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)`,
        [id, organizationId, projectId, input.startDate, input.endDate, input.dayType, input.name.trim(), input.reason?.trim() || null, actorId, actorId],
        connection,
      );
    });
    return this.findOverride(organizationId, projectId, id);
  }

  async updateOverride(
    organizationId: string,
    projectId: string | null,
    overrideId: string,
    input: UpdateWorkCalendarOverrideInput,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      await this.lockOrganization(organizationId, connection);
      const rows = await this.database.query<CalendarRow & any>(
        `SELECT * FROM work_calendar_overrides WHERE id = ? AND organization_id = ?
         AND ${projectId === null ? "project_id IS NULL" : "project_id = ?"}
         AND deleted_at IS NULL FOR UPDATE`,
        [overrideId, organizationId, ...(projectId === null ? [] : [projectId])],
        connection,
      );
      const current = rows[0];
      if (!current) throw new Error("WORK_CALENDAR_OVERRIDE_NOT_FOUND");
      const startDate = input.startDate ?? dateOnly(current.start_date);
      const endDate = input.endDate ?? dateOnly(current.end_date);
      if (await this.hasOverrideConflict(organizationId, projectId, startDate, endDate, overrideId, connection)) {
        throw new Error("WORK_CALENDAR_OVERRIDE_CONFLICT");
      }
      await this.database.execute(
        `UPDATE work_calendar_overrides SET
          start_date = ?, end_date = ?, day_type = ?, name = ?, reason = ?,
          updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [startDate, endDate, input.dayType ?? current.day_type, (input.name ?? current.name).trim(), input.reason === undefined ? current.reason : input.reason?.trim() || null, actorId, overrideId],
        connection,
      );
    });
    return this.findOverride(organizationId, projectId, overrideId);
  }

  async removeOverride(
    organizationId: string,
    projectId: string | null,
    overrideId: string,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE work_calendar_overrides
       SET deleted_at = CURRENT_TIMESTAMP(3), deleted_by = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND organization_id = ?
         AND ${projectId === null ? "project_id IS NULL" : "project_id = ?"}
         AND deleted_at IS NULL`,
      [actorId, actorId, overrideId, organizationId, ...(projectId === null ? [] : [projectId])],
    );
    if (result.affectedRows === 0) {
      const existing = await this.findOverride(organizationId, projectId, overrideId, undefined, true);
      if (!existing) return false;
    }
    return true;
  }

  private async hasOverrideConflict(
    organizationId: string,
    projectId: string | null,
    startDate: string,
    endDate: string,
    excludeId: string | null,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<CalendarRow & any>(
      `SELECT id FROM work_calendar_overrides
       WHERE organization_id = ?
         AND ${projectId === null ? "project_id IS NULL" : "project_id = ?"}
         AND deleted_at IS NULL
         AND start_date <= ? AND end_date >= ?
         ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1`,
      [organizationId, ...(projectId === null ? [] : [projectId]), endDate, startDate, ...(excludeId ? [excludeId] : [])],
      connection,
    );
    return Boolean(rows[0]);
  }

  private async lockOrganization(organizationId: string, connection: DatabaseConnection) {
    await this.database.query<CalendarRow & any>(
      "SELECT id FROM organizations WHERE id = ? FOR UPDATE",
      [organizationId],
      connection,
    );
  }

  private mapOverride(row: CalendarRow): WorkCalendarOverride {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      scope: row.project_id ? "PROJECT" : "ORGANIZATION",
      startDate: dateOnly(row.start_date),
      endDate: dateOnly(row.end_date),
      dayType: row.day_type,
      name: row.name,
      reason: row.reason,
      source: "MANUAL",
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
