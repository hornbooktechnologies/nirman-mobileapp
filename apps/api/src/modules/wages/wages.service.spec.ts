/* eslint-disable @typescript-eslint/unbound-method */
import { ServiceUnavailableException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { WagesRepository } from "./wages.repository";
import { WagesService } from "./wages.service";

describe("WagesService", () => {
  const wagesRepo = {
    previewRows: jest.fn(),
    findBatches: jest.fn(),
    findBatchDetail: jest.fn(),
    findActiveBatchForPeriod: jest.fn(),
    createBatch: jest.fn(),
    recordPayment: jest.fn(),
    updateWageItem: jest.fn(),
  } as unknown as jest.Mocked<WagesRepository>;

  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;

  const service = new WagesService(wagesRepo, projectAccess);

  const actor: AuthenticatedUser = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@example.test",
    name: "Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "role-id",
    roleName: "Owner",
    permissions: [],
  };
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({} as any);
  });

  it("blocks incompatible new wage preview with a stable safety error", async () => {
    await expect(
      service.preview(
        organizationId,
        projectId,
        { start: "2026-08-01", end: "2026-08-05" },
        actor,
      ),
    ).rejects.toMatchObject({
      response: { code: "WAGE_CALCULATION_MODEL_UNAVAILABLE" },
    });
    expect(wagesRepo.previewRows).not.toHaveBeenCalled();
  });

  it("blocks incompatible new wage generation before legacy calculation", async () => {
    await expect(
      service.createBatch(
        organizationId,
        projectId,
        { periodStart: "2026-08-01", periodEnd: "2026-08-05" },
        actor,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(wagesRepo.findActiveBatchForPeriod).not.toHaveBeenCalled();
    expect(wagesRepo.createBatch).not.toHaveBeenCalled();
  });

  it("records a wage payment through the repository", async () => {
    wagesRepo.recordPayment.mockResolvedValue({ id: "batch-id" } as any);

    await service.recordPayment(
      organizationId,
      projectId,
      "00000000-0000-4000-8000-000000000030",
      {
        amount: 500,
        paymentDate: "2026-08-20",
        paymentMethod: "CASH",
      },
      actor,
    );

    expect(wagesRepo.recordPayment).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({
        amount: "500.00",
        paymentMethod: "CASH",
        recordedBy: actor.id,
      }),
    );
  });

  it("updates a wage item adjustment through the repository", async () => {
    wagesRepo.updateWageItem.mockResolvedValue({ id: "batch-id" } as any);

    await service.updateWageItem(
      organizationId,
      projectId,
      "00000000-0000-4000-8000-000000000030",
      { adjustmentAmount: -50.5, notes: "Tool damage" },
      actor,
    );

    expect(wagesRepo.updateWageItem).toHaveBeenCalledWith(
      organizationId,
      projectId,
      expect.objectContaining({
        adjustmentAmount: "-50.50",
        notes: "Tool damage",
      }),
    );
  });

  it("exports wage item rows and payment history as csv", async () => {
    wagesRepo.findBatchDetail.mockResolvedValue({
      id: "batch-id",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-20",
      items: [
        {
          id: "item-id",
          workerCode: "WRK-001",
          workerName: "Rajesh Patel",
          trade: "Helper",
          presentDays: 2,
          halfDays: 1,
          holidayDays: 0,
          absentDays: 0,
          dailyRate: "800.00",
          grossAmount: "2000.00",
          kharchiDeduction: "0.00",
          adjustmentAmount: "-50.50",
          netAmount: "1949.50",
          paidAmount: "500.00",
          paymentStatus: "PARTIALLY_PAID",
          notes: "Site \"A\"",
        },
      ],
      payments: [
        {
          id: "payment-id",
          wageItemId: "item-id",
          amount: "500.00",
          paymentDate: "2026-08-20",
          paymentMethod: "CASH",
          reference: "REF-1",
          recordedBy: actor.id,
          recordedAt: "2026-08-20T10:00:00.000Z",
        },
      ],
    } as any);

    const result = await service.exportBatch(
      organizationId,
      projectId,
      "00000000-0000-4000-8000-000000000040",
      actor,
    );

    expect(result.filename).toBe(`wages-${projectId}-2026-08-01-2026-08-20.csv`);
    expect(result.csv).toContain('"Worker Code","Worker Name"');
    expect(result.csv).toContain('"WRK-001","Rajesh Patel"');
    expect(result.csv).toContain('"Payment History"');
    expect(result.csv).toContain('"Site ""A"""');
  });
});
