/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-explicit-any */
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { KharchiRepository } from "./kharchi.repository";
import { KharchiService } from "./kharchi.service";

describe("KharchiService", () => {
  const repository = {
    findMany: jest.fn(),
    summary: jest.fn(),
    findDetail: jest.fn(),
    create: jest.fn(),
    adjust: jest.fn(),
    fingerprint: jest.fn(),
  } as unknown as jest.Mocked<KharchiRepository>;
  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new KharchiService(repository, projectAccess);
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
  const kharchiId = "00000000-0000-4000-8000-000000000030";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({
      project: { status: "ACTIVE" },
    } as any);
    repository.fingerprint.mockReturnValue("fingerprint");
  });

  it("records a direct paid advance with normalized payment evidence", async () => {
    repository.create.mockResolvedValue({ id: kharchiId } as any);

    await service.create(
      organizationId,
      projectId,
      {
        workerAssignmentId: "00000000-0000-4000-8000-000000000040",
        amount: 1000,
        requestDate: "2026-08-31",
        paymentMethod: "UPI",
        paymentReference: "  UPI-123  ",
        notes: "  Given at site  ",
        idempotencyKey: " kharchi-create-001 ",
      },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "kharchi:create",
    );
    expect(repository.create).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({
        paymentReference: "UPI-123",
        notes: "Given at site",
        idempotencyKey: "kharchi-create-001",
      }),
      actor.id,
      "1000.00",
      "fingerprint",
    );
  });

  it("rejects a financial write for a non-active Project", async () => {
    projectAccess.resolveProjectAccess.mockResolvedValue({
      project: { status: "COMPLETED" },
    } as any);

    await expect(
      service.create(
        organizationId,
        projectId,
        {
          workerAssignmentId: "00000000-0000-4000-8000-000000000040",
          amount: 100,
          requestDate: "2026-08-31",
          paymentMethod: "CASH",
          idempotencyKey: "kharchi-create-002",
        },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "PROJECT_STATUS_INVALID" } });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("records an immutable signed adjustment", async () => {
    repository.adjust.mockResolvedValue({ id: kharchiId } as any);

    await service.adjust(
      organizationId,
      projectId,
      kharchiId,
      {
        amount: -250.5,
        reason: "  Duplicate cash counted  ",
        idempotencyKey: " adjustment-001 ",
      },
      actor,
    );

    expect(repository.adjust).toHaveBeenCalledWith(
      organizationId,
      projectId,
      kharchiId,
      expect.objectContaining({
        amount: -250.5,
        reason: "Duplicate cash counted",
        idempotencyKey: "adjustment-001",
      }),
      actor.id,
      "-250.50",
      "fingerprint",
    );
  });

  it("maps assignment-date errors to the stable client error", async () => {
    repository.create.mockRejectedValue(
      Object.assign(new Error("KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT"), {
        code: "KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT",
      }),
    );

    await expect(
      service.create(
        organizationId,
        projectId,
        {
          workerAssignmentId: "00000000-0000-4000-8000-000000000040",
          amount: 100,
          requestDate: "2026-08-31",
          paymentMethod: "CASH",
          idempotencyKey: "kharchi-create-003",
        },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT" },
    });
  });

  it("exports escaped financial rows", async () => {
    repository.findMany.mockResolvedValue({
      items: [
        {
          workerCode: "WRK-001",
          workerName: "Ravi",
          trade: "Mason",
          requestDate: "2026-08-31",
          amount: "1000.00",
          adjustmentAmount: "-100.00",
          effectiveAmount: "900.00",
          deductedAmount: "400.00",
          outstandingAmount: "500.00",
          status: "PARTIALLY_DEDUCTED",
          paymentMethod: "CASH",
          paymentReference: null,
          recordedBy: actor.id,
          paidAt: "2026-08-31T10:00:00.000Z",
          notes: 'Site "A"',
        },
      ],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    } as any);

    const result = await service.export(organizationId, projectId, {}, actor);

    expect(result.csv).toContain('"WRK-001","Ravi"');
    expect(result.csv).toContain('"Site ""A"""');
  });
});
