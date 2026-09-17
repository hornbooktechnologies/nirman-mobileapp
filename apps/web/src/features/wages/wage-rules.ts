import type { WageBatchDetail, WageItem, WagePaymentMethod } from "@nirman-app/shared";

export type WagePaymentAttempt = {
  wageItemId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: WagePaymentMethod;
  reference: string | null;
  idempotencyKey: string;
};

export function retainPaymentAttempt(previous: WagePaymentAttempt | null, input: Omit<WagePaymentAttempt, "idempotencyKey">, createKey: () => string): WagePaymentAttempt {
  return previous ?? { ...input, idempotencyKey: createKey() };
}

export function canCancelWageBatch(batch: WageBatchDetail) {
  return batch.status !== "CANCELLED" && batch.payments.length === 0 && Number(batch.totals.paidAmount) === 0;
}

export function paymentValidation(amount: string, item?: WageItem | null) {
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return "Enter a positive amount with up to two decimal places.";
  }
  if (!item) return "Select a worker.";
  // Compare paise for validation only. Displayed totals always come from the API.
  if (Math.round(Number(amount) * 100) > Math.round(Number(item.netAmount) * 100) - Math.round(Number(item.paidAmount) * 100)) {
    return "Amount exceeds the remaining payable amount.";
  }
  return "";
}

export function isUncertainPaymentFailure(statusCode?: number) {
  return !statusCode || statusCode >= 500 || statusCode === 408;
}

export function effectiveWageProject<T extends { id: string; permissions: readonly string[] }>(projects: readonly T[], projectId: string) {
  const project = projects.find(candidate => candidate.id === projectId);
  return project?.permissions.includes("wages:read") ? project : undefined;
}
