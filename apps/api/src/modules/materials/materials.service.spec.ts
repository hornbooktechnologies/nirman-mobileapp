/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { MaterialsRepository } from "./materials.repository";
import { MaterialsService } from "./materials.service";

describe("MaterialsService", () => {
  const repository = {
    findSettings: jest.fn(),
    upsertSettings: jest.fn(),
    findMany: jest.fn(),
    summary: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    transition: jest.fn(),
    recordPurchase: jest.fn(),
    recordDelivery: jest.fn(),
  } as unknown as jest.Mocked<MaterialsRepository>;
  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new MaterialsService(repository, projectAccess);
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
  const requestId = "00000000-0000-4000-8000-000000000030";
  const memberId = "00000000-0000-4000-8000-000000000040";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({
      project: { status: "ACTIVE" },
      membership: { id: memberId },
      permissions: [
        "materials:read",
        "materials:create",
        "materials:update",
        "materials:configure",
        "materials:approve-level-1",
        "materials:approve-final",
        "materials:reject",
        "materials:record-purchase",
        "materials:record-delivery",
        "materials:export",
      ],
    } as any);
    repository.findSettings.mockResolvedValue({
      workflowMode: "VERIFY_THEN_FINAL",
    } as any);
    repository.create.mockResolvedValue({
      id: requestId,
      status: "DRAFT",
      requestedByMemberId: memberId,
    } as any);
    repository.transition.mockResolvedValue({
      id: requestId,
      status: "PENDING_FINAL",
      requestedByMemberId: "00000000-0000-4000-8000-000000000099",
    } as any);
  });

  it("marks persisted settings as configured", async () => {
    await expect(
      service.findSettings(organizationId, projectId, actor),
    ).resolves.toMatchObject({
      workflowMode: "VERIFY_THEN_FINAL",
      configured: true,
    });
  });

  it("marks newly configured settings as configured", async () => {
    repository.upsertSettings.mockResolvedValue({
      workflowMode: "DIRECT",
    } as any);

    await expect(
      service.configure(
        organizationId,
        projectId,
        { workflowMode: "DIRECT" },
        actor,
      ),
    ).resolves.toMatchObject({ workflowMode: "DIRECT", configured: true });
  });

  it("requires explicit Project Materials workflow configuration", async () => {
    repository.findSettings.mockResolvedValue(null as any);

    await expect(
      service.create(
        organizationId,
        projectId,
        {
          materialName: "Cement",
          requestedQuantity: 50,
          unitOfMeasure: "BAG",
          requestedOn: "2026-09-01",
          idempotencyKey: "material-create-001",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "MATERIAL_WORKFLOW_NOT_CONFIGURED" },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates one Project-scoped request using the server workflow snapshot", async () => {
    const result = await service.create(
      organizationId,
      projectId,
      {
        materialName: " Cement ",
        requestedQuantity: 50,
        unitOfMeasure: "BAG",
        requestedOn: "2026-09-01",
        notes: " Ground floor ",
        idempotencyKey: " material-create-002 ",
      },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "materials:create",
    );
    expect(repository.create).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({
        notes: "Ground floor",
        idempotencyKey: "material-create-002",
      }),
      actor.id,
      memberId,
      "VERIFY_THEN_FINAL",
    );
    expect(result.availableActions).toEqual(["EDIT", "SUBMIT", "CANCEL"]);
  });

  it.each([
    ["DIRECT", "APPROVED", undefined],
    ["FINAL_APPROVAL", "PENDING_FINAL", "materials:approve-final"],
    ["VERIFY_THEN_FINAL", "PENDING_VERIFICATION", "materials:approve-level-1"],
  ])(
    "submits %s workflow to %s",
    async (workflowMode, nextStatus, notificationPermission) => {
      repository.findDetail.mockResolvedValue({
        id: requestId,
        workflowMode,
        status: "DRAFT",
      } as any);

      await service.submit(
        organizationId,
        projectId,
        requestId,
        { expectedVersion: 1, idempotencyKey: `submit-${workflowMode}` },
        actor,
      );

      expect(repository.transition).toHaveBeenCalledWith(
        expect.objectContaining({
          nextStatus,
          notificationPermission,
          eventType: "SUBMITTED",
        }),
      );
    },
  );

  it("keeps site verification separate from final approval", async () => {
    repository.findDetail.mockResolvedValue({
      id: requestId,
      status: "PENDING_VERIFICATION",
      workflowMode: "VERIFY_THEN_FINAL",
    } as any);

    await service.verify(
      organizationId,
      projectId,
      requestId,
      { expectedVersion: 2, idempotencyKey: "verify-001" },
      actor,
    );

    expect(repository.transition).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedFrom: ["PENDING_VERIFICATION"],
        nextStatus: "PENDING_FINAL",
        preventRequesterAction: true,
        notificationPermission: "materials:approve-final",
      }),
    );
  });

  it("requires comments for return, rejection, and cancellation", () => {
    expect(() =>
      service.reject(
        organizationId,
        projectId,
        requestId,
        { expectedVersion: 2, idempotencyKey: "reject-001" },
        actor,
      ),
    ).toThrow("A rejection comment is required");
    expect(repository.transition).not.toHaveBeenCalled();
  });

  it("rejects Materials writes for a non-active Project", async () => {
    projectAccess.resolveProjectAccess.mockResolvedValue({
      project: { status: "COMPLETED" },
      membership: { id: memberId },
      permissions: [],
    } as any);

    await expect(
      service.recordDelivery(
        organizationId,
        projectId,
        requestId,
        {
          deliveredQuantity: 10,
          deliveredOn: "2026-09-01",
          expectedVersion: 4,
          idempotencyKey: "delivery-001",
        },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "PROJECT_STATUS_INVALID" } });
    expect(repository.recordDelivery).not.toHaveBeenCalled();
  });

  it("derives purchase total without creating an Expense", async () => {
    repository.recordPurchase.mockResolvedValue({ id: requestId } as any);

    await service.recordPurchase(
      organizationId,
      projectId,
      requestId,
      {
        orderedQuantity: 10,
        unitCost: 425.5,
        purchasedOn: "2026-09-01",
        expectedVersion: 3,
        idempotencyKey: "purchase-001",
      },
      actor,
    );

    expect(repository.recordPurchase).toHaveBeenCalledWith(
      organizationId,
      projectId,
      requestId,
      expect.objectContaining({ totalCost: 4255 }),
      actor.id,
      memberId,
    );
  });
});
