import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  ProjectWorkerRosterItem,
  WorkerAssignmentStatus,
  WorkerDetail,
  WorkerDuplicateCandidate,
  WorkerDeletionResult,
  WorkerListResponse,
  WorkerProjectAssignmentSummary,
  WorkerPrimaryProjectPeriod,
  WorkerSummary,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type {
  DatabaseConnection,
  DbRow,
  QueryParam,
} from "../../database/database.types";
import type { AssignWorkerDto } from "./dto/assign-worker.dto";
import type { CreateWorkerDto } from "./dto/create-worker.dto";
import type { QueryWorkerDto } from "./dto/query-worker.dto";
import type { UpdateWorkerAssignmentDto } from "./dto/update-worker-assignment.dto";
import type { UpdateWorkerDto } from "./dto/update-worker.dto";
import type { WorkerAssignmentRow, WorkerRow } from "./types/workers.types";

const WORKER_CODE_ALLOCATION_ATTEMPTS = 3;

type RosterRow = WorkerRow & {
  assignment_id: string;
  assignment_organization_id: string;
  assignment_project_id: string;
  assignment_worker_id: string;
  assignment_project_name: string | null;
  assignment_role_label: string | null;
  assignment_daily_rate: string | null;
  assignment_status: WorkerAssignmentStatus;
  assignment_starts_on: Date | string;
  assignment_ends_on: Date | string | null;
  assignment_created_at: Date | string;
  assignment_updated_at: Date | string;
  assignment_ended_at: Date | string | null;
};

type AssignmentInsertInput = {
  dailyRate?: number | string | null;
  startsOn?: string | null;
  endsOn?: string | null;
};

interface WorkerDeletionRow extends DbRow {
  id: string;
  worker_code: string;
  name: string;
}

interface WageBatchIdRow extends DbRow {
  id: string;
}

function normalizeMobile(mobile?: string | null) {
  const digits = mobile?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function serializeDate(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function dateOnlyValue(value: Date | string) {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

function nullableDateOnly(value: Date | string | null) {
  return value ? dateOnlyValue(value) : null;
}

function mapAssignmentRow(
  row: WorkerAssignmentRow,
): WorkerProjectAssignmentSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    workerId: row.worker_id,
    projectName: row.project_name ?? null,
    roleLabel: row.role_label,
    dailyRate: row.daily_rate === null ? null : String(row.daily_rate),
    status: row.status,
    startsOn: serializeDate(row.starts_on) ?? "",
    endsOn: serializeDate(row.ends_on),
    createdAt: serializeDate(row.created_at) ?? "",
    updatedAt: serializeDate(row.updated_at) ?? "",
    endedAt: serializeDate(row.ended_at),
  };
}

function mapWorkerRow(
  row: WorkerRow,
  currentAssignment: WorkerProjectAssignmentSummary | null = null,
): WorkerSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workerCode: row.worker_code,
    name: row.name,
    trade: row.trade,
    baseDailyRate:
      row.base_daily_rate === null ? null : String(row.base_daily_rate),
    mobileNumber: row.mobile_number,
    notes: row.notes,
    status: row.status,
    activeAssignmentCount: Number(row.activeAssignmentCount ?? 0),
    currentAssignment,
    createdAt: serializeDate(row.created_at) ?? "",
    updatedAt: serializeDate(row.updated_at) ?? "",
    deactivatedAt: serializeDate(row.deactivated_at),
  };
}

function mapRosterAssignment(row: RosterRow): WorkerProjectAssignmentSummary {
  return {
    id: row.assignment_id,
    organizationId: row.assignment_organization_id,
    projectId: row.assignment_project_id,
    workerId: row.assignment_worker_id,
    projectName: row.assignment_project_name,
    roleLabel: row.assignment_role_label,
    dailyRate:
      row.assignment_daily_rate === null
        ? null
        : String(row.assignment_daily_rate),
    status: row.assignment_status,
    startsOn: serializeDate(row.assignment_starts_on) ?? "",
    endsOn: serializeDate(row.assignment_ends_on),
    createdAt: serializeDate(row.assignment_created_at) ?? "",
    updatedAt: serializeDate(row.assignment_updated_at) ?? "",
    endedAt: serializeDate(row.assignment_ended_at),
  };
}

@Injectable()
export class WorkersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll(
    organizationId: string,
    query: QueryWorkerDto,
    memberId: string,
    organizationWideProjectAccess: boolean,
  ): Promise<WorkerListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const params: QueryParam[] = [organizationId];
    const where = ["w.organization_id = ?"];
    const join = organizationWideProjectAccess
      ? ""
      : `INNER JOIN worker_project_assignments current_wpa
        ON current_wpa.worker_id = w.id
        AND current_wpa.organization_id = w.organization_id
        AND current_wpa.status = 'ACTIVE'
      INNER JOIN project_members current_pm
        ON current_pm.project_id = current_wpa.project_id
        AND current_pm.organization_id = current_wpa.organization_id
        AND current_pm.member_id = ?
        AND current_pm.status = 'ACTIVE'`;

    if (!organizationWideProjectAccess) params.push(memberId);
    if (query.search) {
      where.push(
        "(w.name LIKE ? OR w.worker_code LIKE ? OR w.mobile_number LIKE ?)",
      );
      params.push(
        `%${query.search}%`,
        `%${query.search}%`,
        `%${query.search}%`,
      );
    }
    if (query.status) {
      where.push("w.status = ?");
      params.push(query.status);
    }
    if (query.trade) {
      where.push("w.trade LIKE ?");
      params.push(`%${query.trade}%`);
    }
    if (query.projectId) {
      where.push(
        "EXISTS (SELECT 1 FROM worker_project_assignments fpa WHERE fpa.organization_id = w.organization_id AND fpa.worker_id = w.id AND fpa.project_id = ?)",
      );
      params.push(query.projectId);
    }

    const sortBy = this.safeSortBy(query.sortBy);
    const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const [rows, totalRows] = await Promise.all([
      this.database.query<WorkerRow>(
        `${this.workerSelectSql()}
        ${join}
        ${whereSql}
        GROUP BY w.id
        ORDER BY w.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ total: number } & WorkerRow>(
        `SELECT COUNT(DISTINCT w.id) AS total
        FROM workers w
        ${join}
        ${whereSql}`,
        params,
      ),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    return {
      data: rows.map((row) => mapWorkerRow(row)),
      meta: { total, page, pageSize, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async findProjectRoster(
    organizationId: string,
    projectId: string,
    query: QueryWorkerDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;
    const params: QueryParam[] = [organizationId, projectId];
    const where = [
      "w.organization_id = ?",
      "wpa.project_id = ?",
      "w.status = 'ACTIVE'",
      "wpa.status = 'ACTIVE'",
    ];
    if (query.assignmentScope !== "ALL_ACTIVE") {
      if (query.date) {
        where.push(
          "wpa.starts_on <= ?",
          "(wpa.ends_on IS NULL OR wpa.ends_on >= ?)",
        );
        params.push(query.date, query.date);
      } else {
        where.push(
          "wpa.starts_on <= CURRENT_DATE()",
          "(wpa.ends_on IS NULL OR wpa.ends_on >= CURRENT_DATE())",
        );
      }
    }
    if (query.status) {
      where.push("w.status = ?");
      params.push(query.status);
    }
    if (query.search) {
      where.push(
        "(w.name LIKE ? OR w.worker_code LIKE ? OR w.mobile_number LIKE ?)",
      );
      params.push(
        `%${query.search}%`,
        `%${query.search}%`,
        `%${query.search}%`,
      );
    }
    if (query.trade) {
      where.push("w.trade LIKE ?");
      params.push(`%${query.trade}%`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;
    const [rows, totalRows] = await Promise.all([
      this.database.query<RosterRow>(
        `SELECT
          ${this.workerColumns("w")},
          COUNT(DISTINCT active_wpa.id) AS activeAssignmentCount,
          wpa.id AS assignment_id,
          wpa.organization_id AS assignment_organization_id,
          wpa.project_id AS assignment_project_id,
          wpa.worker_id AS assignment_worker_id,
          p.name AS assignment_project_name,
          wpa.role_label AS assignment_role_label,
          wpa.daily_rate AS assignment_daily_rate,
          wpa.status AS assignment_status,
          wpa.starts_on AS assignment_starts_on,
          wpa.ends_on AS assignment_ends_on,
          wpa.created_at AS assignment_created_at,
          wpa.updated_at AS assignment_updated_at,
          wpa.ended_at AS assignment_ended_at
        FROM worker_project_assignments wpa
        INNER JOIN workers w ON w.id = wpa.worker_id AND w.organization_id = wpa.organization_id
        INNER JOIN projects p ON p.id = wpa.project_id AND p.organization_id = wpa.organization_id
        LEFT JOIN worker_project_assignments active_wpa
          ON active_wpa.worker_id = w.id
          AND active_wpa.organization_id = w.organization_id
          AND active_wpa.status = 'ACTIVE'
        ${whereSql}
        GROUP BY w.id, wpa.id
        ORDER BY w.name ASC
        LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ total: number } & WorkerRow>(
        `SELECT COUNT(DISTINCT wpa.id) AS total
        FROM worker_project_assignments wpa
        INNER JOIN workers w ON w.id = wpa.worker_id AND w.organization_id = wpa.organization_id
        ${whereSql}`,
        params,
      ),
    ]);
    const data = rows.map((row) => {
      const currentAssignment = mapRosterAssignment(row);
      return {
        ...mapWorkerRow(row, currentAssignment),
        currentAssignment,
      } satisfies ProjectWorkerRosterItem;
    });
    const total = Number(totalRows[0]?.total ?? 0);
    return {
      data,
      meta: { total, page, pageSize, pageCount: Math.ceil(total / pageSize) },
    };
  }

  async findById(
    organizationId: string,
    workerId: string,
  ): Promise<WorkerDetail | null> {
    const rows = await this.database.query<WorkerRow>(
      `${this.workerSelectSql()}
      WHERE w.organization_id = ? AND w.id = ?
      GROUP BY w.id
      LIMIT 1`,
      [organizationId, workerId],
    );
    if (!rows[0]) return null;
    const assignments = await this.findAssignmentsForWorker(
      organizationId,
      workerId,
    );
    return {
      ...mapWorkerRow(rows[0]),
      assignments,
    };
  }

  async findAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
  ) {
    const rows = await this.database.query<WorkerAssignmentRow>(
      `${this.assignmentSelectSql()}
      WHERE wpa.organization_id = ? AND wpa.project_id = ? AND wpa.worker_id = ?
      ORDER BY wpa.created_at DESC
      LIMIT 1`,
      [organizationId, projectId, workerId],
    );
    return rows[0] ? mapAssignmentRow(rows[0]) : null;
  }

  async findActiveAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
  ) {
    const rows = await this.database.query<WorkerAssignmentRow>(
      `${this.assignmentSelectSql()}
      WHERE wpa.organization_id = ?
        AND wpa.project_id = ?
        AND wpa.worker_id = ?
        AND wpa.status = 'ACTIVE'
      ORDER BY wpa.created_at DESC
      LIMIT 1`,
      [organizationId, projectId, workerId],
    );
    return rows[0] ? mapAssignmentRow(rows[0]) : null;
  }

  async findAssignmentById(
    organizationId: string,
    workerId: string,
    assignmentId: string,
  ) {
    const rows = await this.database.query<WorkerAssignmentRow>(
      `${this.assignmentSelectSql()}
       WHERE wpa.organization_id = ? AND wpa.worker_id = ? AND wpa.id = ?
       LIMIT 1`,
      [organizationId, workerId, assignmentId],
    );
    return rows[0] ? mapAssignmentRow(rows[0]) : null;
  }

  async findPrimaryProjectPeriods(
    organizationId: string,
    workerId: string,
    memberId?: string,
  ): Promise<WorkerPrimaryProjectPeriod[]> {
    const rows = await this.database.query<any>(
      `SELECT wpp.*, wpa.project_id, p.name AS project_name
       FROM worker_primary_project_periods wpp
       INNER JOIN worker_project_assignments wpa
         ON wpa.id = wpp.worker_assignment_id
        AND wpa.organization_id = wpp.organization_id
        AND wpa.worker_id = wpp.worker_id
       INNER JOIN projects p
         ON p.id = wpa.project_id AND p.organization_id = wpa.organization_id
       ${
         memberId
           ? `INNER JOIN project_members pm
         ON pm.organization_id = wpa.organization_id
        AND pm.project_id = wpa.project_id
        AND pm.member_id = ?
        AND pm.status = 'ACTIVE'`
           : ""
       }
       WHERE wpp.organization_id = ? AND wpp.worker_id = ?
       ORDER BY wpp.starts_on DESC`,
      [...(memberId ? [memberId] : []), organizationId, workerId],
    );
    return rows.map((row: any) => this.mapPrimaryPeriod(row));
  }

  async findPrimaryProjectPeriodById(
    organizationId: string,
    workerId: string,
    periodId: string,
  ) {
    const rows = await this.database.query<any>(
      `SELECT wpp.*, wpa.project_id, p.name AS project_name
       FROM worker_primary_project_periods wpp
       INNER JOIN worker_project_assignments wpa ON wpa.id = wpp.worker_assignment_id
       INNER JOIN projects p ON p.id = wpa.project_id AND p.organization_id = wpp.organization_id
       WHERE wpp.organization_id = ? AND wpp.worker_id = ? AND wpp.id = ?
       LIMIT 1`,
      [organizationId, workerId, periodId],
    );
    return rows[0] ? this.mapPrimaryPeriod(rows[0]) : null;
  }

  async createPrimaryProjectPeriod(
    organizationId: string,
    workerId: string,
    input: {
      workerAssignmentId: string;
      startsOn: string;
      endsOn?: string | null;
    },
    actorId: string,
  ) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.lockWorker(organizationId, workerId, connection);
      await this.assertPrimaryAssignmentWindow(
        organizationId,
        workerId,
        input.workerAssignmentId,
        input.startsOn,
        input.endsOn ?? null,
        connection,
      );
      await this.assertNoPrimaryOverlap(
        organizationId,
        workerId,
        input.startsOn,
        input.endsOn ?? null,
        null,
        connection,
      );
      await this.database.execute(
        `INSERT INTO worker_primary_project_periods
          (id, organization_id, worker_id, worker_assignment_id, starts_on, ends_on, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          workerId,
          input.workerAssignmentId,
          input.startsOn,
          input.endsOn ?? null,
          actorId,
          actorId,
        ],
        connection,
      );
    });
    return this.findPrimaryProjectPeriodById(organizationId, workerId, id);
  }

  async updatePrimaryProjectPeriod(
    organizationId: string,
    workerId: string,
    periodId: string,
    input: {
      workerAssignmentId?: string;
      startsOn?: string;
      endsOn?: string | null;
    },
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      await this.lockWorker(organizationId, workerId, connection);
      const rows = await this.database.query<any>(
        `SELECT * FROM worker_primary_project_periods
         WHERE organization_id = ? AND worker_id = ? AND id = ? FOR UPDATE`,
        [organizationId, workerId, periodId],
        connection,
      );
      const current = rows[0];
      if (!current) throw new Error("WORKER_PRIMARY_PERIOD_NOT_FOUND");
      const assignmentId =
        input.workerAssignmentId ?? current.worker_assignment_id;
      const startsOn = input.startsOn ?? dateOnlyValue(current.starts_on);
      const endsOn =
        input.endsOn === undefined
          ? nullableDateOnly(current.ends_on)
          : input.endsOn;
      await this.assertPrimaryAssignmentWindow(
        organizationId,
        workerId,
        assignmentId,
        startsOn,
        endsOn,
        connection,
      );
      await this.assertNoPrimaryOverlap(
        organizationId,
        workerId,
        startsOn,
        endsOn,
        periodId,
        connection,
      );
      await this.database.execute(
        `UPDATE worker_primary_project_periods
         SET worker_assignment_id = ?, starts_on = ?, ends_on = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [assignmentId, startsOn, endsOn, actorId, periodId],
        connection,
      );
    });
    return this.findPrimaryProjectPeriodById(
      organizationId,
      workerId,
      periodId,
    );
  }

  async endPrimaryProjectPeriod(
    organizationId: string,
    workerId: string,
    periodId: string,
    endsOn: string,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      await this.lockWorker(organizationId, workerId, connection);
      const rows = await this.database.query<any>(
        `SELECT * FROM worker_primary_project_periods
         WHERE organization_id = ? AND worker_id = ? AND id = ? FOR UPDATE`,
        [organizationId, workerId, periodId],
        connection,
      );
      const current = rows[0];
      if (!current) throw new Error("WORKER_PRIMARY_PERIOD_NOT_FOUND");
      const startsOn = dateOnlyValue(current.starts_on);
      await this.assertPrimaryAssignmentWindow(
        organizationId,
        workerId,
        current.worker_assignment_id,
        startsOn,
        endsOn,
        connection,
      );
      await this.assertNoPrimaryOverlap(
        organizationId,
        workerId,
        startsOn,
        endsOn,
        periodId,
        connection,
      );
      await this.database.execute(
        `UPDATE worker_primary_project_periods
         SET ends_on = ?, ended_by = ?, ended_at = CURRENT_TIMESTAMP(3), updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [endsOn, actorId, actorId, periodId],
        connection,
      );
    });
    return this.findPrimaryProjectPeriodById(
      organizationId,
      workerId,
      periodId,
    );
  }

  async hasActiveAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
  ) {
    const rows = await this.database.query<
      { id: string } & WorkerAssignmentRow
    >(
      `SELECT id FROM worker_project_assignments
      WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'
      LIMIT 1`,
      [organizationId, projectId, workerId],
    );
    return Boolean(rows[0]);
  }

  async isWorkerVisibleToMember(
    organizationId: string,
    workerId: string,
    memberId: string,
  ) {
    const rows = await this.database.query<{ id: string } & WorkerRow>(
      `SELECT w.id
      FROM workers w
      INNER JOIN worker_project_assignments wpa
        ON wpa.worker_id = w.id
        AND wpa.organization_id = w.organization_id
        AND wpa.status = 'ACTIVE'
      INNER JOIN project_members pm
        ON pm.project_id = wpa.project_id
        AND pm.organization_id = wpa.organization_id
        AND pm.member_id = ?
        AND pm.status = 'ACTIVE'
      WHERE w.organization_id = ? AND w.id = ?
      LIMIT 1`,
      [memberId, organizationId, workerId],
    );
    return Boolean(rows[0]);
  }

  async create(organizationId: string, dto: CreateWorkerDto, actorId: string) {
    const workerId = randomUUID();
    for (
      let attempt = 1;
      attempt <= WORKER_CODE_ALLOCATION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await this.database.transaction(async (connection) => {
          const workerCode = await this.generateWorkerCode(
            organizationId,
            connection,
          );
          await this.database.execute(
            `INSERT INTO workers
              (id, organization_id, worker_code, name, trade, base_daily_rate, mobile_number, notes, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              workerId,
              organizationId,
              workerCode,
              dto.name.trim(),
              dto.trade.trim(),
              dto.dailyRate ?? null,
              normalizeMobile(dto.mobileNumber),
              dto.notes?.trim() || null,
              actorId,
              actorId,
            ],
            connection,
          );

          if (dto.projectId) {
            await this.insertAssignment(
              organizationId,
              dto.projectId,
              workerId,
              {
                dailyRate: dto.dailyRate,
                startsOn: dto.startsOn,
              },
              actorId,
              connection,
            );
          }
        });
        break;
      } catch (error) {
        if (
          attempt === WORKER_CODE_ALLOCATION_ATTEMPTS ||
          !this.isWorkerCodeDuplicate(error)
        ) {
          throw error;
        }
      }
    }
    return this.findById(organizationId, workerId);
  }

  async update(
    organizationId: string,
    workerId: string,
    dto: UpdateWorkerDto,
    actorId: string,
  ) {
    const entries = (
      [
        ["name", dto.name?.trim()],
        ["trade", dto.trade?.trim()],
        [
          "base_daily_rate",
          dto.dailyRate === undefined ? undefined : (dto.dailyRate ?? null),
        ],
        [
          "mobile_number",
          dto.mobileNumber === undefined
            ? undefined
            : normalizeMobile(dto.mobileNumber),
        ],
        [
          "notes",
          dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        ],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE workers
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND id = ?`,
        [
          ...entries.map(([, value]) => value),
          actorId,
          organizationId,
          workerId,
        ],
      );
    }
    return this.findById(organizationId, workerId);
  }

  async deactivate(organizationId: string, workerId: string, actorId: string) {
    await this.database.execute(
      `UPDATE workers
      SET status = 'INACTIVE',
        deactivated_at = CURRENT_TIMESTAMP(3),
        deactivated_by = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND id = ?`,
      [actorId, actorId, organizationId, workerId],
    );
    return this.findById(organizationId, workerId);
  }

  async deletePermanently(
    organizationId: string,
    workerId: string,
  ): Promise<WorkerDeletionResult | null> {
    return this.database.transaction(async (connection) => {
      const workers = await this.database.query<WorkerDeletionRow>(
        `SELECT id, worker_code, name
         FROM workers
         WHERE organization_id = ? AND id = ?
         FOR UPDATE`,
        [organizationId, workerId],
        connection,
      );
      const worker = workers[0];
      if (!worker) return null;

      const wageBatches = await this.database.query<WageBatchIdRow>(
        `SELECT DISTINCT wage_batch_id AS id
         FROM wage_items
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );

      const kharchiDeductionAllocations = await this.database.execute(
        `DELETE FROM kharchi_deduction_allocations
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );

      const wagePayments = await this.database.execute(
        `DELETE wp
         FROM wage_payments wp
         INNER JOIN wage_items wi
           ON wi.id = wp.wage_item_id
          AND wi.organization_id = wp.organization_id
         WHERE wi.organization_id = ? AND wi.worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const wageItems = await this.database.execute(
        `DELETE FROM wage_items
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );

      let emptyWageBatchCount = 0;
      if (wageBatches.length > 0) {
        const batchIds = wageBatches.map((batch) => batch.id);
        const placeholders = batchIds.map(() => "?").join(", ");
        const emptyWageBatches = await this.database.execute(
          `DELETE wb
           FROM wage_batches wb
           LEFT JOIN wage_items wi ON wi.wage_batch_id = wb.id
           WHERE wb.organization_id = ?
             AND wb.id IN (${placeholders})
             AND wi.id IS NULL`,
          [organizationId, ...batchIds],
          connection,
        );
        emptyWageBatchCount = emptyWageBatches.affectedRows;
      }

      const attendanceExceptions = await this.database.execute(
        `DELETE ae
         FROM attendance_exceptions ae
         INNER JOIN worker_project_assignments wpa
           ON wpa.id = ae.worker_assignment_id
          AND wpa.organization_id = ae.organization_id
         WHERE wpa.organization_id = ? AND wpa.worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const attendanceRecords = await this.database.execute(
        `DELETE ar
         FROM attendance_records ar
         INNER JOIN worker_project_assignments wpa
           ON wpa.id = ar.worker_assignment_id
          AND wpa.organization_id = ar.organization_id
         WHERE wpa.organization_id = ? AND wpa.worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const kharchiAdjustments = await this.database.execute(
        `DELETE kaja
         FROM kharchi_adjustments kaja
         INNER JOIN kharchi_advances ka
           ON ka.id = kaja.kharchi_advance_id
          AND ka.organization_id = kaja.organization_id
         WHERE ka.organization_id = ? AND ka.worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const kharchiAdvances = await this.database.execute(
        `DELETE FROM kharchi_advances
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const primaryProjectPeriods = await this.database.execute(
        `DELETE FROM worker_primary_project_periods
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      const projectAssignments = await this.database.execute(
        `DELETE FROM worker_project_assignments
         WHERE organization_id = ? AND worker_id = ?`,
        [organizationId, workerId],
        connection,
      );
      await this.database.execute(
        `DELETE FROM workers
         WHERE organization_id = ? AND id = ?`,
        [organizationId, workerId],
        connection,
      );

      return {
        workerId: worker.id,
        workerCode: worker.worker_code,
        workerName: worker.name,
        deleted: true,
        deletedRecords: {
          kharchiDeductionAllocations: kharchiDeductionAllocations.affectedRows,
          kharchiAdjustments: kharchiAdjustments.affectedRows,
          kharchiAdvances: kharchiAdvances.affectedRows,
          wagePayments: wagePayments.affectedRows,
          wageItems: wageItems.affectedRows,
          emptyWageBatches: emptyWageBatchCount,
          attendanceExceptions: attendanceExceptions.affectedRows,
          attendanceRecords: attendanceRecords.affectedRows,
          primaryProjectPeriods: primaryProjectPeriods.affectedRows,
          projectAssignments: projectAssignments.affectedRows,
        },
      };
    });
  }

  async assignWorker(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: AssignWorkerDto,
    actorId: string,
  ) {
    const inserted = await this.database.transaction(async (connection) => {
      const lockedWorkers = await this.database.query<
        { id: string; base_daily_rate: string | null } & WorkerRow
      >(
        `SELECT id, base_daily_rate FROM workers
        WHERE organization_id = ? AND id = ?
        FOR UPDATE`,
        [organizationId, workerId],
        connection,
      );
      if (!lockedWorkers[0]) return false;
      const existing = await this.database.query<
        { id: string } & WorkerAssignmentRow
      >(
        `SELECT id FROM worker_project_assignments
        WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'
        LIMIT 1`,
        [organizationId, projectId, workerId],
        connection,
      );
      if (existing[0]) return false;
      await this.insertAssignment(
        organizationId,
        projectId,
        workerId,
        {
          startsOn: dto.startsOn,
          endsOn: dto.endsOn,
          dailyRate: lockedWorkers[0].base_daily_rate,
        },
        actorId,
        connection,
      );
      return true;
    });
    if (!inserted) return null;
    return this.findAssignment(organizationId, projectId, workerId);
  }

  async updateAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: UpdateWorkerAssignmentDto,
    actorId: string,
  ) {
    const entries = (
      [
        ["starts_on", dto.startsOn],
        [
          "ends_on",
          dto.endsOn === undefined ? undefined : (dto.endsOn ?? null),
        ],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      const result = await this.database.execute(
        `UPDATE worker_project_assignments
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'`,
        [
          ...entries.map(([, value]) => value),
          actorId,
          organizationId,
          projectId,
          workerId,
        ],
      );
      if (result.affectedRows === 0) return null;
    }
    return this.findActiveAssignment(organizationId, projectId, workerId);
  }

  async updateAssignmentRate(
    organizationId: string,
    projectId: string,
    workerId: string,
    dailyRate: number,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE worker_project_assignments
      SET daily_rate = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'`,
      [dailyRate, actorId, organizationId, projectId, workerId],
    );
    if (result.affectedRows === 0) return null;
    return this.findActiveAssignment(organizationId, projectId, workerId);
  }

  async endAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    endsOn: string,
    actorId: string,
  ) {
    const result = await this.database.execute(
      `UPDATE worker_project_assignments
      SET status = 'ENDED',
        ends_on = ?,
        ended_at = CURRENT_TIMESTAMP(3),
        ended_by = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'`,
      [endsOn, actorId, actorId, organizationId, projectId, workerId],
    );
    if (result.affectedRows === 0) return null;
    return this.findAssignment(organizationId, projectId, workerId);
  }

  async duplicateCandidates(
    organizationId: string,
    name?: string | null,
    mobileNumber?: string | null,
    excludeWorkerId?: string,
  ): Promise<WorkerDuplicateCandidate[]> {
    const normalizedMobile = normalizeMobile(mobileNumber);
    const nameToken = name?.trim().split(/\s+/)[0];
    if (!normalizedMobile && !nameToken) return [];

    const params: QueryParam[] = [organizationId];
    const conditions: string[] = [];
    if (normalizedMobile) {
      conditions.push("w.mobile_number = ?");
      params.push(normalizedMobile);
    }
    if (nameToken) {
      conditions.push("w.name LIKE ?");
      params.push(`%${nameToken}%`);
    }
    if (excludeWorkerId) params.push(excludeWorkerId);

    const rows = await this.database.query<WorkerRow>(
      `${this.workerSelectSql()}
      WHERE w.organization_id = ?
        AND (${conditions.join(" OR ")})
        ${excludeWorkerId ? "AND w.id <> ?" : ""}
      GROUP BY w.id
      ORDER BY w.updated_at DESC
      LIMIT 10`,
      params,
    );

    return rows.map((row) => ({
      id: row.id,
      workerCode: row.worker_code,
      name: row.name,
      trade: row.trade,
      mobileNumber: row.mobile_number,
      status: row.status,
      reason:
        normalizedMobile && row.mobile_number === normalizedMobile
          ? "MOBILE"
          : "NAME",
    }));
  }

  private async insertAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: AssignmentInsertInput,
    actorId: string,
    connection?: DatabaseConnection,
  ) {
    await this.database.execute(
      `INSERT INTO worker_project_assignments
        (id, organization_id, project_id, worker_id, role_label, daily_rate, starts_on, ends_on, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        organizationId,
        projectId,
        workerId,
        null,
        dto.dailyRate ?? null,
        dto.startsOn ?? new Date().toISOString().slice(0, 10),
        dto.endsOn ?? null,
        actorId,
        actorId,
      ],
      connection,
    );
  }

  private async lockWorker(
    organizationId: string,
    workerId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<any>(
      "SELECT id FROM workers WHERE organization_id = ? AND id = ? FOR UPDATE",
      [organizationId, workerId],
      connection,
    );
    if (!rows[0]) throw new Error("WORKER_NOT_FOUND");
  }

  private async assertPrimaryAssignmentWindow(
    organizationId: string,
    workerId: string,
    assignmentId: string,
    startsOn: string,
    endsOn: string | null,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<any>(
      `SELECT id, starts_on, ends_on FROM worker_project_assignments
       WHERE id = ? AND organization_id = ? AND worker_id = ?
       LIMIT 1 FOR UPDATE`,
      [assignmentId, organizationId, workerId],
      connection,
    );
    const assignment = rows[0];
    if (!assignment) throw new Error("WORKER_ASSIGNMENT_NOT_FOUND");
    const assignmentStart = dateOnlyValue(assignment.starts_on);
    const assignmentEnd = nullableDateOnly(assignment.ends_on);
    if (
      startsOn < assignmentStart ||
      (endsOn !== null && endsOn < startsOn) ||
      (assignmentEnd !== null && (endsOn === null || endsOn > assignmentEnd))
    )
      throw new Error("WORKER_PRIMARY_PERIOD_OUTSIDE_ASSIGNMENT");
  }

  private async assertNoPrimaryOverlap(
    organizationId: string,
    workerId: string,
    startsOn: string,
    endsOn: string | null,
    excludeId: string | null,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<any>(
      `SELECT id FROM worker_primary_project_periods
       WHERE organization_id = ? AND worker_id = ?
         AND starts_on <= COALESCE(?, '9999-12-31')
         AND COALESCE(ends_on, '9999-12-31') >= ?
         ${excludeId ? "AND id <> ?" : ""}
       LIMIT 1 FOR UPDATE`,
      [
        organizationId,
        workerId,
        endsOn,
        startsOn,
        ...(excludeId ? [excludeId] : []),
      ],
      connection,
    );
    if (rows[0]) throw new Error("WORKER_PRIMARY_PERIOD_OVERLAP");
  }

  private mapPrimaryPeriod(row: any): WorkerPrimaryProjectPeriod {
    return {
      id: row.id,
      organizationId: row.organization_id,
      workerId: row.worker_id,
      workerAssignmentId: row.worker_assignment_id,
      projectId: row.project_id,
      projectName: row.project_name ?? null,
      startsOn: dateOnlyValue(row.starts_on),
      endsOn: nullableDateOnly(row.ends_on),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: serializeDate(row.created_at) ?? "",
      updatedAt: serializeDate(row.updated_at) ?? "",
      endedBy: row.ended_by,
      endedAt: serializeDate(row.ended_at),
    };
  }

  private async findAssignmentsForWorker(
    organizationId: string,
    workerId: string,
  ) {
    const rows = await this.database.query<WorkerAssignmentRow>(
      `${this.assignmentSelectSql()}
      WHERE wpa.organization_id = ? AND wpa.worker_id = ?
      ORDER BY wpa.status ASC, wpa.starts_on DESC`,
      [organizationId, workerId],
    );
    return rows.map(mapAssignmentRow);
  }

  private async generateWorkerCode(
    organizationId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<{ nextNumber: number } & WorkerRow>(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(worker_code, 5) AS UNSIGNED)), 0) + 1 AS nextNumber
      FROM workers
      WHERE organization_id = ? AND worker_code LIKE 'WRK-%'`,
      [organizationId],
      connection,
    );
    const nextNumber = Number(rows[0]?.nextNumber ?? 1);
    return `WRK-${String(nextNumber).padStart(5, "0")}`;
  }

  private isWorkerCodeDuplicate(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const mysqlError = error as {
      code?: string;
      message?: string;
      sqlMessage?: string;
    };
    const message = `${mysqlError.message ?? ""} ${mysqlError.sqlMessage ?? ""}`;
    return (
      mysqlError.code === "ER_DUP_ENTRY" &&
      message.includes("uq_workers_organization_worker_code")
    );
  }

  private safeSortBy(sortBy?: string) {
    const allowed = new Set([
      "name",
      "worker_code",
      "trade",
      "status",
      "created_at",
      "updated_at",
    ]);
    return allowed.has(sortBy ?? "") ? sortBy : "created_at";
  }

  private workerSelectSql() {
    return `SELECT
      ${this.workerColumns("w")},
      COUNT(DISTINCT active_wpa.id) AS activeAssignmentCount
    FROM workers w
    LEFT JOIN worker_project_assignments active_wpa
      ON active_wpa.worker_id = w.id
      AND active_wpa.organization_id = w.organization_id
      AND active_wpa.status = 'ACTIVE'`;
  }

  private assignmentSelectSql() {
    return `SELECT
      ${this.assignmentColumns("wpa")},
      p.name AS project_name
    FROM worker_project_assignments wpa
    INNER JOIN projects p ON p.id = wpa.project_id AND p.organization_id = wpa.organization_id`;
  }

  private workerColumns(alias: string) {
    return `${alias}.id,
      ${alias}.organization_id,
      ${alias}.worker_code,
      ${alias}.name,
      ${alias}.trade,
      ${alias}.base_daily_rate,
      ${alias}.mobile_number,
      ${alias}.notes,
      ${alias}.status,
      ${alias}.created_by,
      ${alias}.updated_by,
      ${alias}.created_at,
      ${alias}.updated_at,
      ${alias}.deactivated_at,
      ${alias}.deactivated_by`;
  }

  private assignmentColumns(alias: string) {
    return `${alias}.id,
      ${alias}.organization_id,
      ${alias}.project_id,
      ${alias}.worker_id,
      ${alias}.role_label,
      ${alias}.daily_rate,
      ${alias}.status,
      ${alias}.starts_on,
      ${alias}.ends_on,
      ${alias}.created_by,
      ${alias}.updated_by,
      ${alias}.created_at,
      ${alias}.updated_at,
      ${alias}.ended_at,
      ${alias}.ended_by`;
  }
}
