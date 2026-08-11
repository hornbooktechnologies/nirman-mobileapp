import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ProjectWorkerRosterItem,
  WorkerAssignmentStatus,
  WorkerDetail,
  WorkerDuplicateCandidate,
  WorkerListResponse,
  WorkerProjectAssignmentSummary,
  WorkerStatus,
  WorkerSummary,
} from '@nirman-app/shared';
import { DatabaseService } from '../../database/database.service';
import type {
  DatabaseConnection,
  QueryParam,
} from '../../database/database.types';
import type { AssignWorkerDto } from './dto/assign-worker.dto';
import type { CreateWorkerDto } from './dto/create-worker.dto';
import type { QueryWorkerDto } from './dto/query-worker.dto';
import type { UpdateWorkerAssignmentDto } from './dto/update-worker-assignment.dto';
import type { UpdateWorkerDto } from './dto/update-worker.dto';
import type {
  WorkerAssignmentRow,
  WorkerRow,
} from './types/workers.types';

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

function normalizeMobile(mobile?: string | null) {
  const digits = mobile?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function serializeDate(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAssignmentRow(row: WorkerAssignmentRow): WorkerProjectAssignmentSummary {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    workerId: row.worker_id,
    projectName: row.project_name ?? null,
    roleLabel: row.role_label,
    dailyRate: row.daily_rate === null ? null : String(row.daily_rate),
    status: row.status,
    startsOn: serializeDate(row.starts_on) ?? '',
    endsOn: serializeDate(row.ends_on),
    createdAt: serializeDate(row.created_at) ?? '',
    updatedAt: serializeDate(row.updated_at) ?? '',
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
    mobileNumber: row.mobile_number,
    notes: row.notes,
    status: row.status,
    activeAssignmentCount: Number(row.activeAssignmentCount ?? 0),
    currentAssignment,
    createdAt: serializeDate(row.created_at) ?? '',
    updatedAt: serializeDate(row.updated_at) ?? '',
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
      row.assignment_daily_rate === null ? null : String(row.assignment_daily_rate),
    status: row.assignment_status,
    startsOn: serializeDate(row.assignment_starts_on) ?? '',
    endsOn: serializeDate(row.assignment_ends_on),
    createdAt: serializeDate(row.assignment_created_at) ?? '',
    updatedAt: serializeDate(row.assignment_updated_at) ?? '',
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
    const where = ['w.organization_id = ?'];
    const join = organizationWideProjectAccess
      ? ''
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
      where.push('(w.name LIKE ? OR w.worker_code LIKE ? OR w.mobile_number LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }
    if (query.status) {
      where.push('w.status = ?');
      params.push(query.status);
    }
    if (query.trade) {
      where.push('w.trade LIKE ?');
      params.push(`%${query.trade}%`);
    }
    if (query.projectId) {
      where.push('EXISTS (SELECT 1 FROM worker_project_assignments fpa WHERE fpa.organization_id = w.organization_id AND fpa.worker_id = w.id AND fpa.project_id = ?)');
      params.push(query.projectId);
    }

    const sortBy = this.safeSortBy(query.sortBy);
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const whereSql = `WHERE ${where.join(' AND ')}`;

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
      'w.organization_id = ?',
      'wpa.project_id = ?',
    ];
    if (query.status) {
      where.push('w.status = ?');
      params.push(query.status);
    }
    if (query.search) {
      where.push('(w.name LIKE ? OR w.worker_code LIKE ? OR w.mobile_number LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }
    if (query.trade) {
      where.push('w.trade LIKE ?');
      params.push(`%${query.trade}%`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;
    const [rows, totalRows] = await Promise.all([
      this.database.query<RosterRow>(
        `SELECT
          ${this.workerColumns('w')},
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

  async findById(organizationId: string, workerId: string): Promise<WorkerDetail | null> {
    const rows = await this.database.query<WorkerRow>(
      `${this.workerSelectSql()}
      WHERE w.organization_id = ? AND w.id = ?
      GROUP BY w.id
      LIMIT 1`,
      [organizationId, workerId],
    );
    if (!rows[0]) return null;
    const assignments = await this.findAssignmentsForWorker(organizationId, workerId);
    return {
      ...mapWorkerRow(rows[0]),
      assignments,
    };
  }

  async findAssignment(organizationId: string, projectId: string, workerId: string) {
    const rows = await this.database.query<WorkerAssignmentRow>(
      `${this.assignmentSelectSql()}
      WHERE wpa.organization_id = ? AND wpa.project_id = ? AND wpa.worker_id = ?
      ORDER BY wpa.created_at DESC
      LIMIT 1`,
      [organizationId, projectId, workerId],
    );
    return rows[0] ? mapAssignmentRow(rows[0]) : null;
  }

  async hasActiveAssignment(organizationId: string, projectId: string, workerId: string) {
    const rows = await this.database.query<{ id: string } & WorkerAssignmentRow>(
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
    await this.database.transaction(async (connection) => {
      const workerCode = await this.generateWorkerCode(organizationId, connection);
      await this.database.execute(
        `INSERT INTO workers
          (id, organization_id, worker_code, name, trade, mobile_number, notes, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workerId,
          organizationId,
          workerCode,
          dto.name.trim(),
          dto.trade.trim(),
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
            roleLabel: dto.roleLabel,
            dailyRate: dto.dailyRate,
            startsOn: dto.startsOn,
          },
          actorId,
          connection,
        );
      }
    });
    return this.findById(organizationId, workerId);
  }

  async update(organizationId: string, workerId: string, dto: UpdateWorkerDto, actorId: string) {
    const entries = (
      [
        ['name', dto.name?.trim()],
        ['trade', dto.trade?.trim()],
        [
          'mobile_number',
          dto.mobileNumber === undefined ? undefined : normalizeMobile(dto.mobileNumber),
        ],
        ['notes', dto.notes === undefined ? undefined : dto.notes?.trim() || null],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE workers
        SET ${entries.map(([column]) => `${column} = ?`).join(', ')},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND id = ?`,
        [...entries.map(([, value]) => value), actorId, organizationId, workerId],
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

  async assignWorker(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: AssignWorkerDto,
    actorId: string,
  ) {
    await this.insertAssignment(organizationId, projectId, workerId, dto, actorId);
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
        ['role_label', dto.roleLabel === undefined ? undefined : dto.roleLabel ?? null],
        ['starts_on', dto.startsOn],
        ['ends_on', dto.endsOn === undefined ? undefined : dto.endsOn ?? null],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE worker_project_assignments
        SET ${entries.map(([column]) => `${column} = ?`).join(', ')},
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
    }
    return this.findAssignment(organizationId, projectId, workerId);
  }

  async updateAssignmentRate(
    organizationId: string,
    projectId: string,
    workerId: string,
    dailyRate: number,
    actorId: string,
  ) {
    await this.database.execute(
      `UPDATE worker_project_assignments
      SET daily_rate = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND project_id = ? AND worker_id = ? AND status = 'ACTIVE'`,
      [dailyRate, actorId, organizationId, projectId, workerId],
    );
    return this.findAssignment(organizationId, projectId, workerId);
  }

  async endAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    endsOn: string,
    actorId: string,
  ) {
    await this.database.execute(
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
      conditions.push('w.mobile_number = ?');
      params.push(normalizedMobile);
    }
    if (nameToken) {
      conditions.push('w.name LIKE ?');
      params.push(`%${nameToken}%`);
    }
    if (excludeWorkerId) params.push(excludeWorkerId);

    const rows = await this.database.query<WorkerRow>(
      `${this.workerSelectSql()}
      WHERE w.organization_id = ?
        AND (${conditions.join(' OR ')})
        ${excludeWorkerId ? 'AND w.id <> ?' : ''}
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
          ? 'MOBILE'
          : 'NAME',
    }));
  }

  async hasAttendanceForAssignment(): Promise<boolean> {
    // Attendance is intentionally not implemented in this Workers module.
    // The integration point is kept so Attendance can make this check real.
    return false;
  }

  private async insertAssignment(
    organizationId: string,
    projectId: string,
    workerId: string,
    dto: AssignWorkerDto,
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
        dto.roleLabel?.trim() || null,
        dto.dailyRate ?? null,
        dto.startsOn ?? new Date().toISOString().slice(0, 10),
        dto.endsOn ?? null,
        actorId,
        actorId,
      ],
      connection,
    );
  }

  private async findAssignmentsForWorker(organizationId: string, workerId: string) {
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
    return `WRK-${String(nextNumber).padStart(5, '0')}`;
  }

  private safeSortBy(sortBy?: string) {
    const allowed = new Set([
      'name',
      'worker_code',
      'trade',
      'status',
      'created_at',
      'updated_at',
    ]);
    return allowed.has(sortBy ?? '') ? sortBy : 'created_at';
  }

  private workerSelectSql() {
    return `SELECT
      ${this.workerColumns('w')},
      COUNT(DISTINCT active_wpa.id) AS activeAssignmentCount
    FROM workers w
    LEFT JOIN worker_project_assignments active_wpa
      ON active_wpa.worker_id = w.id
      AND active_wpa.organization_id = w.organization_id
      AND active_wpa.status = 'ACTIVE'`;
  }

  private assignmentSelectSql() {
    return `SELECT
      ${this.assignmentColumns('wpa')},
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
