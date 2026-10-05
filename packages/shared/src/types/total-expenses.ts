import type { ExpenseCategory } from "../constants/expenses";
export type PaidSource = "WAGES" | "MATERIALS" | "SITE_EXPENSES";
export type SpendingSource = PaidSource | "ALL";
export type SourcePaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";
export type SourcePaymentMethod =
  "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";
export type SourcePayment = {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: SourcePaymentMethod;
  reference: string | null;
  recordedBy: string;
  recordedAt: string;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
};
export type PaymentLedger = {
  paymentTrackingAvailable?: boolean;
  payments: SourcePayment[];
  paidAmount: string;
  remainingAmount: string | null;
  paymentStatus: SourcePaymentStatus;
  version: number;
};
export type RecordSourcePayment = {
  amount: string;
  paymentDate: string;
  paymentMethod: SourcePaymentMethod;
  reference?: string;
  expectedVersion: number;
  idempotencyKey: string;
};
export type VoidSourcePayment = {
  reason: string;
  expectedVersion: number;
  idempotencyKey: string;
};
export type TotalExpensesQuery = {
  startDate?: string;
  endDate?: string;
  source?: SpendingSource;
  page?: number;
  pageSize?: number;
};
type SpendingCardBase = {
  id: string;
  title: string;
  subtitle: string;
  periodPaidAmount: string;
  lifetimePaidAmount: string;
  remainingAmount: string;
  paymentStatus: SourcePaymentStatus;
  latestPaymentDate: string;
  detailId: string;
};
export type SpendingCard = SpendingCardBase &
  (
    | { source: "WAGES"; periodStart: string; periodEnd: string }
    | { source: "MATERIALS"; purchasedOn: string }
    | {
        source: "SITE_EXPENSES";
        category: ExpenseCategory;
        expenseDate: string;
        classificationReview: boolean;
      }
  );
export type TotalExpensesSummary = {
  totalPaid: string;
  wagesPaid: string;
  materialsPaid: string;
  siteExpensesPaid: string;
  months: {
    month: string;
    totalPaid: string;
    wagesPaid: string;
    materialsPaid: string;
    siteExpensesPaid: string;
  }[];
};
export type TotalExpensesList = {
  items: SpendingCard[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export function isPaymentLedgerAvailable(ledger: Partial<PaymentLedger> | null | undefined): boolean {
  return !!ledger && ledger.paymentTrackingAvailable !== false &&
    ["UNPAID", "PARTIALLY_PAID", "PAID"].includes(ledger.paymentStatus ?? "") &&
    Array.isArray(ledger.payments) && typeof ledger.paidAmount === "string" &&
    (ledger.remainingAmount === null || typeof ledger.remainingAmount === "string");
}
