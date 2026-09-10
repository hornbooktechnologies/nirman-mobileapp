import { Injectable } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type {
  ExpenseAuditAction,
  ExpenseEventType,
  ExpenseStatus,
  ExpenseWorkflowMode,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  AdjustExpenseDto,
  ConfigureExpensesDto,
  CreateExpenseDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from "./dto/expenses.dto";

interface SettingsRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  workflowMode: ExpenseWorkflowMode;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseRow extends RowDataPacket {
  id: string;
  organizationId: string;
  projectId: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  adjustmentTotal: string;
  paymentMethod: string | null;
  vendorPayee: string | null;
  recordedByMemberId: string;
  recordedByUserId: string;
  recordedBy: string;
  workflowMode: ExpenseWorkflowMode;
  status: ExpenseStatus;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  version: number;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventRow extends RowDataPacket {
  id: string;
  eventType: ExpenseEventType;
  previousStatus: ExpenseStatus | null;
  nextStatus: ExpenseStatus;
  comment: string | null;
  actorUserId: string;
  actorName: string;
  requestFingerprint: string;
  createdAt: Date;
}

interface AdjustmentRow extends RowDataPacket {
  id: string;
  amount: string;
  reason: string;
  recordedByUserId: string;
  recordedBy: string;
  requestFingerprint: string;
  createdAt: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}
interface SummaryRow extends RowDataPacket {
  status: ExpenseStatus;
  count: number;
  originalAmount: string;
  adjustmentAmount: string;
}

interface SettingEventRow extends RowDataPacket {
  projectId: string;
  requestFingerprint: string;
}

type Actor = { userId: string; memberId: string };

@Injectable()
export class ExpensesRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async findSettings(
    organizationId: string,
    projectId: string,
    connection?: DatabaseConnection,
  ) {
    const [row] = await this.database.query<SettingsRow>(
      `SELECT id, organization_id organizationId, project_id projectId,
        workflow_mode workflowMode, created_at createdAt, updated_at updatedAt
       FROM project_expense_settings
       WHERE organization_id = ? AND project_id = ?`,
      [organizationId, projectId],
      connection,
    );
    return row ? this.mapSettings(row) : null;
  }

  async upsertSettings(
    organizationId: string,
    projectId: string,
    dto: ConfigureExpensesDto,
    actorUserId: string,
  ) {
    const fingerprint = this.fingerprint({
      projectId,
      workflowMode: dto.workflowMode,
    });
    return this.database.transaction(async (connection) => {
      const [replay] = await this.database.query<SettingEventRow>(
        `SELECT project_id projectId, request_fingerprint requestFingerprint
         FROM project_expense_setting_events
         WHERE organization_id = ? AND idempotency_key = ?`,
        [organizationId, dto.idempotencyKey],
        connection,
      );
      if (replay) {
        if (
          replay.projectId !== projectId ||
          replay.requestFingerprint !== fingerprint
        ) {
          this.fail("EXPENSE_IDEMPOTENCY_CONFLICT");
        }
        const settings = await this.findSettings(
          organizationId,
          projectId,
          connection,
        );
        if (!settings) this.fail("EXPENSE_WORKFLOW_NOT_CONFIGURED");
        return settings;
      }
      const [current] = await this.database.query<SettingsRow>(
        `SELECT id, organization_id organizationId, project_id projectId,
          workflow_mode workflowMode, created_at createdAt, updated_at updatedAt
         FROM project_expense_settings
         WHERE organization_id = ? AND project_id = ? FOR UPDATE`,
        [organizationId, projectId],
        connection,
      );
      const id = current?.id ?? randomUUID();
      if (current) {
        await this.database.execute(
          `UPDATE project_expense_settings
           SET workflow_mode = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [dto.workflowMode, actorUserId, id],
          connection,
        );
      } else {
        await this.database.execute(
          `INSERT INTO project_expense_settings (
            id, organization_id, project_id, workflow_mode, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            organizationId,
            projectId,
            dto.workflowMode,
            actorUserId,
            actorUserId,
          ],
          connection,
        );
      }
      await this.database.execute(
        `INSERT INTO project_expense_setting_events (
          id, project_expense_setting_id, organization_id, project_id,
          previous_workflow_mode, next_workflow_mode, actor_user_id,
          idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          id,
          organizationId,
          projectId,
          current?.workflowMode ?? null,
          dto.workflowMode,
          actorUserId,
          dto.idempotencyKey,
          fingerprint,
        ],
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId,
          action: "expenses.settings.updated",
          entityType: "project_expense_settings",
          entityId: id,
          oldValues: current ? { workflowMode: current.workflowMode } : null,
          newValues: { workflowMode: dto.workflowMode },
        },
        connection,
      );
      const settings = await this.findSettings(
        organizationId,
        projectId,
        connection,
      );
      if (!settings) this.fail("EXPENSE_WORKFLOW_NOT_CONFIGURED");
      return settings;
    });
  }

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
  ) {
    const { where, params } = this.buildWhere(organizationId, projectId, query);
    const [count] = await this.database.query<CountRow>(
      `SELECT COUNT(*) total FROM site_expenses e WHERE ${where}`,
      params,
    );
    const sortColumns = {
      expenseDate: "e.expense_date",
      amount: "e.amount",
      updatedAt: "e.updated_at",
      description: "e.description",
    } as const;
    const sort = sortColumns[query.sortBy ?? "expenseDate"];
    const order = query.sortOrder === "asc" ? "ASC" : "DESC";
    const rows = await this.database.query<ExpenseRow>(
      `${this.expenseSelect()} WHERE ${where}
       ORDER BY ${sort} ${order}, e.created_at DESC, e.id DESC LIMIT ? OFFSET ?`,
      [...params, query.pageSize, (query.page - 1) * query.pageSize],
    );
    const total = Number(count?.total ?? 0);
    return {
      items: rows.map((row) => this.mapExpense(row)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
  ) {
    const { where, params } = this.buildWhere(organizationId, projectId, query);
    const rows = await this.database.query<SummaryRow>(
      `SELECT e.status status, COUNT(*) count,
        COALESCE(SUM(e.amount), 0) originalAmount,
        COALESCE(SUM((SELECT COALESCE(SUM(a.amount), 0)
          FROM site_expense_adjustments a WHERE a.site_expense_id = e.id)), 0) adjustmentAmount
       FROM site_expenses e WHERE ${where} GROUP BY e.status`,
      params,
    );
    const countsByStatus: Partial<Record<ExpenseStatus, number>> = {};
    let approvedOriginal = 0;
    let adjustments = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    for (const row of rows) {
      countsByStatus[row.status] = Number(row.count);
      if (row.status === "APPROVED") {
        approvedOriginal += Number(row.originalAmount);
        adjustments += Number(row.adjustmentAmount);
      }
      if (row.status === "PENDING_APPROVAL") {
        pendingAmount += Number(row.originalAmount);
        pendingCount += Number(row.count);
      }
    }
    return {
      approvedOriginalAmount: this.money(approvedOriginal),
      adjustmentTotal: this.money(adjustments),
      recognizedAmount: this.money(approvedOriginal + adjustments),
      pendingAmount: this.money(pendingAmount),
      pendingCount,
      countsByStatus,
    };
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    expenseId: string,
    connection?: DatabaseConnection,
  ) {
    const [row] = await this.database.query<ExpenseRow>(
      `${this.expenseSelect()} WHERE e.organization_id = ? AND e.project_id = ? AND e.id = ?`,
      [organizationId, projectId, expenseId],
      connection,
    );
    if (!row) return null;
    const events = await this.database.query<EventRow>(
      `SELECT ev.id, ev.event_type eventType, ev.previous_status previousStatus,
        ev.next_status nextStatus, ev.comment, ev.actor_user_id actorUserId,
        u.name actorName, ev.request_fingerprint requestFingerprint, ev.created_at createdAt
       FROM site_expense_events ev INNER JOIN \`user\` u ON u.id = ev.actor_user_id
       WHERE ev.organization_id = ? AND ev.project_id = ? AND ev.site_expense_id = ?
       ORDER BY ev.created_at ASC, ev.id ASC`,
      [organizationId, projectId, expenseId],
      connection,
    );
    const adjustments = await this.database.query<AdjustmentRow>(
      `SELECT a.id, a.amount, a.reason, a.recorded_by_user_id recordedByUserId,
        u.name recordedBy, a.request_fingerprint requestFingerprint, a.created_at createdAt
       FROM site_expense_adjustments a INNER JOIN \`user\` u ON u.id = a.recorded_by_user_id
       WHERE a.organization_id = ? AND a.project_id = ? AND a.site_expense_id = ?
       ORDER BY a.created_at ASC, a.id ASC`,
      [organizationId, projectId, expenseId],
      connection,
    );
    return {
      ...this.mapExpense(row),
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        previousStatus: event.previousStatus,
        nextStatus: event.nextStatus,
        comment: event.comment,
        actorUserId: event.actorUserId,
        actorName: event.actorName,
        createdAt: event.createdAt.toISOString(),
      })),
      adjustments: adjustments.map((adjustment) => ({
        id: adjustment.id,
        amount: this.money(adjustment.amount),
        reason: adjustment.reason,
        recordedByUserId: adjustment.recordedByUserId,
        recordedBy: adjustment.recordedBy,
        createdAt: adjustment.createdAt.toISOString(),
      })),
    };
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateExpenseDto,
    actor: Actor,
    workflowMode: ExpenseWorkflowMode,
  ) {
    const fingerprint = this.fingerprint({ projectId, ...dto, workflowMode });
    return this.database.transaction(async (connection) => {
      const replay = await this.findCreateReplay(
        organizationId,
        dto.idempotencyKey,
        fingerprint,
        connection,
      );
      if (replay) return replay;
      const id = randomUUID();
      const status: ExpenseStatus = dto.saveAsDraft
        ? "DRAFT"
        : workflowMode === "DIRECT"
          ? "APPROVED"
          : "PENDING_APPROVAL";
      await this.database.execute(
        `INSERT INTO site_expenses (
          id, organization_id, project_id, expense_date, category, description, amount,
          payment_method, vendor_payee, recorded_by_member_id, recorded_by_user_id,
          workflow_mode, status, approved_by_user_id, approved_by_member_id, approved_at,
          idempotency_key, request_fingerprint, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          projectId,
          dto.expenseDate,
          dto.category,
          dto.description,
          dto.amount,
          dto.paymentMethod ?? null,
          dto.vendorPayee ?? null,
          actor.memberId,
          actor.userId,
          workflowMode,
          status,
          status === "APPROVED" ? actor.userId : null,
          status === "APPROVED" ? actor.memberId : null,
          status === "APPROVED" ? new Date() : null,
          dto.idempotencyKey,
          fingerprint,
          actor.userId,
          actor.userId,
        ],
        connection,
      );
      await this.insertEvent(
        {
          organizationId,
          projectId,
          expenseId: id,
          eventType: "CREATED",
          previousStatus: null,
          nextStatus: status,
          comment: null,
          actor,
          idempotencyKey: dto.idempotencyKey,
          fingerprint,
        },
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: actor.userId,
          action: "expenses.expense.created",
          entityType: "site_expense",
          entityId: id,
          newValues: {
            status,
            amount: dto.amount,
            category: dto.category,
            workflowMode,
          },
        },
        connection,
      );
      if (status === "PENDING_APPROVAL") {
        await this.notifyApprovers(
          organizationId,
          projectId,
          id,
          actor.userId,
          dto.idempotencyKey,
          connection,
        );
      }
      return (await this.findDetail(
        organizationId,
        projectId,
        id,
        connection,
      ))!;
    });
  }

  async update(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
    actor: Actor,
    actorElevated: boolean,
  ) {
    const fingerprint = this.fingerprint({ expenseId, ...dto });
    return this.database.transaction(async (connection) => {
      const replay = await this.findEventReplay(
        organizationId,
        dto.idempotencyKey,
        fingerprint,
        connection,
      );
      if (replay)
        return (await this.findDetail(
          organizationId,
          projectId,
          replay,
          connection,
        ))!;
      const row = await this.lockExpense(
        organizationId,
        projectId,
        expenseId,
        connection,
      );
      this.assertVersionAndStatus(row, dto.expectedVersion, [
        "DRAFT",
        "REJECTED",
      ]);
      if (row.recordedByMemberId !== actor.memberId && !actorElevated)
        this.fail("EXPENSE_ACTION_NOT_ALLOWED");
      await this.database.execute(
        `UPDATE site_expenses SET
          expense_date = COALESCE(?, expense_date), category = COALESCE(?, category),
          description = COALESCE(?, description), amount = COALESCE(?, amount),
          payment_method = CASE WHEN ? THEN ? ELSE payment_method END,
          vendor_payee = CASE WHEN ? THEN ? ELSE vendor_payee END,
          version = version + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [
          dto.expenseDate ?? null,
          dto.category ?? null,
          dto.description ?? null,
          dto.amount ?? null,
          dto.paymentMethod !== undefined,
          dto.paymentMethod ?? null,
          dto.vendorPayee !== undefined,
          dto.vendorPayee ?? null,
          actor.userId,
          expenseId,
        ],
        connection,
      );
      await this.insertEvent(
        {
          organizationId,
          projectId,
          expenseId,
          eventType: "UPDATED",
          previousStatus: row.status,
          nextStatus: row.status,
          comment: null,
          actor,
          idempotencyKey: dto.idempotencyKey,
          fingerprint,
        },
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: actor.userId,
          action: "expenses.expense.updated",
          entityType: "site_expense",
          entityId: expenseId,
          oldValues: { version: row.version },
          newValues: { version: row.version + 1 },
        },
        connection,
      );
      return (await this.findDetail(
        organizationId,
        projectId,
        expenseId,
        connection,
      ))!;
    });
  }

  async transition(input: {
    organizationId: string;
    projectId: string;
    expenseId: string;
    actor: Actor;
    expectedVersion: number;
    idempotencyKey: string;
    reason?: string | null;
    allowedFrom: readonly ExpenseStatus[];
    nextStatus: ExpenseStatus;
    eventType: ExpenseEventType;
    auditAction: ExpenseAuditAction;
    preventRecorderAction?: boolean;
    requireRecorderUnlessElevated?: boolean;
    actorElevated?: boolean;
    notificationType?: string;
  }) {
    const fingerprint = this.fingerprint({
      expenseId: input.expenseId,
      expectedVersion: input.expectedVersion,
      reason: input.reason ?? null,
      eventType: input.eventType,
      nextStatus: input.nextStatus,
    });
    return this.database.transaction(async (connection) => {
      const replay = await this.findEventReplay(
        input.organizationId,
        input.idempotencyKey,
        fingerprint,
        connection,
      );
      if (replay)
        return (await this.findDetail(
          input.organizationId,
          input.projectId,
          replay,
          connection,
        ))!;
      const row = await this.lockExpense(
        input.organizationId,
        input.projectId,
        input.expenseId,
        connection,
      );
      this.assertVersionAndStatus(
        row,
        input.expectedVersion,
        input.allowedFrom,
      );
      const isRecorder = row.recordedByMemberId === input.actor.memberId;
      if (input.preventRecorderAction && isRecorder)
        this.fail("EXPENSE_SELF_APPROVAL_FORBIDDEN");
      if (
        input.requireRecorderUnlessElevated &&
        !isRecorder &&
        !input.actorElevated
      )
        this.fail("EXPENSE_ACTION_NOT_ALLOWED");
      const approving = input.nextStatus === "APPROVED";
      const rejecting = input.nextStatus === "REJECTED";
      const clearingRejection = row.status === "REJECTED" && !rejecting;
      await this.database.execute(
        `UPDATE site_expenses SET status = ?, version = version + 1,
          approved_by_user_id = CASE WHEN ? THEN ? ELSE approved_by_user_id END,
          approved_by_member_id = CASE WHEN ? THEN ? ELSE approved_by_member_id END,
          approved_at = CASE WHEN ? THEN CURRENT_TIMESTAMP(3) ELSE approved_at END,
          rejected_by_user_id = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE rejected_by_user_id END,
          rejected_by_member_id = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE rejected_by_member_id END,
          rejected_at = CASE WHEN ? THEN CURRENT_TIMESTAMP(3) WHEN ? THEN NULL ELSE rejected_at END,
          rejection_reason = CASE WHEN ? THEN ? WHEN ? THEN NULL ELSE rejection_reason END,
          updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [
          input.nextStatus,
          approving,
          input.actor.userId,
          approving,
          input.actor.memberId,
          approving,
          rejecting,
          input.actor.userId,
          clearingRejection,
          rejecting,
          input.actor.memberId,
          clearingRejection,
          rejecting,
          clearingRejection,
          rejecting,
          input.reason ?? null,
          clearingRejection,
          input.actor.userId,
          input.expenseId,
        ],
        connection,
      );
      await this.insertEvent(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          expenseId: input.expenseId,
          eventType: input.eventType,
          previousStatus: row.status,
          nextStatus: input.nextStatus,
          comment: input.reason ?? null,
          actor: input.actor,
          idempotencyKey: input.idempotencyKey,
          fingerprint,
        },
        connection,
      );
      await this.audit.record(
        {
          organizationId: input.organizationId,
          projectId: input.projectId,
          actorUserId: input.actor.userId,
          action: input.auditAction,
          entityType: "site_expense",
          entityId: input.expenseId,
          oldValues: { status: row.status, version: row.version },
          newValues: { status: input.nextStatus, version: row.version + 1 },
          metadata: input.reason ? { reason: input.reason } : null,
        },
        connection,
      );
      if (input.nextStatus === "PENDING_APPROVAL") {
        await this.notifyApprovers(
          input.organizationId,
          input.projectId,
          input.expenseId,
          input.actor.userId,
          input.idempotencyKey,
          connection,
        );
      } else if (input.notificationType) {
        await this.notifyRecorder(
          row,
          input.notificationType,
          input.actor.userId,
          input.idempotencyKey,
          connection,
        );
      }
      return (await this.findDetail(
        input.organizationId,
        input.projectId,
        input.expenseId,
        connection,
      ))!;
    });
  }

  async adjust(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: AdjustExpenseDto,
    actor: Actor,
  ) {
    const fingerprint = this.fingerprint({ expenseId, ...dto });
    return this.database.transaction(async (connection) => {
      const replay = await this.findAdjustmentReplay(
        organizationId,
        dto.idempotencyKey,
        fingerprint,
        connection,
      );
      if (replay)
        return (await this.findDetail(
          organizationId,
          projectId,
          replay,
          connection,
        ))!;
      const row = await this.lockExpense(
        organizationId,
        projectId,
        expenseId,
        connection,
      );
      this.assertVersionAndStatus(row, dto.expectedVersion, ["APPROVED"]);
      const currentRecognized =
        Number(row.amount) + Number(row.adjustmentTotal);
      if (!Number.isFinite(dto.amount) || dto.amount === 0)
        this.fail("EXPENSE_ADJUSTMENT_INVALID");
      if (currentRecognized + dto.amount < 0)
        this.fail("EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE");
      const id = randomUUID();
      await this.database.execute(
        `INSERT INTO site_expense_adjustments (
          id, site_expense_id, organization_id, project_id, amount, reason,
          recorded_by_user_id, recorded_by_member_id, idempotency_key, request_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          expenseId,
          organizationId,
          projectId,
          dto.amount,
          dto.reason,
          actor.userId,
          actor.memberId,
          dto.idempotencyKey,
          fingerprint,
        ],
        connection,
      );
      await this.database.execute(
        `UPDATE site_expenses SET version = version + 1, updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [actor.userId, expenseId],
        connection,
      );
      await this.insertEvent(
        {
          organizationId,
          projectId,
          expenseId,
          eventType: "ADJUSTED",
          previousStatus: "APPROVED",
          nextStatus: "APPROVED",
          comment: dto.reason,
          actor,
          idempotencyKey: dto.idempotencyKey,
          fingerprint,
        },
        connection,
      );
      await this.audit.record(
        {
          organizationId,
          projectId,
          actorUserId: actor.userId,
          action: "expenses.expense.adjusted",
          entityType: "site_expense",
          entityId: expenseId,
          oldValues: {
            recognizedAmount: this.money(currentRecognized),
            version: row.version,
          },
          newValues: {
            adjustment: this.money(dto.amount),
            recognizedAmount: this.money(currentRecognized + dto.amount),
            version: row.version + 1,
          },
          metadata: { reason: dto.reason, adjustmentId: id },
        },
        connection,
      );
      await this.notifyRecorder(
        row,
        "EXPENSE_ADJUSTED",
        actor.userId,
        dto.idempotencyKey,
        connection,
      );
      return (await this.findDetail(
        organizationId,
        projectId,
        expenseId,
        connection,
      ))!;
    });
  }

  fingerprint(value: unknown) {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
  }

  private expenseSelect() {
    return `SELECT e.id, e.organization_id organizationId, e.project_id projectId,
      e.expense_date expenseDate, e.category, e.description, e.amount,
      COALESCE((SELECT SUM(a.amount) FROM site_expense_adjustments a
        WHERE a.site_expense_id = e.id), 0) adjustmentTotal,
      e.payment_method paymentMethod, e.vendor_payee vendorPayee,
      e.recorded_by_member_id recordedByMemberId, e.recorded_by_user_id recordedByUserId,
      recorder.name recordedBy, e.workflow_mode workflowMode, e.status,
      approver.name approvedBy, e.approved_at approvedAt, e.rejection_reason rejectionReason,
      e.version, e.idempotency_key idempotencyKey, e.request_fingerprint requestFingerprint,
      e.created_at createdAt, e.updated_at updatedAt
     FROM site_expenses e
     INNER JOIN \`user\` recorder ON recorder.id = e.recorded_by_user_id
     LEFT JOIN \`user\` approver ON approver.id = e.approved_by_user_id`;
  }

  private buildWhere(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
  ) {
    const clauses = ["e.organization_id = ?", "e.project_id = ?"];
    const params: (string | number)[] = [organizationId, projectId];
    if (query.status) {
      clauses.push("e.status = ?");
      params.push(query.status);
    }
    if (query.category) {
      clauses.push("e.category = ?");
      params.push(query.category);
    }
    if (query.paymentMethod) {
      clauses.push("e.payment_method = ?");
      params.push(query.paymentMethod);
    }
    if (query.recordedByMemberId) {
      clauses.push("e.recorded_by_member_id = ?");
      params.push(query.recordedByMemberId);
    }
    if (query.expenseFrom) {
      clauses.push("e.expense_date >= ?");
      params.push(query.expenseFrom);
    }
    if (query.expenseTo) {
      clauses.push("e.expense_date <= ?");
      params.push(query.expenseTo);
    }
    if (query.search) {
      clauses.push("(e.description LIKE ? OR e.vendor_payee LIKE ?)");
      const search = `%${query.search}%`;
      params.push(search, search);
    }
    return { where: clauses.join(" AND "), params };
  }

  private async lockExpense(
    organizationId: string,
    projectId: string,
    expenseId: string,
    connection: DatabaseConnection,
  ) {
    const [row] = await this.database.query<ExpenseRow>(
      `${this.expenseSelect()} WHERE e.organization_id = ? AND e.project_id = ? AND e.id = ? FOR UPDATE`,
      [organizationId, projectId, expenseId],
      connection,
    );
    if (!row) this.fail("EXPENSE_NOT_FOUND");
    return row;
  }

  private assertVersionAndStatus(
    row: ExpenseRow,
    expectedVersion: number,
    allowed: readonly ExpenseStatus[],
  ) {
    if (row.version !== expectedVersion) this.fail("EXPENSE_VERSION_CONFLICT");
    if (!allowed.includes(row.status))
      this.fail("EXPENSE_STATUS_TRANSITION_INVALID");
  }

  private async findCreateReplay(
    organizationId: string,
    key: string,
    fingerprint: string,
    connection: DatabaseConnection,
  ) {
    const [row] = await this.database.query<ExpenseRow>(
      `${this.expenseSelect()} WHERE e.organization_id = ? AND e.idempotency_key = ?`,
      [organizationId, key],
      connection,
    );
    if (!row) return null;
    if (row.requestFingerprint !== fingerprint)
      this.fail("EXPENSE_IDEMPOTENCY_CONFLICT");
    return (await this.findDetail(
      row.organizationId,
      row.projectId,
      row.id,
      connection,
    ))!;
  }

  private async findEventReplay(
    organizationId: string,
    key: string,
    fingerprint: string,
    connection: DatabaseConnection,
  ) {
    const [row] = await this.database.query<EventRow & { expenseId: string }>(
      `SELECT site_expense_id expenseId, request_fingerprint requestFingerprint
       FROM site_expense_events WHERE organization_id = ? AND idempotency_key = ?`,
      [organizationId, key],
      connection,
    );
    if (!row) return null;
    if (row.requestFingerprint !== fingerprint)
      this.fail("EXPENSE_IDEMPOTENCY_CONFLICT");
    return row.expenseId;
  }

  private async findAdjustmentReplay(
    organizationId: string,
    key: string,
    fingerprint: string,
    connection: DatabaseConnection,
  ) {
    const [row] = await this.database.query<
      AdjustmentRow & { expenseId: string }
    >(
      `SELECT site_expense_id expenseId, request_fingerprint requestFingerprint
       FROM site_expense_adjustments WHERE organization_id = ? AND idempotency_key = ?`,
      [organizationId, key],
      connection,
    );
    if (!row) return null;
    if (row.requestFingerprint !== fingerprint)
      this.fail("EXPENSE_IDEMPOTENCY_CONFLICT");
    return row.expenseId;
  }

  private async insertEvent(
    input: {
      organizationId: string;
      projectId: string;
      expenseId: string;
      eventType: ExpenseEventType;
      previousStatus: ExpenseStatus | null;
      nextStatus: ExpenseStatus;
      comment: string | null;
      actor: Actor;
      idempotencyKey: string;
      fingerprint: string;
    },
    connection: DatabaseConnection,
  ) {
    await this.database.execute(
      `INSERT INTO site_expense_events (
        id, site_expense_id, organization_id, project_id, event_type, previous_status,
        next_status, comment, actor_user_id, actor_member_id, idempotency_key, request_fingerprint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.expenseId,
        input.organizationId,
        input.projectId,
        input.eventType,
        input.previousStatus,
        input.nextStatus,
        input.comment,
        input.actor.userId,
        input.actor.memberId,
        input.idempotencyKey,
        input.fingerprint,
      ],
      connection,
    );
  }

  private async notifyApprovers(
    organizationId: string,
    projectId: string,
    expenseId: string,
    actorUserId: string,
    key: string,
    connection: DatabaseConnection,
  ) {
    const recipients = await this.notifications.findProjectRecipients(
      organizationId,
      projectId,
      "expenses:approve",
      connection,
    );
    await this.notifications.createMany(
      recipients
        .filter((id) => id !== actorUserId)
        .map((userId) => ({
          organizationId,
          projectId,
          userId,
          type: "EXPENSE_APPROVAL_REQUIRED",
          title: "Expense approval required",
          message: "A site expense is waiting for review.",
          referenceType: "SITE_EXPENSE",
          referenceId: expenseId,
          deepLink: `/(app)/expense-detail?id=${expenseId}`,
          dedupeKey: `expense:${expenseId}:approval:${key}:${userId}`,
        })),
      connection,
    );
  }

  private async notifyRecorder(
    row: ExpenseRow,
    type: string,
    actorUserId: string,
    key: string,
    connection: DatabaseConnection,
  ) {
    if (row.recordedByUserId === actorUserId) return;
    const copy: Record<string, [string, string]> = {
      EXPENSE_APPROVED: ["Expense approved", "Your site expense was approved."],
      EXPENSE_REJECTED: ["Expense rejected", "Your site expense was rejected."],
      EXPENSE_ADJUSTED: [
        "Expense adjusted",
        "An approved site expense was corrected.",
      ],
    };
    const [title, message] = copy[type] ?? [
      "Expense updated",
      "A site expense was updated.",
    ];
    await this.notifications.createMany(
      [
        {
          organizationId: row.organizationId,
          projectId: row.projectId,
          userId: row.recordedByUserId,
          type,
          title,
          message,
          referenceType: "SITE_EXPENSE",
          referenceId: row.id,
          deepLink: `/(app)/expense-detail?id=${row.id}`,
          dedupeKey: `expense:${row.id}:${type}:${key}:${row.recordedByUserId}`,
        },
      ],
      connection,
    );
  }

  private mapSettings(row: SettingsRow) {
    return {
      organizationId: row.organizationId,
      projectId: row.projectId,
      workflowMode: row.workflowMode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapExpense(row: ExpenseRow) {
    const amount = Number(row.amount);
    const adjustments = Number(row.adjustmentTotal);
    return {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId,
      expenseDate: this.date(row.expenseDate),
      category: row.category,
      description: row.description,
      amount: this.money(amount),
      adjustmentTotal: this.money(adjustments),
      recognizedAmount: this.money(
        row.status === "APPROVED" ? amount + adjustments : 0,
      ),
      paymentMethod: row.paymentMethod,
      vendorPayee: row.vendorPayee,
      recordedByMemberId: row.recordedByMemberId,
      recordedByUserId: row.recordedByUserId,
      recordedBy: row.recordedBy,
      workflowMode: row.workflowMode,
      status: row.status,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectionReason: row.rejectionReason,
      version: Number(row.version),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private date(value: string | Date) {
    return typeof value === "string"
      ? value.slice(0, 10)
      : value.toISOString().slice(0, 10);
  }

  private money(value: string | number) {
    return Number(value).toFixed(2);
  }

  private fail(code: string): never {
    throw new Error(code);
  }
}
