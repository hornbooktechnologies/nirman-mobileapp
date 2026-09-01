/* eslint-disable @typescript-eslint/unbound-method */
import type { ResultSetHeader } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { KharchiRepository } from "./kharchi.repository";

describe("KharchiRepository", () => {
  const database = {
    query: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const audit = {
    record: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
  const repository = new KharchiRepository(database, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    database.transaction.mockImplementation(async (callback) =>
      callback({} as DatabaseTransaction),
    );
    database.execute.mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
    audit.record.mockResolvedValue("00000000-0000-4000-8000-000000000099");
  });

  it("allocates oldest outstanding advances first and caps at Wage payable", async () => {
    database.query
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { id: "advance-1" },
        { id: "advance-2" },
      ] as never)
      .mockResolvedValueOnce([
        {
          amount: "500.00",
          adjustment_amount: "0.00",
          deducted_amount: "100.00",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          amount: "800.00",
          adjustment_amount: "0.00",
          deducted_amount: "0.00",
        },
      ] as never);

    await expect(
      repository.allocateForWageItem(
        {
          organizationId: "organization-id",
          projectId: "project-id",
          workerId: "worker-id",
          wageItemId: "wage-item-id",
          wageBatchId: "wage-batch-id",
          maximumDeduction: "650.00",
          actorId: "actor-id",
        },
        {} as DatabaseTransaction,
      ),
    ).resolves.toBe("650.00");

    const allocationCalls = database.execute.mock.calls.filter(([sql]) =>
      sql.includes("INSERT INTO kharchi_deduction_allocations"),
    );
    expect(allocationCalls).toHaveLength(2);
    expect(allocationCalls[0]?.[1]).toEqual(
      expect.arrayContaining(["advance-1", "400.00"]),
    );
    expect(allocationCalls[1]?.[1]).toEqual(
      expect.arrayContaining(["advance-2", "250.00"]),
    );
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it("returns existing Wage allocations without inserting duplicates", async () => {
    database.query.mockResolvedValueOnce([
      { deduction_amount: "100.00" },
      { deduction_amount: "50.00" },
    ] as never);

    await expect(
      repository.allocateForWageItem(
        {
          organizationId: "organization-id",
          projectId: "project-id",
          workerId: "worker-id",
          wageItemId: "wage-item-id",
          wageBatchId: "wage-batch-id",
          maximumDeduction: "650.00",
          actorId: "actor-id",
        },
        {} as DatabaseTransaction,
      ),
    ).resolves.toBe("150.00");
    expect(database.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
