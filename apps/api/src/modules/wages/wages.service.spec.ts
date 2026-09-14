/* eslint-disable @typescript-eslint/unbound-method */
import type { AuthenticatedUser } from "../auth/types/auth.types";
import type { WageBatchDetail } from "@nirman-app/shared";
import { AttendanceService } from "../attendance/attendance.service";
import { ProjectAccessService } from "../project-access/project-access.service";
import { WagesRepository } from "./wages.repository";
import { WagesService } from "./wages.service";

describe("WagesService", () => {
  const wagesRepo = {
    findBatches: jest.fn(),
    findBatchDetail: jest.fn(),
    findActiveBatchForPeriod: jest.fn(),
    createBatch: jest.fn(),
    recordPayment: jest.fn(),
    cancelBatch: jest.fn(),
    updateWageItem: jest.fn(),
  } as unknown as jest.Mocked<WagesRepository>;

  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;

  const attendanceService = {
    calculateWagePeriod: jest.fn(),
  } as unknown as jest.Mocked<AttendanceService>;

  const service = new WagesService(wagesRepo, projectAccess, attendanceService);

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
  const cancelledDetail = {
    id: "batch-id",
    organizationId,
    projectId,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-14",
    status: "CANCELLED",
    generatedBy: actor.id,
    cancellationReason: "Attendance correction",
    createdAt: "2026-09-14T00:00:00.000Z",
    updatedAt: "2026-09-14T00:00:00.000Z",
    totals: {
      grossAmount: "0.00",
      kharchiDeduction: "0.00",
      adjustmentAmount: "0.00",
      netAmount: "0.00",
      paidAmount: "0.00",
    },
    items: [],
    payments: [],
  } satisfies WageBatchDetail;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({} as any);
    attendanceService.calculateWagePeriod.mockResolvedValue([]);
  });

  it("builds wage preview from derived Calendar and Attendance results", async () => {
    attendanceService.calculateWagePeriod.mockResolvedValue([
      {
        workerAssignmentId: "assignment-id",
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        dailyRate: "800.00",
        presentDays: 2,
        halfDays: 1,
        absentDays: 1,
      },
    ]);

    await expect(
      service.preview(
        organizationId,
        projectId,
        { start: "2026-08-01", end: "2026-08-05" },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            presentDays: 2,
            halfDays: 1,
            absentDays: 1,
            grossAmount: "2000.00",
            netAmount: "2000.00",
            isReady: true,
          }),
        ],
        totals: expect.objectContaining({ grossAmount: "2000.00" }),
      }),
    );
    expect(attendanceService.calculateWagePeriod).toHaveBeenCalledWith(
      organizationId,
      projectId,
      "2026-08-01",
      "2026-08-05",
    );
  });

  it("uses effective-dated rate segments without rewriting earlier days", async () => {
    attendanceService.calculateWagePeriod.mockResolvedValue([
      {
        workerAssignmentId: "assignment-id",
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        dailyRate: "1000.00",
        presentDays: 2,
        halfDays: 1,
        absentDays: 0,
        rateSegments: [
          { dailyRate: "800.00", presentDays: 1, halfDays: 0, absentDays: 0 },
          { dailyRate: "1000.00", presentDays: 1, halfDays: 1, absentDays: 0 },
        ],
      },
    ]);

    const preview = await service.preview(
      organizationId,
      projectId,
      { start: "2026-08-01", end: "2026-08-05" },
      actor,
    );

    expect(preview.items[0]).toEqual(
      expect.objectContaining({
        dailyRate: "1000.00",
        grossAmount: "2300.00",
        rateBreakdown: [
          expect.objectContaining({
            dailyRate: "800.00",
            grossAmount: "800.00",
          }),
          expect.objectContaining({
            dailyRate: "1000.00",
            grossAmount: "1500.00",
          }),
        ],
      }),
    );
  });

  it("confirms a batch from a ready derived preview", async () => {
    attendanceService.calculateWagePeriod.mockResolvedValue([
      {
        workerAssignmentId: "assignment-id",
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        dailyRate: "800.00",
        presentDays: 2,
        halfDays: 1,
        absentDays: 1,
      },
    ]);
    wagesRepo.findActiveBatchForPeriod.mockResolvedValue(null);
    wagesRepo.createBatch.mockResolvedValue({ id: "batch-id" } as any);

    await expect(
      service.createBatch(
        organizationId,
        projectId,
        { periodStart: "2026-08-01", periodEnd: "2026-08-05" },
        actor,
      ),
    ).resolves.toEqual({ id: "batch-id" });
    expect(wagesRepo.createBatch).toHaveBeenCalledWith(
      organizationId,
      projectId,
      "2026-08-01",
      "2026-08-05",
      [expect.objectContaining({ grossAmount: "2000.00" })],
      actor.id,
    );
  });

  it("keeps batch confirmation blocked when an assignment rate is missing", async () => {
    attendanceService.calculateWagePeriod.mockResolvedValue([
      {
        workerAssignmentId: "assignment-id",
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        dailyRate: null,
        presentDays: 2,
        halfDays: 0,
        absentDays: 0,
      },
    ]);
    wagesRepo.findActiveBatchForPeriod.mockResolvedValue(null);

    await expect(
      service.createBatch(
        organizationId,
        projectId,
        { periodStart: "2026-08-01", periodEnd: "2026-08-05" },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "WAGE_BATCH_NOT_READY" } });
    expect(wagesRepo.createBatch).not.toHaveBeenCalled();
  });

  it("rejects a batch when an active batch overlaps the selected period", async () => {
    wagesRepo.findActiveBatchForPeriod.mockResolvedValue("existing-batch-id");

    await expect(
      service.createBatch(
        organizationId,
        projectId,
        { periodStart: "2026-08-01", periodEnd: "2026-08-05" },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "WAGE_BATCH_DUPLICATE" } });
    expect(attendanceService.calculateWagePeriod).not.toHaveBeenCalled();
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

  it("cancels an unpaid batch with the dedicated permission", async () => {
    wagesRepo.cancelBatch.mockResolvedValue(cancelledDetail);

    await service.cancelBatch(
      organizationId,
      projectId,
      "00000000-0000-4000-8000-000000000040",
      { reason: " Attendance correction " },
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "wages:cancel",
    );
    expect(wagesRepo.cancelBatch).toHaveBeenCalledWith(
      organizationId,
      projectId,
      "00000000-0000-4000-8000-000000000040",
      "Attendance correction",
      actor.id,
    );
  });

  it("returns a stable conflict when a batch already has a payment", async () => {
    wagesRepo.cancelBatch.mockRejectedValue(
      new Error("WAGE_BATCH_HAS_PAYMENTS"),
    );

    await expect(
      service.cancelBatch(
        organizationId,
        projectId,
        "00000000-0000-4000-8000-000000000040",
        { reason: "Attendance correction" },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "WAGE_BATCH_HAS_PAYMENTS" } });
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
          notes: 'Site "A"',
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

    expect(result.filename).toBe(
      `wages-${projectId}-2026-08-01-2026-08-20.csv`,
    );
    expect(result.csv).toContain('"Worker Code","Worker Name"');
    expect(result.csv).toContain('"WRK-001","Rajesh Patel"');
    expect(result.csv).toContain('"Payment History"');
    expect(result.csv).toContain('"Site ""A"""');
  });
});
