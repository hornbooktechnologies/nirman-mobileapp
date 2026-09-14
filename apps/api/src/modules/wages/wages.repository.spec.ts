/* eslint-disable @typescript-eslint/unbound-method */
import type { ResultSetHeader } from "mysql2/promise";
import type { WageBatchDetail } from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { KharchiRepository } from "../kharchi/kharchi.repository";
import { WagesRepository } from "./wages.repository";

describe("WagesRepository cancellation", () => {
  const database = {
    query: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const kharchiRepository = {
    reverseAllocationsForWageBatch: jest.fn(),
  } as unknown as jest.Mocked<KharchiRepository>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const repository = new WagesRepository(database, kharchiRepository, audit);
  const cancelledDetail: WageBatchDetail = {
    id: "batch-id",
    organizationId: "organization-id",
    projectId: "project-id",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-14",
    status: "CANCELLED",
    generatedBy: "actor-id",
    cancellationReason: "Correction",
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    database.transaction.mockImplementation(async (callback) =>
      callback({} as DatabaseTransaction),
    );
    database.execute.mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
    kharchiRepository.reverseAllocationsForWageBatch.mockResolvedValue(2);
    audit.record.mockResolvedValue("00000000-0000-4000-8000-000000000099");
  });

  it("cancels an unpaid batch and reverses Kharchi allocations atomically", async () => {
    database.query
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "batch-id", status: "CONFIRMED" }] as never)
      .mockResolvedValueOnce([] as never);
    jest
      .spyOn(repository, "findBatchDetail")
      .mockResolvedValue(cancelledDetail);

    await expect(
      repository.cancelBatch(
        "organization-id",
        "project-id",
        "batch-id",
        "Correction",
        "actor-id",
      ),
    ).resolves.toEqual(expect.objectContaining({ status: "CANCELLED" }));

    expect(
      kharchiRepository.reverseAllocationsForWageBatch,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        wageBatchId: "batch-id",
        reason: "Correction",
      }),
      expect.anything(),
    );
    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CANCELLED'"),
      ["actor-id", "Correction", "batch-id", "organization-id", "project-id"],
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "wages.batch-cancelled",
        entityId: "batch-id",
      }),
      expect.anything(),
    );
  });

  it("rejects cancellation when any payment exists", async () => {
    database.query
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { id: "batch-id", status: "PARTIALLY_PAID" },
      ] as never)
      .mockResolvedValueOnce([{ id: "payment-id" }] as never);

    await expect(
      repository.cancelBatch(
        "organization-id",
        "project-id",
        "batch-id",
        "Correction",
        "actor-id",
      ),
    ).rejects.toThrow("WAGE_BATCH_HAS_PAYMENTS");
    expect(
      kharchiRepository.reverseAllocationsForWageBatch,
    ).not.toHaveBeenCalled();
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("returns an already-cancelled batch without duplicating side effects", async () => {
    database.query
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { id: "batch-id", status: "CANCELLED" },
      ] as never);
    jest
      .spyOn(repository, "findBatchDetail")
      .mockResolvedValue(cancelledDetail);

    await expect(
      repository.cancelBatch(
        "organization-id",
        "project-id",
        "batch-id",
        "Correction",
        "actor-id",
      ),
    ).resolves.toEqual(expect.objectContaining({ status: "CANCELLED" }));
    expect(
      kharchiRepository.reverseAllocationsForWageBatch,
    ).not.toHaveBeenCalled();
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
