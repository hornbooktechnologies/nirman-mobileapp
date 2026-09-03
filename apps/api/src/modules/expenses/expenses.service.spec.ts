/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { ExpensesRepository } from "./expenses.repository";
import { ExpensesService } from "./expenses.service";

describe("ExpensesService", () => {
  const repository = {
    findSettings: jest.fn(),
    upsertSettings: jest.fn(),
    findMany: jest.fn(),
    summary: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    transition: jest.fn(),
    adjust: jest.fn(),
  } as unknown as jest.Mocked<ExpensesRepository>;
  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new ExpensesService(repository, projectAccess);
  const actor: AuthenticatedUser = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@example.test",
    name: "Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "role-id",
    roleName: "Organization Owner",
    permissions: [],
  };
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";
  const expenseId = "00000000-0000-4000-8000-000000000030";
  const memberId = "00000000-0000-4000-8000-000000000040";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({
      project: { status: "ACTIVE" },
      membership: { id: memberId },
      permissions: [
        "expenses:read",
        "expenses:create",
        "expenses:update",
        "expenses:configure",
        "expenses:approve",
        "expenses:reject",
        "expenses:adjust",
        "expenses:export",
      ],
    } as any);
    repository.findSettings.mockResolvedValue({
      workflowMode: "APPROVAL_REQUIRED",
    } as any);
    repository.create.mockResolvedValue({
      id: expenseId,
      status: "PENDING_APPROVAL",
      recordedByMemberId: memberId,
    } as any);
    repository.transition.mockResolvedValue({
      id: expenseId,
      status: "APPROVED",
      recordedByMemberId: "00000000-0000-4000-8000-000000000099",
    } as any);
  });

  it("requires explicit Project expense workflow configuration", async () => {
    repository.findSettings.mockResolvedValue(null);
    await expect(
      service.create(
        organizationId,
        projectId,
        {
          expenseDate: "2026-09-01",
          category: "TOOLS",
          description: "Drill bit",
          amount: 250,
          saveAsDraft: false,
          idempotencyKey: "expense-create-001",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "EXPENSE_WORKFLOW_NOT_CONFIGURED" },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("records a normalized expense with the server workflow snapshot", async () => {
    const result = await service.create(
      organizationId,
      projectId,
      {
        expenseDate: "2026-09-01",
        category: "TRANSPORT",
        description: " Local delivery ",
        amount: 425.5,
        vendorPayee: " Driver ",
        saveAsDraft: false,
        idempotencyKey: " expense-create-002 ",
      },
      actor,
    );
    expect(repository.create).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({
        description: "Local delivery",
        vendorPayee: "Driver",
        idempotencyKey: "expense-create-002",
      }),
      { userId: actor.id, memberId },
      "APPROVAL_REQUIRED",
    );
    expect(result.availableActions).toEqual(["CANCEL"]);
  });

  it.each([
    ["DIRECT", "APPROVED"],
    ["APPROVAL_REQUIRED", "PENDING_APPROVAL"],
  ])("submits %s workflow to %s", async (workflowMode, nextStatus) => {
    repository.findDetail.mockResolvedValue({
      id: expenseId,
      workflowMode,
      status: "DRAFT",
      recordedByMemberId: memberId,
    } as any);
    await service.submit(
      organizationId,
      projectId,
      expenseId,
      { expectedVersion: 1, idempotencyKey: `submit-${workflowMode}` },
      actor,
    );
    expect(repository.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStatus,
        allowedFrom: ["DRAFT", "REJECTED"],
        requireRecorderUnlessElevated: true,
      }),
    );
  });

  it("requires reasons for rejection and cancellation", () => {
    expect(() =>
      service.reject(
        organizationId,
        projectId,
        expenseId,
        { expectedVersion: 1, idempotencyKey: "reject-expense-001" },
        actor,
      ),
    ).toThrow("A rejection reason is required");
    expect(repository.transition).not.toHaveBeenCalled();
  });

  it("rejects future expense dates using the fixed India calendar date", async () => {
    await expect(
      service.create(
        organizationId,
        projectId,
        {
          expenseDate: "2999-01-01",
          category: "FOOD",
          description: "Site meal",
          amount: 100,
          saveAsDraft: false,
          idempotencyKey: "expense-create-future",
        },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "EXPENSE_DATE_IN_FUTURE" } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects zero-value adjustments before repository writes", async () => {
    await expect(
      service.adjust(
        organizationId,
        projectId,
        expenseId,
        {
          expectedVersion: 2,
          amount: 0,
          reason: "Correction",
          idempotencyKey: "expense-adjust-001",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "EXPENSE_ADJUSTMENT_INVALID" },
    });
    expect(repository.adjust).not.toHaveBeenCalled();
  });
});
