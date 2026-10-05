import { SourcePaymentsRepository } from "../source-payments/source-payments.repository";
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
  const payments = {
    ledger: jest.fn().mockResolvedValue({
      payments: [],
      paidAmount: "0.00",
      remainingAmount: "400.00",
      paymentStatus: "UNPAID",
      version: 1,
    }),
  };
  const repository = new ExpensesRepository(
    database,
    audit,
    notifications,
    payments as unknown as SourcePaymentsRepository,
  );
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

  it.each(["APPROVED", "REJECTED"] as const)(
    "owner exception only permits approval, not %s self-rejection",
    async (status) => {
      database.query.mockImplementation(async (sql: string) => {
        if (sql.includes("FROM site_expenses e"))
          return [
            {
              ...row,
              status: sql.includes("FOR UPDATE") ? "PENDING_APPROVAL" : status,
            },
          ] as any;
        return [];
      });
      const operation = repository.transition({
        organizationId,
        projectId,
        expenseId,
        actor,
        expectedVersion: 2,
        idempotencyKey: "owner-self-action",
        allowedFrom: ["PENDING_APPROVAL"],
        nextStatus: status,
        eventType: status,
        auditAction:
          status === "APPROVED"
            ? "expenses.expense.approved"
            : "expenses.expense.rejected",
        preventRecorderAction: true,
        actorCanSelfApprove: true,
      });
      if (status === "REJECTED") {
        await expect(operation).rejects.toThrow(
          "EXPENSE_SELF_APPROVAL_FORBIDDEN",
        );
        expect(database.execute).not.toHaveBeenCalled();
      } else {
        await operation;
        expect(database.execute).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE site_expenses"),
          expect.arrayContaining([actor.userId, actor.memberId]),
          connection,
        );
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            actorUserId: actor.userId,
            newValues: { status: "APPROVED", version: 3 },
            metadata: { approvalBasis: "OWNER_SELF_APPROVAL" },
          }),
          connection,
        );
      }
    },
  );

  it("replays owner approval without duplicate financial or audit writes", async () => {
    const input = {
      organizationId,
      projectId,
      expenseId,
      actor,
      expectedVersion: 2,
      idempotencyKey: "owner-replay-key",
      allowedFrom: ["PENDING_APPROVAL"] as const,
      nextStatus: "APPROVED" as const,
      eventType: "APPROVED" as const,
      auditAction: "expenses.expense.approved" as const,
      preventRecorderAction: true,
      actorCanSelfApprove: true,
    };
    database.query.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT site_expense_id expenseId"))
        return [
          {
            expenseId,
            requestFingerprint: repository.fingerprint({
              expenseId,
              expectedVersion: 2,
              reason: null,
              eventType: "APPROVED",
              nextStatus: "APPROVED",
            }),
          },
        ];
      if (sql.includes("FROM site_expenses e"))
        return [{ ...row, status: "APPROVED", version: 3 }] as any;
      return [];
    });
    await repository.transition(input);
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it("still rejects stale owner approval before writes", async () => {
    database.query.mockImplementation(async (sql: string) =>
      sql.includes("FOR UPDATE") ? ([row] as any) : [],
    );
    await expect(
      repository.transition({
        organizationId,
        projectId,
        expenseId,
        actor,
        expectedVersion: 1,
        idempotencyKey: "stale-owner-action",
        allowedFrom: ["PENDING_APPROVAL"],
        nextStatus: "APPROVED",
        eventType: "APPROVED",
        auditAction: "expenses.expense.approved",
        preventRecorderAction: true,
        actorCanSelfApprove: true,
      }),
    ).rejects.toThrow("EXPENSE_VERSION_CONFLICT");
    expect(database.execute).not.toHaveBeenCalled();
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
  it("rejects an expense adjustment below active payments", async () => {
    payments.ledger.mockResolvedValueOnce({
      payments: [],
      paidAmount: "350.00",
      remainingAmount: "50.00",
      paymentStatus: "PARTIALLY_PAID",
      version: 3,
    });
    database.query.mockImplementation(async (sql: string) =>
      sql.includes("FROM site_expenses e")
        ? ([{ ...row, status: "APPROVED", version: 3 }] as any)
        : [],
    );
    await expect(
      repository.adjust(
        organizationId,
        projectId,
        expenseId,
        {
          expectedVersion: 3,
          amount: -100,
          reason: "Cost correction",
          idempotencyKey: "paid-floor-001",
        },
        actor,
      ),
    ).rejects.toThrow("Void mistaken payments");
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
  it("reads cost, version, history and payment balance in one snapshot", async () => {
    database.query.mockImplementation(async (sql: string) =>
      sql.includes("FROM site_expenses e") ? ([row] as any) : [],
    );
    const detail = await repository.findDetail(
      organizationId,
      projectId,
      expenseId,
    );
    expect(database.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      true,
    );
    expect(
      database.query.mock.calls.every((call) => call[2] === connection),
    ).toBe(true);
    expect(payments.ledger).toHaveBeenCalledWith(
      "expenses",
      organizationId,
      projectId,
      expenseId,
      "400.00",
      row.version,
      connection,
    );
    expect(detail).toMatchObject({
      paidAmount: "0.00",
      remainingAmount: "400.00",
      paymentStatus: "UNPAID",
      payments: [],
    });
  });
});
