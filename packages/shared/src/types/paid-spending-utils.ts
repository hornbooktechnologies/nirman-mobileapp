import type {
  PaymentLedger,
  SourcePayment,
  TotalExpensesQuery,
} from "./total-expenses";

/** Definite conflicts need a fresh ledger; uncertain delivery keeps the original command. */
export function sourcePaymentFailure(status?: number, code?: string) {
  if (status === 401 || status === 403 || code === "PROJECT_STATUS_INVALID")
    return "denied";
  if (
    status === 409 ||
    ["PAYMENT_SOURCE_INVALID", "PAYMENT_COST_REQUIRED"].includes(code ?? "")
  )
    return "stale";
  return !status || status === 408 || status >= 500 ? "uncertain" : "rejected";
}
/** Exact monetary arithmetic. Write DTOs bound individual inputs; aggregate totals may be larger. */
export function moneyPaise(value: string): bigint {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error("PAYMENT_AMOUNT_INVALID");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  return (
    (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"))) *
    (negative ? -1n : 1n)
  );
}
export function paiseMoney(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const n = value < 0n ? -value : value;
  return `${sign}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function paymentLedger(
  payable: string | null,
  payments: SourcePayment[],
  version: number,
): PaymentLedger {
  const paid = payments
    .filter((p) => !p.voidedAt)
    .reduce((sum, p) => sum + moneyPaise(p.amount), 0n);
  const remaining = payable === null ? null : moneyPaise(payable) - paid;
  return {
    payments,
    version,
    paidAmount: paiseMoney(paid),
    remainingAmount: remaining === null ? null : paiseMoney(remaining),
    paymentStatus:
      paid === 0n ? "UNPAID" : remaining === 0n ? "PAID" : "PARTIALLY_PAID",
  };
}
export function calendarToday(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function isCalendarDate(value: string): boolean {
  return (
    Number(value.slice(0, 4)) >= 1000 &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export type SpendingPeriod =
  "THIS_MONTH" | "PREVIOUS_MONTH" | "YEAR" | "CUSTOM" | "ALL_TIME";
export function spendingRange(
  period: SpendingPeriod,
  timezone: string,
  year?: number,
): TotalExpensesQuery {
  if (period === "ALL_TIME" || period === "CUSTOM") return {};
  const today = calendarToday(timezone);
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  if (period === "YEAR")
    return { startDate: `${year ?? y}-01-01`, endDate: `${year ?? y}-12-31` };
  if (period === "PREVIOUS_MONTH" && --m === 0) {
    m = 12;
    y--;
  }
  const month = `${y}-${String(m).padStart(2, "0")}`;
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${new Date(Date.UTC(y, m, 0)).getUTCDate()}`,
  };
}
