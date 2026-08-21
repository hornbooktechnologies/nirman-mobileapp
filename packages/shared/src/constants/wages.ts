export const WAGE_BATCH_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
] as const;

export type WageBatchStatus = (typeof WAGE_BATCH_STATUSES)[number];

export const WAGE_PAYMENT_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
] as const;

export type WagePaymentStatus = (typeof WAGE_PAYMENT_STATUSES)[number];

export const WAGE_PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;

export type WagePaymentMethod = (typeof WAGE_PAYMENT_METHODS)[number];
