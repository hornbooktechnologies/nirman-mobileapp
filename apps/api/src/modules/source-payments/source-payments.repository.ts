import { isMissingPaymentSchema, paymentSchemaError } from "./payment-schema";
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  moneyPaise,
  paiseMoney,
  paymentLedger,
  type PaymentLedger,
  type SourcePayment,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import type { RecordPaymentDto, VoidPaymentDto } from "./source-payments.dto";
export type PaymentSource = "materials" | "expenses";
const tables = {
  materials: {
    table: "material_purchase_payments",
    column: "material_purchase_id",
  },
  expenses: { table: "site_expense_payments", column: "site_expense_id" },
} as const;
type SourceRow = RowDataPacket & {
  id: string;
  version: number;
  payable: string | null;
  status: string;
};
@Injectable()
export class SourcePaymentsRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}
  async source(
    source: PaymentSource,
    org: string,
    project: string,
    id: string,
    parent: string | undefined,
    connection?: DatabaseConnection,
    lock = false,
  ): Promise<SourceRow> {
    const sql =
      source === "materials"
        ? `SELECT mr.id, mr.version, mp.total_cost payable, mr.status FROM material_purchases mp INNER JOIN material_requests mr ON mr.id=mp.material_request_id AND mr.organization_id=mp.organization_id AND mr.project_id=mp.project_id WHERE mp.organization_id=? AND mp.project_id=? AND mp.id=? AND mr.id=?`
        : `SELECT e.id, e.version, e.status, e.amount + COALESCE((SELECT SUM(a.amount) FROM site_expense_adjustments a WHERE a.site_expense_id=e.id AND a.organization_id=e.organization_id AND a.project_id=e.project_id),0) payable FROM site_expenses e WHERE e.organization_id=? AND e.project_id=? AND e.id=?`;
    const rows = await this.db.query<SourceRow>(
      sql + (lock ? " FOR UPDATE" : ""),
      source === "materials" ? [org, project, id, parent!] : [org, project, id],
      connection,
    );
    if (!rows[0])
      throw new NotFoundException({
        code: "PAYMENT_SOURCE_NOT_FOUND",
        message: "Payment source not found",
      });
    return rows[0];
  }
  async ledgers(
    source: PaymentSource,
    org: string,
    project: string,
    sources: readonly { id: string; payable: string | null; version: number }[],
    connection?: DatabaseConnection,
  ): Promise<Map<string, PaymentLedger>> {
    const result = new Map<string, PaymentLedger>();
    if (!sources.length) return result;
    const { table, column } = tables[source];
    let rows: RowDataPacket[] = [];
    let available = true;
    try {
      rows = await this.db.query<RowDataPacket>(
        `SELECT p.${column} sourceId,p.id,p.amount,p.payment_date paymentDate,p.payment_method paymentMethod,
         p.reference,u.name recordedBy,p.recorded_at recordedAt,v.voided_at voidedAt,vu.name voidedBy,v.reason voidReason
         FROM ${table} p INNER JOIN user u ON u.id=p.recorded_by LEFT JOIN ${table}_voids v ON v.payment_id=p.id
         LEFT JOIN user vu ON vu.id=v.voided_by
         WHERE p.organization_id=? AND p.project_id=? AND p.${column} IN (${sources.map(() => "?").join(",")})
         ORDER BY p.payment_date DESC,p.recorded_at DESC,p.id`,
        [org, project, ...sources.map((item) => item.id)],
        connection,
      );
    } catch (error) {
      if (!isMissingPaymentSchema(error)) throw error;
      available = false;
    }
    const groups = new Map<string, SourcePayment[]>();
    const iso = (value: unknown) =>
      value instanceof Date ? value.toISOString() : String(value);
    for (const row of rows) {
      const { sourceId, ...payment } = row;
      const payments = groups.get(String(sourceId)) ?? [];
      payments.push({
        ...payment,
        amount: String(payment.amount),
        recordedAt: iso(payment.recordedAt),
        voidedAt: payment.voidedAt ? iso(payment.voidedAt) : null,
      } as SourcePayment);
      groups.set(String(sourceId), payments);
    }
    for (const item of sources)
      result.set(item.id, {
        ...paymentLedger(
          item.payable === null ? null : String(item.payable),
          groups.get(item.id) ?? [],
          item.version,
        ),
        ...(!available ? { paymentTrackingAvailable: false } : {}),
      });
    return result;
  }
  async ledger(
    source: PaymentSource,
    org: string,
    project: string,
    id: string,
    payable: string | null,
    version: number,
    connection?: DatabaseConnection,
  ): Promise<PaymentLedger> {
    return (
      await this.ledgers(
        source,
        org,
        project,
        [{ id, payable, version }],
        connection,
      )
    ).get(id)!;
  }
  async read(
    source: PaymentSource,
    org: string,
    project: string,
    id: string,
    parent?: string,
  ) {
    return this.db.transaction(async (c) => {
      const row = await this.source(source, org, project, id, parent, c);
      return this.ledger(source, org, project, id, row.payable, row.version, c);
    });
  }
  async command(
    source: PaymentSource,
    org: string,
    project: string,
    id: string,
    parent: string | undefined,
    actor: string,
    dto: RecordPaymentDto | VoidPaymentDto,
    paymentId?: string,
  ): Promise<PaymentLedger> {
    const { table, column } = tables[source];
    const isVoid = paymentId !== undefined;
    const commandTable = isVoid ? `${table}_voids` : table;
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          source,
          org,
          project,
          id,
          parent: parent ?? null,
          paymentId: paymentId ?? null,
          ...dto,
        }),
      )
      .digest("hex");
    return this.db.transaction(async (c) => {
      // Lock the same parent used by source edits/adjustments, before replay/version checks.
      const row = await this.source(source, org, project, id, parent, c, true);
      const replay = await this.db.query<RowDataPacket>(
        `SELECT request_fingerprint FROM ${commandTable} WHERE organization_id=? AND project_id=? AND idempotency_key=?`,
        [org, project, dto.idempotencyKey],
        c,
      );
      if (replay[0]) {
        if (replay[0].request_fingerprint !== fingerprint)
          throw new ConflictException({
            code: "PAYMENT_IDEMPOTENCY_CONFLICT",
            message: "Retry key conflicts with another command",
          });
        return this.ledger(
          source,
          org,
          project,
          id,
          row.payable,
          row.version,
          c,
        );
      }
      if (row.version !== dto.expectedVersion)
        throw new ConflictException({
          code: "PAYMENT_VERSION_CONFLICT",
          message: "Record changed. Refresh before recording payment.",
        });
      const ledger = await this.ledger(
        source,
        org,
        project,
        id,
        row.payable,
        row.version,
        c,
      );
      if (ledger.paymentTrackingAvailable === false)
        throw new ServiceUnavailableException(paymentSchemaError);
      const commandId = randomUUID();
      if (isVoid) {
        const p = ledger.payments.find((p) => p.id === paymentId);
        if (!p)
          throw new NotFoundException({
            code: "PAYMENT_NOT_FOUND",
            message: "Payment not found",
          });
        if (p.voidedAt)
          throw new ConflictException({
            code: "PAYMENT_ALREADY_VOIDED",
            message: "Payment already voided",
          });
        const voidDto = dto as VoidPaymentDto;
        await this.db.execute(
          `INSERT INTO ${commandTable} (id,payment_id,organization_id,project_id,reason,voided_by,idempotency_key,request_fingerprint) VALUES (?,?,?,?,?,?,?,?)`,
          [
            commandId,
            paymentId,
            org,
            project,
            voidDto.reason,
            actor,
            dto.idempotencyKey,
            fingerprint,
          ],
          c,
        );
      } else {
        const payment = dto as RecordPaymentDto;
        if (source === "expenses" && row.status !== "APPROVED")
          throw new BadRequestException({
            code: "PAYMENT_SOURCE_INVALID",
            message: "Only approved expenses can be paid",
          });
        if (
          source === "materials" &&
          [
            "CANCELLED",
            "REJECTED",
            "DRAFT",
            "PENDING_FINAL",
            "RETURNED",
          ].includes(row.status)
        )
          throw new BadRequestException({
            code: "PAYMENT_SOURCE_INVALID",
            message:
              "This material purchase cannot be paid in its current state",
          });
        if (row.payable === null)
          throw new BadRequestException({
            code: "PAYMENT_COST_REQUIRED",
            message: "A purchase total is required before recording payment",
          });
        const amount = moneyPaise(payment.amount);
        if (amount <= 0n || amount > moneyPaise(ledger.remainingAmount!))
          throw new BadRequestException({
            code: "PAYMENT_AMOUNT_INVALID",
            message:
              "Payment must be positive and cannot exceed the remaining amount",
          });
        await this.db.execute(
          `INSERT INTO ${table} (id,organization_id,project_id,${column}${source === "materials" ? ",material_request_id" : ""},amount,payment_date,payment_method,reference,recorded_by,idempotency_key,request_fingerprint) VALUES (?,?,?,?${source === "materials" ? ",?" : ""},?,?,?,?,?,?,?)`,
          [
            commandId,
            org,
            project,
            id,
            ...(source === "materials" ? [parent!] : []),
            paiseMoney(amount),
            payment.paymentDate,
            payment.paymentMethod,
            payment.reference?.trim() || null,
            actor,
            dto.idempotencyKey,
            fingerprint,
          ],
          c,
        );
      }
      await this.db.execute(
        `UPDATE ${source === "materials" ? "material_requests" : "site_expenses"} SET version=version+1 WHERE id=? AND organization_id=? AND project_id=?`,
        [row.id, org, project],
        c,
      );
      await this.audit.record(
        {
          organizationId: org,
          projectId: project,
          actorUserId: actor,
          action: `${source}.payment.${isVoid ? "voided" : "recorded"}`,
          entityType:
            source === "materials" ? "material_purchase" : "site_expense",
          entityId: id,
          metadata: {
            paymentId: isVoid ? paymentId : commandId,
            ...(isVoid
              ? { reason: (dto as VoidPaymentDto).reason }
              : {
                  amount: (dto as RecordPaymentDto).amount,
                  paymentDate: (dto as RecordPaymentDto).paymentDate,
                }),
          },
        },
        c,
      );
      return this.ledger(
        source,
        org,
        project,
        id,
        row.payable,
        row.version + 1,
        c,
      );
    });
  }
}
