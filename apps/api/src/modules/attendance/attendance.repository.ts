import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  AttendanceRecord,
  AttendanceListResponse,
  SaveAttendanceInput,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { QueryParam } from "../../database/database.types";

export type AttendanceExportRow = {
  workerCode: string;
  workerName: string;
  trade: string;
  workDate: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  notes: string | null;
  markedAt: string;
  lastEditedAt: string | null;
};

@Injectable()
export class AttendanceRepository {
  constructor(private readonly database: DatabaseService) {}

  async findByProjectDate(
    organizationId: string,
    projectId: string,
    workDate: string,
  ): Promise<AttendanceRecord[]> {
    const rows = await this.database.query<any>(
      `SELECT *
       FROM attendance_records
       WHERE organization_id = ?
         AND project_id = ?
         AND work_date = ?
         AND deleted_at IS NULL`,
      [organizationId, projectId, workDate],
    );

    return rows.map((row) => this.mapRow(row));
  }

  async findExportRowsByProjectDate(
    organizationId: string,
    projectId: string,
    workDate: string,
  ): Promise<AttendanceExportRow[]> {
    const rows = await this.database.query<any>(
      `SELECT
         w.worker_code,
         w.name AS worker_name,
         w.trade,
         ar.work_date,
         ar.status,
         ar.check_in,
         ar.check_out,
         ar.notes,
         ar.marked_at,
         ar.last_edited_at
       FROM attendance_records ar
       INNER JOIN worker_project_assignments wpa
         ON wpa.id = ar.worker_assignment_id
        AND wpa.organization_id = ar.organization_id
        AND wpa.project_id = ar.project_id
       INNER JOIN workers w
         ON w.id = wpa.worker_id
        AND w.organization_id = ar.organization_id
       WHERE ar.organization_id = ?
         AND ar.project_id = ?
         AND ar.work_date = ?
         AND ar.deleted_at IS NULL
       ORDER BY w.name ASC, w.worker_code ASC`,
      [organizationId, projectId, workDate],
    );

    return rows.map((row) => ({
      workerCode: row.worker_code,
      workerName: row.worker_name,
      trade: row.trade,
      workDate: row.work_date,
      status: row.status,
      checkIn: row.check_in,
      checkOut: row.check_out,
      notes: row.notes,
      markedAt: row.marked_at,
      lastEditedAt: row.last_edited_at,
    }));
  }

  async upsertMany(
    organizationId: string,
    projectId: string,
    workDate: string,
    entries: SaveAttendanceInput["entries"],
    actorId: string,
  ): Promise<AttendanceRecord[]> {
    const created: AttendanceRecord[] = [];

    for (const entry of entries) {
      const existing = await this.database.query<any>(
        `SELECT *
         FROM attendance_records
         WHERE organization_id = ?
           AND project_id = ?
           AND worker_assignment_id = ?
           AND work_date = ?
           AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, projectId, entry.workerAssignmentId, workDate],
      );

      if (existing.length > 0) {
        const previousStatus = existing[0].status;
        const updated = await this.database.execute(
          `UPDATE attendance_records
           SET status = ?,
               check_in = ?,
               check_out = ?,
               notes = ?,
               last_edited_by = ?,
               last_edited_at = CURRENT_TIMESTAMP(3),
               updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [
            entry.status,
            entry.checkIn ?? null,
            entry.checkOut ?? null,
            entry.notes ?? null,
            actorId,
            existing[0].id,
          ],
        );

        created.push({
          id: existing[0].id,
          organizationId,
          projectId,
          workerAssignmentId: entry.workerAssignmentId,
          workDate,
          status: entry.status,
          checkIn: entry.checkIn ?? null,
          checkOut: entry.checkOut ?? null,
          notes: entry.notes ?? null,
          markedBy: existing[0].marked_by,
          markedAt: existing[0].marked_at,
          lastEditedBy: actorId,
          lastEditedAt: new Date().toISOString(),
          deletedAt: existing[0].deleted_at,
          deletedBy: existing[0].deleted_by,
          createdAt: existing[0].created_at,
          updatedAt: new Date().toISOString(),
          ...({ previousStatus } as any),
        });
        continue;
      }

      const id = randomUUID();
      await this.database.execute(
        `INSERT INTO attendance_records (
          id,
          organization_id,
          project_id,
          worker_assignment_id,
          work_date,
          status,
          check_in,
          check_out,
          notes,
          marked_by,
          marked_at,
          last_edited_by,
          last_edited_at,
          created_at,
          updated_at,
          sync_status,
          client_created_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), 'PENDING', ? )`,
        [
          id,
          organizationId,
          projectId,
          entry.workerAssignmentId,
          workDate,
          entry.status,
          entry.checkIn ?? null,
          entry.checkOut ?? null,
          entry.notes ?? null,
          actorId,
          actorId,
          randomUUID(),
        ],
      );

      created.push({
        id,
        organizationId,
        projectId,
        workerAssignmentId: entry.workerAssignmentId,
        workDate,
        status: entry.status,
        checkIn: entry.checkIn ?? null,
        checkOut: entry.checkOut ?? null,
        notes: entry.notes ?? null,
        markedBy: actorId,
        markedAt: new Date().toISOString(),
        lastEditedBy: actorId,
        lastEditedAt: new Date().toISOString(),
        deletedAt: null,
        deletedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return created;
  }

  async findAssignableAssignmentIds(
    organizationId: string,
    projectId: string,
    workDate: string,
    assignmentIds: string[],
  ): Promise<string[]> {
    if (!assignmentIds.length) return [];

    const placeholders = assignmentIds.map(() => "?").join(", ");
    const rows = await this.database.query<{ id: string } & any>(
      `SELECT id
       FROM worker_project_assignments
       WHERE organization_id = ?
         AND project_id = ?
         AND status = 'ACTIVE'
         AND starts_on <= ?
         AND (ends_on IS NULL OR ends_on >= ?)
         AND id IN (${placeholders})`,
      [organizationId, projectId, workDate, workDate, ...assignmentIds],
    );

    return rows.map((row) => row.id);
  }

  async findById(organizationId: string, projectId: string, id: string) {
    const rows = await this.database.query<any>(
      `SELECT *
       FROM attendance_records
       WHERE organization_id = ?
         AND project_id = ?
         AND id = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [organizationId, projectId, id],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async updateById(
    id: string,
    organizationId: string,
    projectId: string,
    fields: {
      status?: string;
      checkIn?: string | null;
      checkOut?: string | null;
      notes?: string | null;
      lastEditedBy: string;
      previousStatus?: string | null;
    },
  ): Promise<AttendanceRecord> {
    const row = await this.findById(organizationId, projectId, id);
    if (!row) {
      throw new Error("ATTENDANCE_NOT_FOUND");
    }

    const previousStatus = fields.previousStatus ?? row.status;
    const updates: string[] = [];
    const params: QueryParam[] = [];

    if (fields.status) {
      updates.push("status = ?");
      params.push(fields.status);
    }
    if (fields.checkIn !== undefined) {
      updates.push("check_in = ?");
      params.push(fields.checkIn ?? null);
    }
    if (fields.checkOut !== undefined) {
      updates.push("check_out = ?");
      params.push(fields.checkOut ?? null);
    }
    if (fields.notes !== undefined) {
      updates.push("notes = ?");
      params.push(fields.notes ?? null);
    }

    updates.push("last_edited_by = ?");
    params.push(fields.lastEditedBy);
    updates.push("last_edited_at = CURRENT_TIMESTAMP(3)");
    updates.push("updated_at = CURRENT_TIMESTAMP(3)");

    params.push(id, organizationId, projectId);
    await this.database.execute(
      `UPDATE attendance_records
       SET ${updates.join(", ")}
       WHERE id = ?
         AND organization_id = ?
         AND project_id = ?`,
      params,
    );

    const updated = await this.findById(organizationId, projectId, id);
    if (!updated) {
      throw new Error("ATTENDANCE_NOT_FOUND_AFTER_UPDATE");
    }
    return {
      ...updated,
      previousStatus,
    } as AttendanceRecord & { previousStatus?: string | null };
  }

  private mapRow(row: any): AttendanceRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      workerAssignmentId: row.worker_assignment_id,
      workDate: row.work_date,
      status: row.status,
      checkIn: row.check_in,
      checkOut: row.check_out,
      overtimeHours: row.overtime_hours,
      notes: row.notes,
      markedBy: row.marked_by,
      markedAt: row.marked_at,
      lastEditedBy: row.last_edited_by,
      lastEditedAt: row.last_edited_at,
      syncMetadata: row.sync_metadata ?? null,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
