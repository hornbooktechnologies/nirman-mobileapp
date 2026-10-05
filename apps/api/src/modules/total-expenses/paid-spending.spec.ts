import {
  sourcePaymentFailure,
  moneyPaise,
  paiseMoney,
  paymentLedger,
  spendingRange,
  isCalendarDate,
  type SourcePayment,
} from "@nirman-app/shared";
const payment = (
  amount: string,
  voidedAt: string | null = null,
): SourcePayment => ({
  id: amount,
  amount,
  paymentDate: "2026-09-20",
  paymentMethod: "CASH",
  reference: null,
  recordedBy: "Owner",
  recordedAt: "2026-09-20",
  voidedAt,
  voidedBy: null,
  voidReason: null,
});
describe("paid spending money and calendar rules", () => {
  it("adds decimal fractions and large amounts without float loss", () => {
    expect(paiseMoney(moneyPaise("0.10") + moneyPaise("0.20"))).toBe("0.30");
    expect(paiseMoney(moneyPaise("999999999999.99") - moneyPaise("0.01"))).toBe(
      "999999999999.98",
    );
  });
  it("excludes voided payment and preserves it in history", () => {
    const l = paymentLedger(
      "1000.00",
      [payment("200.00"), payment("500.00", "2026-10-01")],
      3,
    );
    expect(l.paidAmount).toBe("200.00");
    expect(l.remainingAmount).toBe("800.00");
    expect(l.paymentStatus).toBe("PARTIALLY_PAID");
    expect(l.payments).toHaveLength(2);
  });
  it("replacement settles without counting voided original", () => {
    const l = paymentLedger(
      "100.00",
      [payment("100.00", "2026-10-01"), payment("100.00")],
      4,
    );
    expect(l.paidAmount).toBe("100.00");
    expect(l.paymentStatus).toBe("PAID");
  });
  it("unknown purchase cost is never treated as a payable zero", () => {
    expect(paymentLedger(null, [], 1)).toMatchObject({
      remainingAmount: null,
      paidAmount: "0.00",
      paymentStatus: "UNPAID",
    });
  });
  it.each(["2026-02-30", "2026-13-01", "2026-09-22T12:00:00Z"])(
    "rejects invalid calendar date %s",
    (d) => expect(isCalendarDate(d)).toBe(false),
  );
  it("handles January previous month and leap February", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T02:00:00Z"));
    expect(spendingRange("PREVIOUS_MONTH", "Asia/Kolkata")).toEqual({
      startDate: "2025-12-01",
      endDate: "2025-12-31",
    });
    jest.setSystemTime(new Date("2024-02-22T02:00:00Z"));
    expect(spendingRange("THIS_MONTH", "Asia/Kolkata")).toEqual({
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
    jest.useRealTimers();
  });
  it("uses organization timezone at a month boundary", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-01T00:30:00Z"));
    expect(spendingRange("THIS_MONTH", "America/Los_Angeles").startDate).toBe(
      "2026-09-01",
    );
    expect(spendingRange("THIS_MONTH", "Asia/Kolkata").startDate).toBe(
      "2026-10-01",
    );
    jest.useRealTimers();
  });
  it("calendar year is Jan-Dec; all time omits dates", () => {
    expect(spendingRange("YEAR", "Asia/Kolkata", 2025)).toEqual({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(spendingRange("ALL_TIME", "Asia/Kolkata")).toEqual({});
  });
});

describe("shared mobile/web payment recovery", () => {
  it.each([undefined, 408, 500, 503])(
    "retains the original command on uncertain HTTP %s",
    (status) => {
      expect(sourcePaymentFailure(status)).toBe("uncertain");
    },
  );
  it.each([
    "PAYMENT_VERSION_CONFLICT",
    "PAYMENT_ALREADY_VOIDED",
    "PAYMENT_IDEMPOTENCY_CONFLICT",
  ])("requires fresh ledger review for %s", (code) => {
    expect(sourcePaymentFailure(409, code)).toBe("stale");
  });
  it("blocks removed access and permits correcting definite invalid input", () => {
    expect(sourcePaymentFailure(403)).toBe("denied");
    expect(sourcePaymentFailure(400, "PROJECT_STATUS_INVALID")).toBe("denied");
    expect(sourcePaymentFailure(400, "PAYMENT_SOURCE_INVALID")).toBe("stale");
    expect(sourcePaymentFailure(400, "PAYMENT_AMOUNT_INVALID")).toBe(
      "rejected",
    );
  });
});
