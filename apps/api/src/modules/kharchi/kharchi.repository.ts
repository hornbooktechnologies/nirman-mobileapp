import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type {
  KharchiAdvance,
  KharchiAdvanceDetail,
  KharchiAdjustment,
  KharchiBalanceStatus,
  KharchiDeductionAllocation,
  KharchiListResponse,
  KharchiPaymentMethod,
  KharchiSummary,
  KharchiWorkerBalance,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type {
  DatabaseConnection,
  QueryParam,
} from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import type { CreateKharchiDto } from "./dto/create-kharchi.dto";
import type { CreateKharchiAdjustmentDto } from "./dto/create-kharchi-adjustment.dto";
import type {
  KharchiSummaryQueryDto,
  QueryKharchiDto,
} from "./dto/query-kharchi.dto";

type KharchiRow = {
  id: string;
  organization_id: string;
  project_id: string;
  worker_assignment_id: string;
  worker_id: string;
  worker_code: string;
  worker_name: string;
  trade: string;
  amount: string;
  adjustment_amount: string | null;
  deducted_amount: string | null;
  request_date: Date | string;
  payment_method: KharchiPaymentMethod;
  payment_reference: string | null;
  notes: string | null;
  recorded_by: string;
  paid_at: Date | string;
  created_at: Date | string;
};

type AdjustmentRow = {
  id: string;
  kharchi_advance_id: string;
  amount: string;
  reason: string;
  recorded_by: string;
  created_at: Date | string;
};

type AllocationRow = {
  id: string;
  kharchi_advance_id: string;
  wage_item_id: string;
  wage_batch_id: string;
  deduction_amount: string;
  deducted_at: Date | string;
  recorded_by: string;
};

type AssignmentRow = {
  id: string;
  worker_id: string;
  starts_on: Date | string;
  ends_on: Date | string | null;
  worker_status: string;
};

export type AllocateKharchiInput = {
  organizationId: string;
  projectId: string;
  workerId: string;
  wageItemId: string;
  wageBatchId: string;
  maximumDeduction: string;
  actorId: string;
};

function serializeDate(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function serializeDateOnly(value: Date | string | null) {
  return serializeDate(value)?.slice(0, 10) ?? "";
}

function toCents(value: string) {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? -1 : 1;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [rupees = "0", paise = ""] = unsigned.split(".");
  return (
    sign * (Number(rupees) * 100 + Number(paise.padEnd(2, "0").slice(0, 2)))
  );
}

function formatMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

@Injectable()
export class KharchiRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryKharchiDto,
  ): Promise<KharchiListResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { whereSql, params } = this.buildWhere(
      organizationId,
      projectId,
      query,
    );
    const orderBy = this.orderBy(query);
    const rows = await this.database.query<KharchiRow & RowDataPacket>(
      `${this.advanceSelectSql()}
       ${whereSql}
       ${this.statusHavingSql(query.status)}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    );
    const totals = await this.database.query<{ total: number } & RowDataPacket>(
      `SELECT COUNT(*) AS total FROM (
        ${this.advanceSelectSql()}
        ${whereSql}
        ${this.statusHavingSql(query.status)}
      ) filtered`,
      params,
    );
    const total = Number(totals[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.mapAdvance(row)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: KharchiSummaryQueryDto,
  ): Promise<KharchiSummary> {
    const { whereSql, params } = this.buildWhere(
      organizationId,
      projectId,
      query,
    );
    const rows = await this.database.query<KharchiRow & RowDataPacket>(
      `${this.advanceSelectSql()} ${whereSql}
       ORDER BY w.name ASC, w.worker_code ASC`,
      params,
    );
    const workerMap = new Map<string, KharchiWorkerBalance>();
    let original = 0;
    let adjustment = 0;
    let deducted = 0;
    for (const row of rows) {
      const mapped = this.mapAdvance(row);
      original += toCents(mapped.amount);
      adjustment += toCents(mapped.adjustmentAmount);
      deducted += toCents(mapped.deductedAmount);
      const current = workerMap.get(mapped.workerId) ?? {
        workerId: mapped.workerId,
        workerCode: mapped.workerCode,
        workerName: mapped.workerName,
        trade: mapped.trade,
        effectiveAmount: "0.00",
        deductedAmount: "0.00",
        outstandingAmount: "0.00",
      };
      current.effectiveAmount = formatMoney(
        toCents(current.effectiveAmount) + toCents(mapped.effectiveAmount),
      );
      current.deductedAmount = formatMoney(
        toCents(current.deductedAmount) + toCents(mapped.deductedAmount),
      );
      current.outstandingAmount = formatMoney(
        toCents(current.outstandingAmount) + toCents(mapped.outstandingAmount),
      );
      workerMap.set(mapped.workerId, current);
    }
    const effective = original + adjustment;
    return {
      originalAmount: formatMoney(original),
      adjustmentAmount: formatMoney(adjustment),
      effectiveAmount: formatMoney(effective),
      deductedAmount: formatMoney(deducted),
      outstandingAmount: formatMoney(effective - deducted),
      workers: [...workerMap.values()],
    };
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    kharchiId: string,
  ): Promise<KharchiAdvanceDetail | null> {
    const rows = await this.database.query<KharchiRow & RowDataPacket>(
      `${this.advanceSelectSql()}
       WHERE ka.organization_id = ? AND ka.project_id = ? AND ka.id = ?
       LIMIT 1`,
      [organizationId, projectId, kharchiId],
    );
    if (!rows[0]) return null;
    const [adjustmentRows, allocationRows] = await Promise.all([
      this.database.query<AdjustmentRow & RowDataPacket>(
        `SELECT id, kharchi_advance_id, amount, reason, recorded_by, created_at
         FROM kharchi_adjustments
         WHERE organization_id = ? AND project_id = ? AND kharchi_advance_id = ?
         ORDER BY created_at ASC, id ASC`,
        [organizationId, projectId, kharchiId],
      ),
      this.database.query<AllocationRow & RowDataPacket>(
        `SELECT id, kharchi_advance_id, wage_item_id, wage_batch_id,
                deduction_amount, deducted_at, recorded_by
         FROM kharchi_deduction_allocations
         WHERE organization_id = ? AND project_id = ? AND kharchi_advance_id = ?
         ORDER BY deducted_at ASC, id ASC`,
        [organizationId, projectId, kharchiId],
      ),
    ]);
    return {
      ...this.mapAdvance(rows[0]),
      adjustments: adjustmentRows.map((row) => this.mapAdjustment(row)),
      deductionAllocations: allocationRows.map((row) =>
        this.mapAllocation(row),
      ),
    };
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateKharchiDto,
    actorId: string,
    amount: string,
    fingerprint: string,
  ) {
    let advanceId: string = randomUUID();
    try {
      await this.database.transaction(async (connection) => {
        const existing = await this.database.query<
          { id: string; request_fingerprint: string } & RowDataPacket
        >(
          `SELECT id, request_fingerprint FROM kharchi_advances
         WHERE organization_id = ? AND idempotency_key = ?
         LIMIT 1 FOR UPDATE`,
          [organizationId, dto.idempotencyKey],
          connection,
        );
        if (existing[0]) {
          if (existing[0].request_fingerprint !== fingerprint) {
            throw this.domainError("KHARCHI_IDEMPOTENCY_CONFLICT");
          }
          advanceId = existing[0].id;
          return;
        }

        const assignments = await this.database.query<
          AssignmentRow & RowDataPacket
        >(
          `SELECT wpa.id, wpa.worker_id, wpa.starts_on, wpa.ends_on,
                w.status AS worker_status
         FROM worker_project_assignments wpa
         INNER JOIN workers w
           ON w.id = wpa.worker_id AND w.organization_id = wpa.organization_id
         WHERE wpa.id = ? AND wpa.organization_id = ? AND wpa.project_id = ?
         LIMIT 1 FOR UPDATE`,
          [dto.workerAssignmentId, organizationId, projectId],
          connection,
        );
        const assignment = assignments[0];
        if (!assignment)
          throw this.domainError("KHARCHI_WORKER_ASSIGNMENT_INVALID");
        if (assignment.worker_status !== "ACTIVE") {
          throw this.domainError("KHARCHI_WORKER_INACTIVE");
        }
        const startsOn = serializeDateOnly(assignment.starts_on);
        const endsOn = assignment.ends_on
          ? serializeDateOnly(assignment.ends_on)
          : null;
        if (
          dto.requestDate < startsOn ||
          (endsOn !== null && dto.requestDate > endsOn)
        ) {
          throw this.domainError("KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT");
        }

        await this.database.execute(
          `INSERT INTO kharchi_advances (
          id, organization_id, project_id, worker_assignment_id, worker_id,
          amount, request_date, payment_method, payment_reference, notes,
          recorded_by, idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            advanceId,
            organizationId,
            projectId,
            dto.workerAssignmentId,
            assignment.worker_id,
            amount,
            dto.requestDate,
            dto.paymentMethod,
            dto.paymentReference ?? null,
            dto.notes ?? null,
            actorId,
            dto.idempotencyKey,
            fingerprint,
          ],
          connection,
        );
        await this.audit.record(
          {
            organizationId,
            projectId,
            actorUserId: actorId,
            action: "kharchi.advance-recorded",
            entityType: "kharchi_advance",
            entityId: advanceId,
            newValues: {
              workerAssignmentId: dto.workerAssignmentId,
              workerId: assignment.worker_id,
              amount,
              requestDate: dto.requestDate,
              paymentMethod: dto.paymentMethod,
            },
            metadata: { idempotencyKey: dto.idempotencyKey },
          },
          connection,
        );
      });
    } catch (error) {
      if (!this.isDuplicateEntry(error)) throw error;
      const existing = await this.database.query<
        { id: string; request_fingerprint: string } & RowDataPacket
      >(
        `SELECT id, request_fingerprint FROM kharchi_advances
         WHERE organization_id = ? AND idempotency_key = ? LIMIT 1`,
        [organizationId, dto.idempotencyKey],
      );
      if (!existing[0] || existing[0].request_fingerprint !== fingerprint) {
        throw this.domainError("KHARCHI_IDEMPOTENCY_CONFLICT");
      }
      advanceId = existing[0].id;
    }
    return this.findDetail(organizationId, projectId, advanceId);
  }

  async adjust(
    organizationId: string,
    projectId: string,
    kharchiId: string,
    dto: CreateKharchiAdjustmentDto,
    actorId: string,
    amount: string,
    fingerprint: string,
  ) {
    try {
      await this.database.transaction(async (connection) => {
        const existing = await this.database.query<
          {
            id: string;
            kharchi_advance_id: string;
            request_fingerprint: string;
          } & RowDataPacket
        >(
          `SELECT id, kharchi_advance_id, request_fingerprint
         FROM kharchi_adjustments
         WHERE organization_id = ? AND idempotency_key = ?
         LIMIT 1 FOR UPDATE`,
          [organizationId, dto.idempotencyKey],
          connection,
        );
        if (existing[0]) {
          if (
            existing[0].kharchi_advance_id !== kharchiId ||
            existing[0].request_fingerprint !== fingerprint
          ) {
            throw this.domainError("KHARCHI_IDEMPOTENCY_CONFLICT");
          }
          return;
        }

        const advances = await this.database.query<
          {
            amount: string;
            adjustment_amount: string;
            deducted_amount: string;
          } & RowDataPacket
        >(
          `SELECT ka.amount,
          COALESCE((SELECT SUM(amount) FROM kharchi_adjustments WHERE kharchi_advance_id = ka.id), 0) AS adjustment_amount,
          COALESCE((SELECT SUM(deduction_amount) FROM kharchi_deduction_allocations WHERE kharchi_advance_id = ka.id), 0) AS deducted_amount
         FROM kharchi_advances ka
         WHERE ka.id = ? AND ka.organization_id = ? AND ka.project_id = ?
         LIMIT 1 FOR UPDATE`,
          [kharchiId, organizationId, projectId],
          connection,
        );
        const advance = advances[0];
        if (!advance) throw this.domainError("KHARCHI_NOT_FOUND");
        const oldEffective =
          toCents(advance.amount) + toCents(advance.adjustment_amount);
        const newEffective = oldEffective + toCents(amount);
        const deducted = toCents(advance.deducted_amount);
        if (newEffective < deducted || newEffective < 0) {
          throw this.domainError("KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE");
        }

        const adjustmentId = randomUUID();
        await this.database.execute(
          `INSERT INTO kharchi_adjustments (
          id, kharchi_advance_id, organization_id, project_id, amount, reason,
          recorded_by, idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            adjustmentId,
            kharchiId,
            organizationId,
            projectId,
            amount,
            dto.reason,
            actorId,
            dto.idempotencyKey,
            fingerprint,
          ],
          connection,
        );
        await this.audit.record(
          {
            organizationId,
            projectId,
            actorUserId: actorId,
            action: "kharchi.adjustment-recorded",
            entityType: "kharchi_adjustment",
            entityId: adjustmentId,
            oldValues: { effectiveAmount: formatMoney(oldEffective) },
            newValues: {
              kharchiAdvanceId: kharchiId,
              amount,
              effectiveAmount: formatMoney(newEffective),
              reason: dto.reason,
            },
            metadata: { idempotencyKey: dto.idempotencyKey },
          },
          connection,
        );
      });
    } catch (error) {
      if (!this.isDuplicateEntry(error)) throw error;
      const existing = await this.database.query<
        {
          kharchi_advance_id: string;
          request_fingerprint: string;
        } & RowDataPacket
      >(
        `SELECT kharchi_advance_id, request_fingerprint
         FROM kharchi_adjustments
         WHERE organization_id = ? AND idempotency_key = ? LIMIT 1`,
        [organizationId, dto.idempotencyKey],
      );
      if (
        !existing[0] ||
        existing[0].kharchi_advance_id !== kharchiId ||
        existing[0].request_fingerprint !== fingerprint
      ) {
        throw this.domainError("KHARCHI_IDEMPOTENCY_CONFLICT");
      }
    }
    return this.findDetail(organizationId, projectId, kharchiId);
  }

  async allocateForWageItem(
    input: AllocateKharchiInput,
    connection: DatabaseConnection,
  ) {
    const existing = await this.database.query<
      { deduction_amount: string } & RowDataPacket
    >(
      `SELECT deduction_amount FROM kharchi_deduction_allocations
       WHERE wage_item_id = ?`,
      [input.wageItemId],
      connection,
    );
    if (existing.length > 0) {
      return formatMoney(
        existing.reduce((sum, row) => sum + toCents(row.deduction_amount), 0),
      );
    }

    const advances = await this.database.query<{ id: string } & RowDataPacket>(
      `SELECT id FROM kharchi_advances
       WHERE organization_id = ? AND project_id = ? AND worker_id = ?
       ORDER BY request_date ASC, created_at ASC, id ASC
       FOR UPDATE`,
      [input.organizationId, input.projectId, input.workerId],
      connection,
    );
    let remainingCapacity = toCents(input.maximumDeduction);
    let allocated = 0;
    for (const advance of advances) {
      if (remainingCapacity <= 0) break;
      const balances = await this.database.query<
        {
          amount: string;
          adjustment_amount: string;
          deducted_amount: string;
        } & RowDataPacket
      >(
        `SELECT ka.amount,
          COALESCE((SELECT SUM(amount) FROM kharchi_adjustments WHERE kharchi_advance_id = ka.id), 0) AS adjustment_amount,
          COALESCE((SELECT SUM(deduction_amount) FROM kharchi_deduction_allocations WHERE kharchi_advance_id = ka.id), 0) AS deducted_amount
         FROM kharchi_advances ka WHERE ka.id = ?`,
        [advance.id],
        connection,
      );
      const balance = balances[0];
      const outstanding =
        toCents(balance.amount) +
        toCents(balance.adjustment_amount) -
        toCents(balance.deducted_amount);
      if (outstanding <= 0) continue;
      const deduction = Math.min(outstanding, remainingCapacity);
      const allocationId = randomUUID();
      await this.database.execute(
        `INSERT INTO kharchi_deduction_allocations (
          id, kharchi_advance_id, wage_item_id, wage_batch_id, organization_id,
          project_id, worker_id, deduction_amount, recorded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          allocationId,
          advance.id,
          input.wageItemId,
          input.wageBatchId,
          input.organizationId,
          input.projectId,
          input.workerId,
          formatMoney(deduction),
          input.actorId,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actorId,
          action: "kharchi.deduction-allocated",
          entityType: "kharchi_deduction_allocation",
          entityId: allocationId,
          newValues: {
            kharchiAdvanceId: advance.id,
            wageItemId: input.wageItemId,
            wageBatchId: input.wageBatchId,
            deductionAmount: formatMoney(deduction),
          },
        },
        connection,
      );
      allocated += deduction;
      remainingCapacity -= deduction;
    }
    return formatMoney(allocated);
  }

  fingerprint(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private buildWhere(
    organizationId: string,
    projectId: string,
    query: QueryKharchiDto | KharchiSummaryQueryDto,
  ) {
    const where = ["ka.organization_id = ?", "ka.project_id = ?"];
    const params: QueryParam[] = [organizationId, projectId];
    if (query.workerId) {
      where.push("ka.worker_id = ?");
      params.push(query.workerId);
    }
    if (query.workerAssignmentId) {
      where.push("ka.worker_assignment_id = ?");
      params.push(query.workerAssignmentId);
    }
    if (query.startDate) {
      where.push("ka.request_date >= ?");
      params.push(query.startDate);
    }
    if (query.endDate) {
      where.push("ka.request_date <= ?");
      params.push(query.endDate);
    }
    if ("paymentMethod" in query && query.paymentMethod) {
      where.push("ka.payment_method = ?");
      params.push(query.paymentMethod);
    }
    if ("search" in query && query.search) {
      where.push(
        "(w.name LIKE ? OR w.worker_code LIKE ? OR ka.payment_reference LIKE ?)",
      );
      const search = `%${query.search}%`;
      params.push(search, search, search);
    }
    return { whereSql: `WHERE ${where.join(" AND ")}`, params };
  }

  private statusHavingSql(status?: KharchiBalanceStatus) {
    if (!status) return "";
    const effective = "(ka.amount + COALESCE(adj.adjustment_amount, 0))";
    const deducted = "COALESCE(ded.deducted_amount, 0)";
    if (status === "PAID") return `HAVING ${deducted} = 0 AND ${effective} > 0`;
    if (status === "PARTIALLY_DEDUCTED") {
      return `HAVING ${deducted} > 0 AND ${effective} > ${deducted}`;
    }
    return `HAVING ${effective} = ${deducted}`;
  }

  private orderBy(query: QueryKharchiDto) {
    const direction = query.sortOrder === "asc" ? "ASC" : "DESC";
    const columns = {
      requestDate: "ka.request_date",
      createdAt: "ka.created_at",
      workerName: "w.name",
      outstandingAmount:
        "(ka.amount + COALESCE(adj.adjustment_amount, 0) - COALESCE(ded.deducted_amount, 0))",
    } as const;
    return `${columns[query.sortBy ?? "requestDate"]} ${direction}, ka.id ${direction}`;
  }

  private advanceSelectSql() {
    return `SELECT ka.*, w.worker_code, w.name AS worker_name, w.trade,
      COALESCE(adj.adjustment_amount, 0) AS adjustment_amount,
      COALESCE(ded.deducted_amount, 0) AS deducted_amount
    FROM kharchi_advances ka
    INNER JOIN workers w ON w.id = ka.worker_id AND w.organization_id = ka.organization_id
    LEFT JOIN (
      SELECT kharchi_advance_id, SUM(amount) AS adjustment_amount
      FROM kharchi_adjustments GROUP BY kharchi_advance_id
    ) adj ON adj.kharchi_advance_id = ka.id
    LEFT JOIN (
      SELECT kharchi_advance_id, SUM(deduction_amount) AS deducted_amount
      FROM kharchi_deduction_allocations GROUP BY kharchi_advance_id
    ) ded ON ded.kharchi_advance_id = ka.id`;
  }

  private mapAdvance(row: KharchiRow): KharchiAdvance {
    const amount = toCents(String(row.amount));
    const adjustment = toCents(String(row.adjustment_amount ?? "0"));
    const deducted = toCents(String(row.deducted_amount ?? "0"));
    const effective = amount + adjustment;
    const outstanding = effective - deducted;
    const status: KharchiBalanceStatus =
      outstanding === 0
        ? "DEDUCTED"
        : deducted > 0
          ? "PARTIALLY_DEDUCTED"
          : "PAID";
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      workerAssignmentId: row.worker_assignment_id,
      workerId: row.worker_id,
      workerCode: row.worker_code,
      workerName: row.worker_name,
      trade: row.trade,
      amount: formatMoney(amount),
      adjustmentAmount: formatMoney(adjustment),
      effectiveAmount: formatMoney(effective),
      deductedAmount: formatMoney(deducted),
      outstandingAmount: formatMoney(outstanding),
      status,
      requestDate: serializeDateOnly(row.request_date),
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference,
      notes: row.notes,
      recordedBy: row.recorded_by,
      paidAt: serializeDate(row.paid_at) ?? "",
      createdAt: serializeDate(row.created_at) ?? "",
    };
  }

  private mapAdjustment(row: AdjustmentRow): KharchiAdjustment {
    return {
      id: row.id,
      kharchiAdvanceId: row.kharchi_advance_id,
      amount: formatMoney(toCents(row.amount)),
      reason: row.reason,
      recordedBy: row.recorded_by,
      recordedAt: serializeDate(row.created_at) ?? "",
    };
  }

  private mapAllocation(row: AllocationRow): KharchiDeductionAllocation {
    return {
      id: row.id,
      kharchiAdvanceId: row.kharchi_advance_id,
      wageItemId: row.wage_item_id,
      wageBatchId: row.wage_batch_id,
      deductionAmount: formatMoney(toCents(row.deduction_amount)),
      deductedAt: serializeDate(row.deducted_at) ?? "",
      recordedBy: row.recorded_by,
    };
  }

  private domainError(code: string) {
    return Object.assign(new Error(code), { code });
  }

  private isDuplicateEntry(error: unknown) {
    return Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY",
    );
  }
}
