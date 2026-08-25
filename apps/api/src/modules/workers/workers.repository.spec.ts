/* eslint-disable @typescript-eslint/unbound-method */
import type { ResultSetHeader } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import { WorkersRepository } from "./workers.repository";

describe("WorkersRepository", () => {
  const database = {
    query: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const repository = new WorkersRepository(database);

  beforeEach(() => {
    jest.clearAllMocks();
    database.transaction.mockImplementation(async (callback) =>
      callback({} as DatabaseTransaction),
    );
  });

  it("filters the default project roster to active current workers and assignments", async () => {
    database.query.mockResolvedValue([]);

    await repository.findProjectRoster("organization-id", "project-id", {});

    const rosterSql = database.query.mock.calls[0]?.[0];
    const countSql = database.query.mock.calls[1]?.[0];
    for (const sql of [rosterSql, countSql]) {
      expect(sql).toContain("w.status = 'ACTIVE'");
      expect(sql).toContain("wpa.status = 'ACTIVE'");
      expect(sql).toContain("wpa.starts_on <= CURRENT_DATE()");
      expect(sql).toContain(
        "(wpa.ends_on IS NULL OR wpa.ends_on >= CURRENT_DATE())",
      );
    }
  });

  it("includes scheduled active assignments for the management roster", async () => {
    database.query.mockResolvedValue([]);

    await repository.findProjectRoster("organization-id", "project-id", {
      assignmentScope: "ALL_ACTIVE",
    });

    const rosterSql = database.query.mock.calls[0]?.[0];
    expect(rosterSql).toContain("wpa.status = 'ACTIVE'");
    expect(rosterSql).not.toContain("wpa.starts_on <= CURRENT_DATE()");
    expect(rosterSql).not.toContain("wpa.ends_on >= CURRENT_DATE()");
  });

  it("uses the requested historical date for a selected-date roster", async () => {
    database.query.mockResolvedValue([]);

    await repository.findProjectRoster("organization-id", "project-id", {
      date: "2026-07-15",
    });

    const rosterSql = database.query.mock.calls[0]?.[0];
    const rosterParams = database.query.mock.calls[0]?.[1];
    expect(rosterSql).toContain("wpa.starts_on <= ?");
    expect(rosterSql).toContain("wpa.ends_on >= ?");
    expect(rosterSql).not.toContain("CURRENT_DATE()");
    expect(rosterParams).toEqual(
      expect.arrayContaining(["2026-07-15", "2026-07-15"]),
    );
  });

  it("retries a worker-code collision and returns the created worker", async () => {
    let allocation = 0;
    database.query.mockImplementation((sql: string) => {
      if (sql.includes("AS nextNumber")) {
        allocation += 1;
        return Promise.resolve([{ nextNumber: allocation }] as never);
      }
      if (sql.includes("FROM workers w")) {
        return Promise.resolve([
          workerRow(`WRK-${String(allocation).padStart(5, "0")}`),
        ] as never);
      }
      return Promise.resolve([] as never);
    });
    database.execute
      .mockRejectedValueOnce({
        code: "ER_DUP_ENTRY",
        sqlMessage:
          "Duplicate entry for key 'uq_workers_organization_worker_code'",
      })
      .mockResolvedValue(result(1));

    const created = await repository.create(
      "organization-id",
      { name: "Ravi", trade: "Mason" },
      "actor-id",
    );

    expect(database.transaction).toHaveBeenCalledTimes(2);
    expect(created?.workerCode).toBe("WRK-00002");
  });

  it("does not retry an unrelated duplicate-key error", async () => {
    database.query.mockResolvedValue([{ nextNumber: 1 }] as never);
    database.execute.mockRejectedValueOnce({
      code: "ER_DUP_ENTRY",
      sqlMessage: "Duplicate entry for key 'another_key'",
    });

    await expect(
      repository.create(
        "organization-id",
        { name: "Ravi", trade: "Mason" },
        "actor-id",
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "ER_DUP_ENTRY" }));
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });

  it("serializes assignment creation and rejects a concurrent active duplicate", async () => {
    database.query
      .mockResolvedValueOnce([{ id: "worker-id" }] as never)
      .mockResolvedValueOnce([{ id: "assignment-id" }] as never);

    await expect(
      repository.assignWorker(
        "organization-id",
        "project-id",
        "worker-id",
        {},
        "actor-id",
      ),
    ).resolves.toBeNull();

    expect(database.query.mock.calls[0]?.[0]).toContain("FOR UPDATE");
    expect(database.execute).not.toHaveBeenCalled();
  });

  it("copies the Worker base daily rate into a new Project assignment", async () => {
    database.query
      .mockResolvedValueOnce([
        { id: "worker-id", base_daily_rate: "750.00" },
      ] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
    database.execute.mockResolvedValue(result(1));

    await repository.assignWorker(
      "organization-id",
      "project-id",
      "worker-id",
      { startsOn: "2026-08-17" },
      "actor-id",
    );

    const assignmentParams = database.execute.mock.calls[0]?.[1];
    expect(assignmentParams?.[4]).toBeNull();
    expect(assignmentParams?.[5]).toBe("750.00");
    expect(assignmentParams?.[6]).toBe("2026-08-17");
  });

  it("normalizes mobile digits before duplicate comparison", async () => {
    database.query.mockResolvedValue([]);

    await repository.duplicateCandidates(
      "organization-id",
      "Ravi",
      "+91 99999-99999",
    );

    expect(database.query.mock.calls[0]?.[1]).toContain("9999999999");
  });
});

function result(affectedRows: number) {
  return { affectedRows } as ResultSetHeader;
}

function workerRow(workerCode: string) {
  return {
    id: "worker-id",
    organization_id: "organization-id",
    worker_code: workerCode,
    name: "Ravi",
    trade: "Mason",
    base_daily_rate: "750.00",
    mobile_number: null,
    notes: null,
    status: "ACTIVE",
    created_by: "actor-id",
    updated_by: "actor-id",
    created_at: new Date("2026-08-01T00:00:00.000Z"),
    updated_at: new Date("2026-08-01T00:00:00.000Z"),
    deactivated_at: null,
    deactivated_by: null,
    activeAssignmentCount: 0,
  };
}
