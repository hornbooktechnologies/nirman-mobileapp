/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { DatabaseService } from "../../database/database.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ExpensesRepository } from "./expenses.repository";

describe("ExpensesRepository transactional guards", () => {
  const connection = { execute: jest.fn(), query: jest.fn() } as any;
  const database = {
    transaction: jest.fn(async (operation: (value: any) => Promise<unknown>) =>
      operation(connection),
    ),
    query: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const notifications = {
    createMany: jest.fn(),
    findProjectRecipients: jest.fn(),
  } as unknown as jest.Mocked<NotificationsService>;
  const repository = new ExpensesRepository(database, audit, notifications);
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";
  const expenseId = "00000000-0000-4000-8000-000000000030";
  const actor = {
    userId: "00000000-0000-4000-8000-000000000001",
    memberId: "00000000-0000-4000-8000-000000000040",
  };
  const row = {
    id: expenseId,
    organizationId,
    projectId,
    expenseDate: "2026-09-01",
    category: "TOOLS",
    description: "Drill bit",
    amount: "500.00",
    adjustmentTotal: "-100.00",
    paymentMethod: "CASH",
    vendorPayee: null,
    recordedByMemberId: actor.memberId,
    recordedByUserId: actor.userId,
    recordedBy: "Recorder",
    workflowMode: "APPROVAL_REQUIRED",
    status: "PENDING_APPROVAL",
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    version: 2,
    idempotencyKey: "expense-create-001",
    requestFingerprint: "fingerprint",
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects a workflow-setting retry key previously used for another Project", async () => {
    const otherProjectId = "00000000-0000-4000-8000-000000000099";
    database.query.mockResolvedValue([
      {
        projectId: otherProjectId,
        requestFingerprint: repository.fingerprint({
          projectId: otherProjectId,
          workflowMode: "DIRECT",
        }),
      },
    ] as any);

    await expect(
      repository.upsertSettings(
        organizationId,
        projectId,
        { workflowMode: "DIRECT", idempotencyKey: "expense-settings-001" },
        actor.userId,
      ),
    ).rejects.toThrow("EXPENSE_IDEMPOTENCY_CONFLICT");
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("rejects recorder self-approval before state, audit, or notification writes", async () => {
    database.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes("SELECT site_expense_id expenseId") &&
        sql.includes("FROM site_expense_events")
      )
        return [];
      if (sql.includes("FROM site_expenses e") && sql.includes("FOR UPDATE"))
        return [row] as any;
      return [];
    });
    await expect(
      repository.transition({
        organizationId,
        projectId,
        expenseId,
        actor,
        expectedVersion: 2,
        idempotencyKey: "expense-approve-001",
        allowedFrom: ["PENDING_APPROVAL"],
        nextStatus: "APPROVED",
        eventType: "APPROVED",
        auditAction: "expenses.expense.approved",
        preventRecorderAction: true,
      }),
    ).rejects.toThrow("EXPENSE_SELF_APPROVAL_FORBIDDEN");
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it("rejects an adjustment that would make recognized cost negative", async () => {
    database.query.mockImplementation(async (sql: string) => {
      if (
        sql.includes("SELECT site_expense_id expenseId") &&
        sql.includes("FROM site_expense_adjustments")
      )
        return [];
      if (sql.includes("FROM site_expenses e") && sql.includes("FOR UPDATE")) {
        return [{ ...row, status: "APPROVED", version: 3 }] as any;
      }
      return [];
    });
    await expect(
      repository.adjust(
        organizationId,
        projectId,
        expenseId,
        {
          expectedVersion: 3,
          amount: -401,
          reason: "Correct overstatement",
          idempotencyKey: "expense-adjust-002",
        },
        { ...actor, memberId: "00000000-0000-4000-8000-000000000099" },
      ),
    ).rejects.toThrow("EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE");
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
