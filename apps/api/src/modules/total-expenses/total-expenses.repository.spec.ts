/* eslint-disable @typescript-eslint/unbound-method */
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import { TotalExpensesRepository } from "./total-expenses.repository";
import { TotalExpensesQueryDto } from "./total-expenses.dto";
describe("report snapshot and financial query scope", () => {
  const c = {} as DatabaseTransaction;
  const db = {
    transaction: jest.fn((f: (c: DatabaseTransaction) => Promise<unknown>) =>
      f(c),
    ),
    query: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const repo = new TotalExpensesRepository(db);
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
  });
  it("binds dates and tenant/source scope consistently for count and grouped page", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }] as Awaited<
        ReturnType<typeof db.query>
      >)
      .mockResolvedValueOnce([
        {
          source: "MATERIALS",
          id: "purchase",
          periodPaidAmount: "25.00",
          lifetimePaidAmount: "75.00",
          remainingAmount: "25.00",
          latestPaymentDate: "2026-09-22",
        },
      ] as Awaited<ReturnType<typeof db.query>>);
    const q = Object.assign(new TotalExpensesQueryDto(), {
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      source: "MATERIALS",
      page: 2,
    });
    const result = await repo.list("org", "project", q);
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), true);
    const params = [
      "2026-09-01",
      "2026-09-30",
      "2026-09-01",
      "2026-09-30",
      "org",
      "project",
    ];
    expect(db.query.mock.calls.map((call) => call[1])).toEqual([
      params,
      params,
    ]);
    expect(db.query.mock.calls.every((call) => call[2] === c)).toBe(true);
    expect(db.query.mock.calls[1][0]).toContain("GROUP BY source,id HAVING");
    expect(db.query.mock.calls[1][0]).toContain(
      "ORDER BY latestPaymentDate DESC,source ASC,id ASC LIMIT 20 OFFSET 20",
    );
    expect(result.items[0].periodPaidAmount).toBe("25.00");
    expect(result.items[0].lifetimePaidAmount).toBe("75.00");
  });
  it("summary retains all sources regardless of selected card category, with inclusive payment dates", async () => {
    db.query.mockResolvedValueOnce([
      {
        month: "2026-09",
        totalPaid: "30.00",
        wagesPaid: "10.00",
        materialsPaid: "15.00",
        siteExpensesPaid: "5.00",
      },
    ] as never);
    const result = await repo.summary(
      "org",
      "project",
      Object.assign(new TotalExpensesQueryDto(), {
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        source: "MATERIALS",
      }),
    );
    expect(db.query.mock.calls[0][1]).toEqual([
      "org",
      "project",
      "2026-09-01",
      "2026-09-30",
      "org",
      "project",
      "2026-09-01",
      "2026-09-30",
      "org",
      "project",
      "2026-09-01",
      "2026-09-30",
    ]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result.totalPaid).toBe("30.00");
    expect(result.materialsPaid).toBe("15.00");
    expect(db.query.mock.calls[0][0]).not.toContain("net_amount");
    expect(db.query.mock.calls[0][0]).not.toContain("WHERE source=?");
    expect(db.query.mock.calls[0][0]).toContain(
      "p.payment_date BETWEEN ? AND ?",
    );
    expect(db.query.mock.calls[0][0]).toContain(
      "wb.status IN ('CONFIRMED','PARTIALLY_PAID','PAID')",
    );
    expect(db.query.mock.calls[0][0]).toContain("v.id IS NULL");
  });
  it("all-time reads omit date parameters and still group before pagination", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 0 }] as Awaited<
        ReturnType<typeof db.query>
      >)
      .mockResolvedValueOnce([]);
    const result = await repo.list(
      "org",
      "project",
      new TotalExpensesQueryDto(),
    );
    expect(db.query.mock.calls[0][1]).toEqual([
      "org",
      "project",
      "org",
      "project",
      "org",
      "project",
    ]);
    expect(result).toMatchObject({
      items: [],
      pagination: { total: 0, totalPages: 0 },
    });
  });
});
