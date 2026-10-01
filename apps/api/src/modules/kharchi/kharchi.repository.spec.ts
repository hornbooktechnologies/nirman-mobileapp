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

  it("returns readable people and assignment context without replacing historical IDs", async () => {
    database.query
      .mockResolvedValueOnce([
        {
          id: "advance-id",
          organization_id: "org-id",
          project_id: "project-id",
          worker_assignment_id: "assignment-id",
          worker_id: "worker-id",
          worker_name: "Raman",
          worker_code: "W-001",
          trade: "Mason",
          project_name: "A Test V",
          assignment_starts_on: "2026-09-01",
          assignment_ends_on: null,
          recorded_by: "recorder-id",
          recorded_by_name: "Nishant",
          amount: "1000.00",
          adjustment_amount: "-800.00",
          deducted_amount: "0.00",
          request_date: "2026-09-30",
          paid_at: "2026-09-30",
          created_at: "2026-09-30",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "adjustment-id",
          kharchi_advance_id: "advance-id",
          amount: "-800.00",
          reason: "Cut",
          recorded_by: "recorder-id",
          recorded_by_name: "Nishant",
          created_at: "2026-10-01",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "allocation-id",
          kharchi_advance_id: "advance-id",
          wage_item_id: "item-id",
          wage_batch_id: "batch-id",
          deduction_amount: "200.00",
          deducted_at: "2026-09-30",
          recorded_by: "recorder-id",
          recorded_by_name: "Nishant",
          reversed_at: "2026-10-01",
          reversed_by: "reverser-id",
          reversed_by_name: null,
          reversal_reason: "Batch cancelled",
        },
      ] as never);

    const detail = await repository.findDetail(
      "org-id",
      "project-id",
      "advance-id",
    );
    expect(detail).toMatchObject({
      recordedBy: "recorder-id",
      recordedByName: "Nishant",
      workerAssignmentId: "assignment-id",
      projectName: "A Test V",
      assignmentStartsOn: "2026-09-01",
      assignmentEndsOn: null,
      effectiveAmount: "200.00",
      outstandingAmount: "200.00",
      adjustments: [{ recordedBy: "recorder-id", recordedByName: "Nishant" }],
      deductionAllocations: [
        {
          recordedByName: "Nishant",
          reversedBy: "reverser-id",
          reversedByName: null,
        },
      ],
    });
    for (const call of database.query.mock.calls) {
      expect(call[1]).toEqual(["org-id", "project-id", "advance-id"]);
    }
    expect(database.execute).not.toHaveBeenCalled();
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

  it("records immutable reversals for a cancelled Wage batch", async () => {
    database.query.mockResolvedValueOnce([
      {
        id: "allocation-id",
        kharchi_advance_id: "advance-id",
        wage_item_id: "wage-item-id",
        deduction_amount: "250.00",
      },
    ] as never);

    await expect(
      repository.reverseAllocationsForWageBatch(
        {
          organizationId: "organization-id",
          projectId: "project-id",
          wageBatchId: "wage-batch-id",
          reason: "Attendance correction",
          actorId: "actor-id",
        },
        {} as DatabaseTransaction,
      ),
    ).resolves.toBe(1);
    expect(database.execute).toHaveBeenCalledWith(
      expect.stringContaining(
        "INSERT INTO kharchi_deduction_allocation_reversals",
      ),
      expect.arrayContaining(["allocation-id", "Attendance correction"]),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "kharchi.deduction-reversed" }),
      expect.anything(),
    );
  });
});
