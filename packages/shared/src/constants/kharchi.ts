export const KHARCHI_PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "OTHER",
] as const;

export type KharchiPaymentMethod = (typeof KHARCHI_PAYMENT_METHODS)[number];

export const KHARCHI_BALANCE_STATUSES = [
  "PAID",
  "PARTIALLY_DEDUCTED",
  "DEDUCTED",
] as const;

export type KharchiBalanceStatus = (typeof KHARCHI_BALANCE_STATUSES)[number];

export const KHARCHI_AUDIT_ACTIONS = [
  "kharchi.advance-recorded",
  "kharchi.adjustment-recorded",
  "kharchi.deduction-allocated",
] as const;

export type KharchiAuditAction = (typeof KHARCHI_AUDIT_ACTIONS)[number];
