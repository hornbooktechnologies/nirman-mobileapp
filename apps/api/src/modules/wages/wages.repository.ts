import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  WageBatch,
  WageBatchDetail,
  WageBatchStatus,
  WageItem,
  WagePayment,
  WagePaymentMethod,
  WagePaymentStatus,
  WagePreviewItem,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

type BatchRow = {
  id: string;
  organization_id: string;
  project_id: string;
  period_start: Date | string;
  period_end: Date | string;
  status: WageBatchStatus;
  generated_by: string;
  confirmed_by: string | null;
  confirmed_at: Date | string | null;
  cancelled_by: string | null;
  cancelled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  gross_amount: string | null;
  kharchi_deduction: string | null;
  adjustment_amount: string | null;
  net_amount: string | null;
  paid_amount: string | null;
};

type ItemRow = {
  id: string;
  wage_batch_id: string;
  worker_assignment_id: string;
  worker_id: string;
  worker_code: string;
  worker_name: string;
  trade: string;
  daily_rate: string;
  present_days: string | number;
  half_days: string | number;
  holiday_days: string | number;
  absent_days: string | number;
  gross_amount: string;
  kharchi_deduction: string;
  adjustment_amount: string;
  net_amount: string;
  paid_amount: string;
  payment_status: WagePaymentStatus;
  notes: string | null;
};

type PaymentRow = {
  id: string;
  wage_item_id: string;
  amount: string;
  payment_date: Date | string;
  payment_method: WagePaymentMethod;
  reference: string | null;
  recorded_by: string;
  recorded_at: Date | string;
};

export type CreateWageBatchItemInput = WagePreviewItem & {
  dailyRate: string;
};

export type RecordWagePaymentInput = {
  wageItemId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: WagePaymentMethod;
  reference?: string | null;
  idempotencyKey?: string | null;
  recordedBy: string;
};

export type UpdateWageItemInput = {
  wageItemId: string;
  adjustmentAmount?: string;
  notes?: string | null;
};

function serializeDate(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeDateOnly(value: Date | string | null) {
  return serializeDate(value)?.slice(0, 10) ?? "";
}

@Injectable()
export class WagesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findBatches(organizationId: string, projectId: string): Promise<WageBatch[]> {
    const rows = await this.database.query<BatchRow & any>(
      `${this.batchSelectSql()}
       WHERE wb.organization_id = ? AND wb.project_id = ?
       GROUP BY wb.id
       ORDER BY wb.period_start DESC, wb.created_at DESC`,
      [organizationId, projectId],
    );
    return rows.map((row) => this.mapBatch(row));
  }

  async findBatchDetail(
    organizationId: string,
    projectId: string,
    batchId: string,
  ): Promise<WageBatchDetail | null> {
    const batchRows = await this.database.query<BatchRow & any>(
      `${this.batchSelectSql()}
       WHERE wb.organization_id = ? AND wb.project_id = ? AND wb.id = ?
       GROUP BY wb.id
       LIMIT 1`,
      [organizationId, projectId, batchId],
    );
    if (!batchRows[0]) return null;
    const [itemRows, paymentRows] = await Promise.all([
      this.database.query<ItemRow & any>(
        `${this.itemSelectSql()}
         WHERE wi.wage_batch_id = ?
         ORDER BY w.name ASC, w.worker_code ASC`,
        [batchId],
      ),
      this.database.query<PaymentRow & any>(
        `SELECT id, wage_item_id, amount, payment_date, payment_method, reference, recorded_by, recorded_at
         FROM wage_payments
         WHERE wage_batch_id = ?
         ORDER BY recorded_at DESC`,
        [batchId],
      ),
    ]);
    return {
      ...this.mapBatch(batchRows[0]),
      items: itemRows.map((row) => this.mapItem(row)),
      payments: paymentRows.map((row) => this.mapPayment(row)),
    };
  }

  async findActiveBatchForPeriod(
    organizationId: string,
    projectId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    const rows = await this.database.query<{ id: string } & any>(
      `SELECT id
       FROM wage_batches
       WHERE organization_id = ?
         AND project_id = ?
         AND period_start <= ?
         AND period_end >= ?
         AND status <> 'CANCELLED'
       LIMIT 1`,
      [organizationId, projectId, periodEnd, periodStart],
    );
    return rows[0]?.id ?? null;
  }

  async createBatch(
    organizationId: string,
    projectId: string,
    periodStart: string,
    periodEnd: string,
    items: CreateWageBatchItemInput[],
    actorId: string,
  ) {
    const batchId = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `INSERT INTO wage_batches
          (id, organization_id, project_id, period_start, period_end, status, generated_by, confirmed_by, confirmed_at)
         VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, CURRENT_TIMESTAMP(3))`,
        [batchId, organizationId, projectId, periodStart, periodEnd, actorId, actorId],
        connection,
      );

      for (const item of items) {
        await this.database.execute(
          `INSERT INTO wage_items (
            id, wage_batch_id, organization_id, project_id, worker_assignment_id, worker_id,
            daily_rate, present_days, half_days, holiday_days, absent_days,
            gross_amount, kharchi_deduction, adjustment_amount, net_amount, paid_amount, payment_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'UNPAID', ?)`,
          [
            randomUUID(),
            batchId,
            organizationId,
            projectId,
            item.workerAssignmentId,
            item.workerId,
            item.dailyRate,
            item.presentDays,
            item.halfDays,
            item.holidayDays,
            item.absentDays,
            item.grossAmount,
            item.kharchiDeduction,
            item.adjustmentAmount,
            item.netAmount,
            item.readinessIssue ?? null,
          ],
          connection,
        );
      }
    });
    return this.findBatchDetail(organizationId, projectId, batchId);
  }

  async recordPayment(
    organizationId: string,
    projectId: string,
    input: RecordWagePaymentInput,
  ) {
    let batchId = "";
    await this.database.transaction(async (connection) => {
      if (input.idempotencyKey) {
        const existing = await this.database.query<{ id: string; wage_batch_id: string } & any>(
          `SELECT id, wage_batch_id FROM wage_payments
           WHERE organization_id = ? AND idempotency_key = ?
           LIMIT 1`,
          [organizationId, input.idempotencyKey],
          connection,
        );
        if (existing[0]) {
          batchId = existing[0].wage_batch_id;
          return;
        }
      }

      const itemRows = await this.database.query<
        { id: string; wage_batch_id: string; net_amount: string; paid_amount: string; batch_status: WageBatchStatus } & any
      >(
        `SELECT wi.id, wi.wage_batch_id, wi.net_amount, wi.paid_amount, wb.status AS batch_status
         FROM wage_items wi
         INNER JOIN wage_batches wb ON wb.id = wi.wage_batch_id
         WHERE wi.id = ? AND wi.organization_id = ? AND wi.project_id = ?
         FOR UPDATE`,
        [input.wageItemId, organizationId, projectId],
        connection,
      );
      const item = itemRows[0];
      if (!item) throw new Error("WAGE_ITEM_NOT_FOUND");
      if (item.batch_status === "CANCELLED") {
        throw new Error("WAGE_BATCH_STATUS_INVALID");
      }
      const remaining = Number(item.net_amount) - Number(item.paid_amount);
      if (Number(input.amount) <= 0 || Number(input.amount) > remaining) {
        throw new Error("WAGE_PAYMENT_AMOUNT_INVALID");
      }

      batchId = item.wage_batch_id;
      await this.database.execute(
        `INSERT INTO wage_payments (
          id, wage_item_id, wage_batch_id, organization_id, project_id, amount,
          payment_date, payment_method, reference, recorded_by, idempotency_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          input.wageItemId,
          batchId,
          organizationId,
          projectId,
          input.amount,
          input.paymentDate,
          input.paymentMethod,
          input.reference ?? null,
          input.recordedBy,
          input.idempotencyKey ?? null,
        ],
        connection,
      );

      await this.recalculateItemPaymentStatus(input.wageItemId, connection);
      await this.recalculateBatchStatus(batchId, connection);
    });
    return this.findBatchDetail(organizationId, projectId, batchId);
  }

  async updateWageItem(
    organizationId: string,
    projectId: string,
    input: UpdateWageItemInput,
  ) {
    let batchId = "";
    await this.database.transaction(async (connection) => {
      const itemRows = await this.database.query<
        {
          id: string;
          wage_batch_id: string;
          gross_amount: string;
          kharchi_deduction: string;
          adjustment_amount: string;
          paid_amount: string;
          batch_status: WageBatchStatus;
        } & any
      >(
        `SELECT
           wi.id, wi.wage_batch_id, wi.gross_amount, wi.kharchi_deduction,
           wi.adjustment_amount, wi.paid_amount, wb.status AS batch_status
         FROM wage_items wi
         INNER JOIN wage_batches wb ON wb.id = wi.wage_batch_id
         WHERE wi.id = ? AND wi.organization_id = ? AND wi.project_id = ?
         FOR UPDATE`,
        [input.wageItemId, organizationId, projectId],
        connection,
      );
      const item = itemRows[0];
      if (!item) throw new Error("WAGE_ITEM_NOT_FOUND");
      if (item.batch_status === "CANCELLED") {
        throw new Error("WAGE_BATCH_STATUS_INVALID");
      }

      const adjustmentAmount = input.adjustmentAmount ?? item.adjustment_amount;
      const netAmount = (
        Number(item.gross_amount) -
        Number(item.kharchi_deduction) +
        Number(adjustmentAmount)
      ).toFixed(2);
      if (Number(netAmount) < Number(item.paid_amount)) {
        throw new Error("WAGE_PAYMENT_AMOUNT_INVALID");
      }

      await this.database.execute(
        `UPDATE wage_items
         SET adjustment_amount = ?,
             net_amount = ?,
             notes = CASE WHEN ? THEN ? ELSE notes END,
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [
          adjustmentAmount,
          netAmount,
          input.notes !== undefined,
          input.notes ?? null,
          input.wageItemId,
        ],
        connection,
      );
      batchId = item.wage_batch_id;
      await this.recalculateItemPaymentStatus(input.wageItemId, connection);
      await this.recalculateBatchStatus(batchId, connection);
    });
    return this.findBatchDetail(organizationId, projectId, batchId);
  }

  private async recalculateItemPaymentStatus(itemId: string, connection: DatabaseConnection) {
    await this.database.execute(
      `UPDATE wage_items wi
       LEFT JOIN (
         SELECT wage_item_id, COALESCE(SUM(amount), 0) AS paid_amount
         FROM wage_payments
         WHERE wage_item_id = ?
         GROUP BY wage_item_id
       ) wp ON wp.wage_item_id = wi.id
       SET wi.paid_amount = COALESCE(wp.paid_amount, 0),
           wi.payment_status = CASE
             WHEN COALESCE(wp.paid_amount, 0) <= 0 THEN 'UNPAID'
             WHEN COALESCE(wp.paid_amount, 0) >= wi.net_amount THEN 'PAID'
             ELSE 'PARTIALLY_PAID'
           END,
           wi.updated_at = CURRENT_TIMESTAMP(3)
       WHERE wi.id = ?`,
      [itemId, itemId],
      connection,
    );
  }

  private async recalculateBatchStatus(batchId: string, connection: DatabaseConnection) {
    const rows = await this.database.query<
      { total: number; paid: number; partial: number } & any
    >(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid,
         SUM(CASE WHEN payment_status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) AS partial
       FROM wage_items
       WHERE wage_batch_id = ?`,
      [batchId],
      connection,
    );
    const total = Number(rows[0]?.total ?? 0);
    const paid = Number(rows[0]?.paid ?? 0);
    const partial = Number(rows[0]?.partial ?? 0);
    const status: WageBatchStatus =
      total > 0 && paid === total
        ? "PAID"
        : paid > 0 || partial > 0
          ? "PARTIALLY_PAID"
          : "CONFIRMED";
    await this.database.execute(
      `UPDATE wage_batches
       SET status = ?, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND status <> 'CANCELLED'`,
      [status, batchId],
      connection,
    );
  }

  private batchSelectSql() {
    return `SELECT
      wb.*,
      COALESCE(SUM(wi.gross_amount), 0) AS gross_amount,
      COALESCE(SUM(wi.kharchi_deduction), 0) AS kharchi_deduction,
      COALESCE(SUM(wi.adjustment_amount), 0) AS adjustment_amount,
      COALESCE(SUM(wi.net_amount), 0) AS net_amount,
      COALESCE(SUM(wi.paid_amount), 0) AS paid_amount
    FROM wage_batches wb
    LEFT JOIN wage_items wi ON wi.wage_batch_id = wb.id`;
  }

  private itemSelectSql() {
    return `SELECT
      wi.*,
      w.worker_code,
      w.name AS worker_name,
      w.trade
    FROM wage_items wi
    INNER JOIN workers w ON w.id = wi.worker_id AND w.organization_id = wi.organization_id`;
  }

  private mapBatch(row: BatchRow): WageBatch {
    return {
      id: row.id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      periodStart: serializeDateOnly(row.period_start),
      periodEnd: serializeDateOnly(row.period_end),
      status: row.status,
      generatedBy: row.generated_by,
      confirmedBy: row.confirmed_by,
      confirmedAt: serializeDate(row.confirmed_at),
      cancelledBy: row.cancelled_by,
      cancelledAt: serializeDate(row.cancelled_at),
      createdAt: serializeDate(row.created_at) ?? "",
      updatedAt: serializeDate(row.updated_at) ?? "",
      totals: {
        grossAmount: String(row.gross_amount ?? "0.00"),
        kharchiDeduction: String(row.kharchi_deduction ?? "0.00"),
        adjustmentAmount: String(row.adjustment_amount ?? "0.00"),
        netAmount: String(row.net_amount ?? "0.00"),
        paidAmount: String(row.paid_amount ?? "0.00"),
      },
    };
  }

  private mapItem(row: ItemRow): WageItem {
    return {
      id: row.id,
      wageBatchId: row.wage_batch_id,
      workerAssignmentId: row.worker_assignment_id,
      workerId: row.worker_id,
      workerCode: row.worker_code,
      workerName: row.worker_name,
      trade: row.trade,
      dailyRate: String(row.daily_rate),
      presentDays: Number(row.present_days),
      halfDays: Number(row.half_days),
      holidayDays: Number(row.holiday_days),
      absentDays: Number(row.absent_days),
      grossAmount: String(row.gross_amount),
      kharchiDeduction: String(row.kharchi_deduction),
      adjustmentAmount: String(row.adjustment_amount),
      netAmount: String(row.net_amount),
      paidAmount: String(row.paid_amount),
      paymentStatus: row.payment_status,
      notes: row.notes,
    };
  }

  private mapPayment(row: PaymentRow): WagePayment {
    return {
      id: row.id,
      wageItemId: row.wage_item_id,
      amount: String(row.amount),
      paymentDate: serializeDateOnly(row.payment_date),
      paymentMethod: row.payment_method,
      reference: row.reference,
      recordedBy: row.recorded_by,
      recordedAt: serializeDate(row.recorded_at) ?? "",
    };
  }
}
