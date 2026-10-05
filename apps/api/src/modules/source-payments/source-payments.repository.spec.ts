/* eslint-disable @typescript-eslint/unbound-method */
import { createHash } from "node:crypto";
import type { DatabaseTransaction } from "../../database/database.types";
import { DatabaseService } from "../../database/database.service";
import { AuditService } from "../audit/audit.service";
import { SourcePaymentsRepository } from "./source-payments.repository";
import type { RecordPaymentDto } from "./source-payments.dto";
const c = {} as DatabaseTransaction;
describe("source payment transaction guards", () => {
  const db = {
    transaction: jest.fn((f: (c: DatabaseTransaction) => Promise<unknown>) =>
      f(c),
    ),
    query: jest.fn(),
    execute: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
  const repo = new SourcePaymentsRepository(db, audit);
  const dto: RecordPaymentDto = {
    amount: "50.00",
    paymentDate: "2026-09-20",
    paymentMethod: "CASH",
    expectedVersion: 3,
    idempotencyKey: "payment-key-001",
  };
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    db.query.mockResolvedValue([]);
    jest.spyOn(repo, "source").mockResolvedValue({
      id: "expense",
      version: 3,
      payable: "100.00",
      status: "APPROVED",
    } as Awaited<ReturnType<typeof repo.source>>);
    jest.spyOn(repo, "ledger").mockResolvedValue({
      payments: [],
      paidAmount: "80.00",
      remainingAmount: "20.00",
      paymentStatus: "PARTIALLY_PAID",
      version: 3,
    });
  });
  it("locks source before rejecting overpayment without payment/audit writes", async () => {
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        dto,
      ),
    ).rejects.toThrow("Payment must be positive");
    expect(repo.source).toHaveBeenCalledWith(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      c,
      true,
    );
    expect(db.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
  it("rejects stale versions before writing", async () => {
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        { ...dto, expectedVersion: 2 },
      ),
    ).rejects.toThrow("Record changed");
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("replays exact command after version changes without another payment or audit", async () => {
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          source: "expenses",
          org: "org",
          project: "project",
          id: "expense",
          parent: null,
          paymentId: null,
          ...dto,
        }),
      )
      .digest("hex");
    db.query.mockResolvedValue([
      { request_fingerprint: fingerprint },
    ] as Awaited<ReturnType<typeof db.query>>);
    jest.mocked(repo.source).mockResolvedValue({
      id: "expense",
      version: 4,
      payable: "100.00",
      status: "APPROVED",
    } as Awaited<ReturnType<typeof repo.source>>);
    await repo.command(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      "owner",
      dto,
    );
    expect(db.execute).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
  it("rejects retry key reused with changed input", async () => {
    db.query.mockResolvedValue([
      { request_fingerprint: "different" },
    ] as Awaited<ReturnType<typeof db.query>>);
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        dto,
      ),
    ).rejects.toThrow("Retry key conflicts");
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("requires approved expense and known material cost", async () => {
    jest.mocked(repo.source).mockResolvedValue({
      id: "expense",
      version: 3,
      payable: "100.00",
      status: "PENDING_APPROVAL",
    } as Awaited<ReturnType<typeof repo.source>>);
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        dto,
      ),
    ).rejects.toThrow("Only approved");
    jest.mocked(repo.source).mockResolvedValue({
      id: "request",
      version: 3,
      payable: null,
      status: "PURCHASED",
    } as Awaited<ReturnType<typeof repo.source>>);
    await expect(
      repo.command(
        "materials",
        "org",
        "project",
        "purchase",
        "request",
        "owner",
        dto,
      ),
    ).rejects.toThrow("purchase total is required");
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("inserts payment, increments version and audits on the same transaction connection", async () => {
    jest.mocked(repo.ledger).mockResolvedValue({
      payments: [],
      paidAmount: "0.00",
      remainingAmount: "100.00",
      paymentStatus: "UNPAID",
      version: 3,
    });
    await repo.command(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      "owner",
      dto,
    );
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(db.execute.mock.calls.every((call) => call[2] === c)).toBe(true);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "expenses.payment.recorded",
        actorUserId: "owner",
      }),
      c,
    );
  });
  it("rejects payment from another source and already voided records", async () => {
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        {
          expectedVersion: 3,
          idempotencyKey: "void-key-001",
          reason: "Wrong payment",
        },
        "foreign-payment",
      ),
    ).rejects.toThrow("Payment not found");
    jest.mocked(repo.ledger).mockResolvedValue({
      payments: [{ id: "payment", voidedAt: "2026-09-21" }] as never,
      paidAmount: "0.00",
      remainingAmount: "100.00",
      paymentStatus: "UNPAID",
      version: 3,
    });
    await expect(
      repo.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        "owner",
        {
          expectedVersion: 3,
          idempotencyKey: "void-key-001",
          reason: "Wrong payment",
        },
        "payment",
      ),
    ).rejects.toThrow("already voided");
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("void appends a correction without deleting original and records mandatory reason", async () => {
    jest.mocked(repo.ledger).mockResolvedValue({
      payments: [{ id: "payment", voidedAt: null }] as never,
      paidAmount: "50.00",
      remainingAmount: "50.00",
      paymentStatus: "PARTIALLY_PAID",
      version: 3,
    });
    await repo.command(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      "owner",
      {
        expectedVersion: 3,
        idempotencyKey: "void-key-001",
        reason: "Wrong amount",
      },
      "payment",
    );
    expect(db.execute.mock.calls[0][0]).toContain(
      "INSERT INTO site_expense_payments_voids",
    );
    expect(
      db.execute.mock.calls.some((call) =>
        /DELETE|UPDATE site_expense_payments /.test(call[0]),
      ),
    ).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { paymentId: "payment", reason: "Wrong amount" },
      }),
      c,
    );
  });
});

describe("payment tracking pre-rollout compatibility", () => {
  it("marks details unavailable when a new payment table is missing", async () => {
    const db = {
      query: jest.fn().mockRejectedValue({
        code: "ER_NO_SUCH_TABLE",
        sqlMessage: "Table 'fixture.material_purchase_payments' does not exist",
      }),
    } as unknown as DatabaseService;
    const repo = new SourcePaymentsRepository(db, {} as AuditService);
    await expect(
      repo.ledger("materials", "org", "project", "purchase", "100.00", 1),
    ).resolves.toMatchObject({ paymentTrackingAvailable: false, payments: [] });
  });
  it("does not hide unrelated database faults as missing payment setup", async () => {
    const fault = {
      code: "ER_NO_SUCH_TABLE",
      sqlMessage: "Table 'fixture.user' does not exist",
    };
    const db = {
      query: jest.fn().mockRejectedValue(fault),
    } as unknown as DatabaseService;
    const repo = new SourcePaymentsRepository(db, {} as AuditService);
    await expect(
      repo.ledger("materials", "org", "project", "purchase", "100.00", 1),
    ).rejects.toBe(fault);
  });
});

describe("batched payment ledgers", () => {
  it("groups purchase histories once, excludes voids and keeps unknown costs", async () => {
    const db = {
      query: jest.fn().mockResolvedValue([
        {
          sourceId: "one",
          id: "p1",
          amount: "0.10",
          recordedAt: new Date(),
          voidedAt: null,
        },
        {
          sourceId: "two",
          id: "p2",
          amount: "10.00",
          recordedAt: new Date(),
          voidedAt: null,
        },
        {
          sourceId: "one",
          id: "p3",
          amount: "2.00",
          recordedAt: new Date(),
          voidedAt: new Date(),
        },
      ]),
    } as unknown as jest.Mocked<DatabaseService>;
    const repo = new SourcePaymentsRepository(db, {} as AuditService);
    const values = await repo.ledgers("materials", "org", "project", [
      { id: "one", payable: "2.00", version: 2 },
      { id: "two", payable: null, version: 2 },
    ]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(["org", "project", "one", "two"]);
    expect(values.get("one")?.paidAmount).toBe("0.10");
    expect(values.get("one")?.remainingAmount).toBe("1.90");
    expect(values.get("two")?.paidAmount).toBe("10.00");
    expect(values.get("two")?.remainingAmount).toBeNull();
    expect(values.get("one")?.payments).toHaveLength(2);
  });
});
