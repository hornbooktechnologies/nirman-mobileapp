import type { KharchiBalanceStatus, KharchiPaymentMethod } from "@nirman-app/shared";

// Keep user-facing vocabulary aligned with Mobile's English Kharchi locale.
export const kharchiStatusLabels: Record<KharchiBalanceStatus, string> = {
  PAID: "Deduction pending",
  PARTIALLY_DEDUCTED: "Partly deducted",
  DEDUCTED: "Fully deducted",
};

export const kharchiPaymentMethodLabels: Record<KharchiPaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};
