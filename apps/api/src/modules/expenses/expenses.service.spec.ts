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
      organization: { type: "BUILDER" },
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

  it.each([
    ["BUILDER", "Organization Owner", true, true],
    ["CONTRACTOR", "Independent Contractor Owner", true, true],
    ["BUILDER", "Builder Admin", true, false],
    ["BUILDER", "Project Manager", true, false],
    ["CONTRACTOR", "Organization Owner", true, false],
    ["BUILDER", "Organization Owner", false, false],
  ])(
    "gates own approval for %s / %s with permission %s",
    async (type, role, permission, allowed) => {
      projectAccess.resolveProjectAccess.mockResolvedValue({
        organization: { type },
        project: { status: "ACTIVE" },
        membership: { id: memberId, role: { name: role } },
        permissions: permission
          ? ["expenses:read", "expenses:approve", "expenses:reject"]
          : ["expenses:read"],
      } as any);
      repository.findDetail.mockResolvedValue({
        id: expenseId,
        status: "PENDING_APPROVAL",
        recordedByMemberId: memberId,
      } as any);
      const detail = await service.findDetail(
        organizationId,
        projectId,
        expenseId,
        actor,
      );
      expect(detail.availableActions.includes("APPROVE")).toBe(allowed);
      expect(detail.availableActions).not.toContain("REJECT");
      if (permission) {
        await service.approve(
          organizationId,
          projectId,
          expenseId,
          { expectedVersion: 2, idempotencyKey: "owner-approval-key" },
          actor,
        );
        expect(repository.transition).toHaveBeenCalledWith(
          expect.objectContaining({
            actorCanSelfApprove: allowed,
            preventRecorderAction: true,
            expectedVersion: 2,
            actor: { userId: actor.id, memberId },
          }),
        );
      }
    },
  );

  it("does not write when effective project access denies approval", async () => {
    projectAccess.resolveProjectAccess.mockRejectedValueOnce(
      new Error("PERMISSION_DENIED"),
    );
    await expect(
      service.approve(
        organizationId,
        projectId,
        expenseId,
        { expectedVersion: 2, idempotencyKey: "denied-approval-key" },
        actor,
      ),
    ).rejects.toThrow("PERMISSION_DENIED");
    expect(repository.transition).not.toHaveBeenCalled();
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
  it.each(["MATERIAL_PURCHASE", "LABOUR_RELATED"] as const)(
    "rejects newly created retired category %s",
    async (category) => {
      await expect(
        service.create(
          organizationId,
          projectId,
          {
            expenseDate: "2026-09-20",
            category,
            description: "Legacy duplicate",
            amount: 10,
            idempotencyKey: "retired-category-001",
            saveAsDraft: false,
          },
          actor,
        ),
      ).rejects.toThrow("Record material purchases in Materials");
      expect(repository.create).not.toHaveBeenCalled();
    },
  );
  it.each(["2026-02-30", "2026-09-20T00:00:00Z", "invalid"])(
    "rejects non-calendar expense date %s before writes",
    async (expenseDate) => {
      await expect(
        service.create(
          organizationId,
          projectId,
          {
            expenseDate,
            category: "FOOD",
            description: "Site meal",
            amount: 100,
            saveAsDraft: false,
            idempotencyKey: "invalid-date-key",
          },
          actor,
        ),
      ).rejects.toMatchObject({ response: { code: "VALIDATION_FAILED" } });
      expect(repository.create).not.toHaveBeenCalled();
    },
  );
  it("rejects impossible filter dates before list reads", async () => {
    await expect(
      service.findMany(
        organizationId,
        projectId,
        { page: 1, pageSize: 20, expenseFrom: "2026-02-30" },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "VALIDATION_FAILED" } });
    expect(repository.findMany).not.toHaveBeenCalled();
  });
  it("rejects one-character cancellation reasons", () => {
    expect(() =>
      service.cancel(
        organizationId,
        projectId,
        expenseId,
        {
          expectedVersion: 1,
          idempotencyKey: "short-reason-key",
          reason: " x ",
        },
        actor,
      ),
    ).toThrow("A cancellation reason is required");
    expect(repository.transition).not.toHaveBeenCalled();
  });
  it("returns no write actions for archived projects", async () => {
    projectAccess.resolveProjectAccess.mockResolvedValue({
      organization: { type: "BUILDER" },
      project: { status: "ARCHIVED" },
      membership: { id: memberId },
      permissions: ["expenses:read", "expenses:adjust"],
    } as any);
    repository.findDetail.mockResolvedValue({
      id: expenseId,
      status: "APPROVED",
      recordedByMemberId: memberId,
    } as any);
    const detail = await service.findDetail(
      organizationId,
      projectId,
      expenseId,
      actor,
    );
    expect(detail.availableActions).toEqual([]);
  });
});
