import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ErrorCode,
  ExpenseAvailableAction,
  ExpenseStatus,
  PermissionKey,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  AdjustExpenseDto,
  ConfigureExpensesDto,
  CreateExpenseDto,
  ExpenseCommandDto,
  QueryExpensesDto,
  UpdateExpenseDto,
} from "./dto/expenses.dto";
import { ExpensesRepository } from "./expenses.repository";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repository: ExpensesRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async findSettings(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "expenses:read");
    const settings = await this.repository.findSettings(
      organizationId,
      projectId,
    );
    return settings
      ? { ...settings, configured: true }
      : {
          organizationId,
          projectId,
          workflowMode: null,
          configured: false,
        };
  }

  async configure(
    organizationId: string,
    projectId: string,
    dto: ConfigureExpensesDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "expenses:configure",
    );
    this.assertActiveProject(access.project.status);
    return this.translate(async () => ({
      ...(await this.repository.upsertSettings(
        organizationId,
        projectId,
        {
          ...dto,
          idempotencyKey: dto.idempotencyKey.trim(),
        },
        actor.id,
      )),
      configured: true,
    }));
  }

  async findMany(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "expenses:read");
    this.validateRange(query.expenseFrom, query.expenseTo);
    return this.repository.findMany(organizationId, projectId, query);
  }

  async summary(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "expenses:read");
    this.validateRange(query.expenseFrom, query.expenseTo);
    return this.repository.summary(organizationId, projectId, query);
  }

  async findDetail(
    organizationId: string,
    projectId: string,
    expenseId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "expenses:read",
    );
    const detail = await this.repository.findDetail(
      organizationId,
      projectId,
      expenseId,
    );
    if (!detail) throw this.notFound();
    return this.withAvailableActions(
      detail,
      access.membership.id,
      access.permissions,
    );
  }

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateExpenseDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "expenses:create",
    );
    this.assertActiveProject(access.project.status);
    this.validateExpenseDate(dto.expenseDate);
    const settings = await this.repository.findSettings(
      organizationId,
      projectId,
    );
    if (!settings) {
      throw new BadRequestException(
        this.error(
          "EXPENSE_WORKFLOW_NOT_CONFIGURED",
          "Configure the Project Site Expenses workflow before recording expenses",
        ),
      );
    }
    const normalized = {
      ...dto,
      description: dto.description.trim(),
      vendorPayee: dto.vendorPayee?.trim() || null,
      idempotencyKey: dto.idempotencyKey.trim(),
    };
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.create(
          organizationId,
          projectId,
          normalized,
          { userId: actor.id, memberId: access.membership.id },
          settings.workflowMode,
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  async update(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "expenses:update",
    );
    this.assertActiveProject(access.project.status);
    if (dto.expenseDate) this.validateExpenseDate(dto.expenseDate);
    const normalized = {
      ...dto,
      description: dto.description?.trim(),
      vendorPayee:
        dto.vendorPayee === undefined
          ? undefined
          : dto.vendorPayee?.trim() || null,
      idempotencyKey: dto.idempotencyKey.trim(),
    };
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.update(
          organizationId,
          projectId,
          expenseId,
          normalized,
          { userId: actor.id, memberId: access.membership.id },
          access.permissions.includes("expenses:approve"),
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  submit(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: ExpenseCommandDto,
    actor: AuthenticatedUser,
  ) {
    return this.command(
      organizationId,
      projectId,
      expenseId,
      dto,
      actor,
      "expenses:update",
      {
        allowedFrom: ["DRAFT", "REJECTED"],
        nextStatus: (row) =>
          row.workflowMode === "DIRECT" ? "APPROVED" : "PENDING_APPROVAL",
        eventType: "SUBMITTED",
        auditAction: "expenses.expense.submitted",
        requireRecorderUnlessElevated: true,
      },
    );
  }

  approve(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: ExpenseCommandDto,
    actor: AuthenticatedUser,
  ) {
    return this.command(
      organizationId,
      projectId,
      expenseId,
      dto,
      actor,
      "expenses:approve",
      {
        allowedFrom: ["PENDING_APPROVAL"],
        nextStatus: "APPROVED",
        eventType: "APPROVED",
        auditAction: "expenses.expense.approved",
        preventRecorderAction: true,
        notificationType: "EXPENSE_APPROVED",
      },
    );
  }

  reject(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: ExpenseCommandDto,
    actor: AuthenticatedUser,
  ) {
    this.requireReason(dto.reason, "A rejection reason is required");
    return this.command(
      organizationId,
      projectId,
      expenseId,
      dto,
      actor,
      "expenses:reject",
      {
        allowedFrom: ["PENDING_APPROVAL"],
        nextStatus: "REJECTED",
        eventType: "REJECTED",
        auditAction: "expenses.expense.rejected",
        preventRecorderAction: true,
        notificationType: "EXPENSE_REJECTED",
      },
    );
  }

  cancel(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: ExpenseCommandDto,
    actor: AuthenticatedUser,
  ) {
    this.requireReason(dto.reason, "A cancellation reason is required");
    return this.command(
      organizationId,
      projectId,
      expenseId,
      dto,
      actor,
      "expenses:update",
      {
        allowedFrom: ["DRAFT", "PENDING_APPROVAL", "REJECTED"],
        nextStatus: "CANCELLED",
        eventType: "CANCELLED",
        auditAction: "expenses.expense.cancelled",
        requireRecorderUnlessElevated: true,
      },
    );
  }

  async adjust(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: AdjustExpenseDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      "expenses:adjust",
    );
    this.assertActiveProject(access.project.status);
    if (!Number.isFinite(dto.amount) || dto.amount === 0) {
      throw new BadRequestException(
        this.error(
          "EXPENSE_ADJUSTMENT_INVALID",
          "Adjustment amount must be non-zero",
        ),
      );
    }
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.adjust(
          organizationId,
          projectId,
          expenseId,
          {
            ...dto,
            reason: dto.reason.trim(),
            idempotencyKey: dto.idempotencyKey.trim(),
          },
          { userId: actor.id, memberId: access.membership.id },
        ),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  async export(
    organizationId: string,
    projectId: string,
    query: QueryExpensesDto,
    actor: AuthenticatedUser,
  ) {
    await this.access(actor, organizationId, projectId, "expenses:export");
    this.validateRange(query.expenseFrom, query.expenseTo);
    const rows = [];
    let page = 1;
    while (true) {
      const result = await this.repository.findMany(organizationId, projectId, {
        ...query,
        page,
        pageSize: 100,
      });
      rows.push(...result.items);
      if (page >= result.pagination.totalPages) break;
      page += 1;
    }
    const csvRows = [
      [
        "Date",
        "Category",
        "Description",
        "Original amount",
        "Adjustments",
        "Recognized amount",
        "Payment method",
        "Vendor/payee",
        "Status",
        "Recorded by",
      ],
      ...rows.map((row) => [
        row.expenseDate,
        row.category,
        row.description,
        row.amount,
        row.adjustmentTotal,
        row.recognizedAmount,
        row.paymentMethod ?? "",
        row.vendorPayee ?? "",
        row.status,
        row.recordedBy,
      ]),
    ];
    return {
      filename: `site-expenses-${projectId}.csv`,
      csv: `${csvRows.map((row) => row.map((cell) => this.csvCell(cell)).join(",")).join("\r\n")}\r\n`,
    };
  }

  private async command(
    organizationId: string,
    projectId: string,
    expenseId: string,
    dto: ExpenseCommandDto,
    actor: AuthenticatedUser,
    permission: PermissionKey,
    config: {
      allowedFrom: readonly ExpenseStatus[];
      nextStatus:
        ExpenseStatus | ((row: { workflowMode: string }) => ExpenseStatus);
      eventType: Parameters<ExpensesRepository["transition"]>[0]["eventType"];
      auditAction: Parameters<
        ExpensesRepository["transition"]
      >[0]["auditAction"];
      preventRecorderAction?: boolean;
      requireRecorderUnlessElevated?: boolean;
      notificationType?: string;
    },
  ) {
    const access = await this.access(
      actor,
      organizationId,
      projectId,
      permission,
    );
    this.assertActiveProject(access.project.status);
    const detail = await this.repository.findDetail(
      organizationId,
      projectId,
      expenseId,
    );
    if (!detail) throw this.notFound();
    const nextStatus =
      typeof config.nextStatus === "function"
        ? config.nextStatus(detail)
        : config.nextStatus;
    return this.translate(async () =>
      this.withAvailableActions(
        await this.repository.transition({
          organizationId,
          projectId,
          expenseId,
          actor: { userId: actor.id, memberId: access.membership.id },
          expectedVersion: dto.expectedVersion,
          idempotencyKey: dto.idempotencyKey.trim(),
          reason: dto.reason?.trim() || null,
          allowedFrom: config.allowedFrom,
          nextStatus,
          eventType: config.eventType,
          auditAction: config.auditAction,
          preventRecorderAction: config.preventRecorderAction,
          requireRecorderUnlessElevated: config.requireRecorderUnlessElevated,
          actorElevated: access.permissions.includes("expenses:approve"),
          notificationType: config.notificationType,
        }),
        access.membership.id,
        access.permissions,
      ),
    );
  }

  private withAvailableActions<
    T extends { status: ExpenseStatus; recordedByMemberId: string },
  >(detail: T, actorMemberId: string, permissions: readonly PermissionKey[]) {
    return {
      ...detail,
      availableActions: this.availableActions(
        detail.status,
        detail.recordedByMemberId === actorMemberId,
        permissions,
      ),
    };
  }

  private availableActions(
    status: ExpenseStatus,
    isRecorder: boolean,
    permissions: readonly PermissionKey[],
  ) {
    const has = (permission: PermissionKey) => permissions.includes(permission);
    const elevated = has("expenses:approve");
    const actions: ExpenseAvailableAction[] = [];
    if (
      ["DRAFT", "REJECTED"].includes(status) &&
      (isRecorder || elevated) &&
      has("expenses:update")
    ) {
      actions.push("EDIT", "SUBMIT", "CANCEL");
    }
    if (status === "PENDING_APPROVAL") {
      if (!isRecorder && has("expenses:approve")) actions.push("APPROVE");
      if (!isRecorder && has("expenses:reject")) actions.push("REJECT");
      if ((isRecorder || elevated) && has("expenses:update"))
        actions.push("CANCEL");
    }
    if (status === "APPROVED" && has("expenses:adjust")) actions.push("ADJUST");
    return [...new Set(actions)];
  }

  private access(
    actor: AuthenticatedUser,
    organizationId: string,
    projectId: string,
    permission: PermissionKey,
  ) {
    return this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
  }

  private async translate<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.message
            : "";
      if (code === "EXPENSE_NOT_FOUND") throw this.notFound();
      if (
        [
          "EXPENSE_VERSION_CONFLICT",
          "EXPENSE_IDEMPOTENCY_CONFLICT",
          "ER_DUP_ENTRY",
        ].includes(code)
      ) {
        throw new ConflictException(
          this.error(
            code === "ER_DUP_ENTRY"
              ? "EXPENSE_IDEMPOTENCY_CONFLICT"
              : (code as ErrorCode),
            "The expense changed or this retry key conflicts",
          ),
        );
      }
      const badRequestCodes: ErrorCode[] = [
        "EXPENSE_WORKFLOW_NOT_CONFIGURED",
        "EXPENSE_STATUS_TRANSITION_INVALID",
        "EXPENSE_ACTION_NOT_ALLOWED",
        "EXPENSE_SELF_APPROVAL_FORBIDDEN",
        "EXPENSE_AMOUNT_INVALID",
        "EXPENSE_DATE_IN_FUTURE",
        "EXPENSE_ADJUSTMENT_INVALID",
        "EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE",
      ];
      if (badRequestCodes.includes(code as ErrorCode)) {
        throw new BadRequestException(
          this.error(code as ErrorCode, this.message(code)),
        );
      }
      throw error;
    }
  }

  private validateExpenseDate(value: string) {
    if (value.slice(0, 10) > this.todayInIndia()) {
      throw new BadRequestException(
        this.error(
          "EXPENSE_DATE_IN_FUTURE",
          "Expense date cannot be in the future",
        ),
      );
    }
  }

  private todayInIndia() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  private validateRange(start?: string, end?: string) {
    if (start && end && end < start) {
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "End date cannot be before start date"),
      );
    }
  }

  private requireReason(reason: string | null | undefined, message: string) {
    if (!reason?.trim())
      throw new BadRequestException(this.error("VALIDATION_FAILED", message));
  }

  private assertActiveProject(status: string) {
    if (status !== "ACTIVE") {
      throw new BadRequestException(
        this.error(
          "PROJECT_STATUS_INVALID",
          "Site Expense writes require an active Project",
        ),
      );
    }
  }

  private notFound() {
    return new NotFoundException(
      this.error("EXPENSE_NOT_FOUND", "Expense not found"),
    );
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }

  private message(code: string) {
    const messages: Record<string, string> = {
      EXPENSE_WORKFLOW_NOT_CONFIGURED:
        "Configure the Project expense workflow first",
      EXPENSE_STATUS_TRANSITION_INVALID:
        "This expense action is not valid in the current state",
      EXPENSE_ACTION_NOT_ALLOWED:
        "You cannot perform this action on this expense",
      EXPENSE_SELF_APPROVAL_FORBIDDEN:
        "The recorder cannot approve or reject their own expense",
      EXPENSE_ADJUSTMENT_INVALID: "The adjustment must be a non-zero amount",
      EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE:
        "An adjustment cannot reduce recognized cost below zero",
    };
    return messages[code] ?? "The expense request is invalid";
  }

  private csvCell(value: unknown) {
    const text =
      value === null || value === undefined
        ? ""
        : typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            typeof value === "bigint"
          ? String(value)
          : value instanceof Date
            ? value.toISOString()
            : (JSON.stringify(value) ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }
}
