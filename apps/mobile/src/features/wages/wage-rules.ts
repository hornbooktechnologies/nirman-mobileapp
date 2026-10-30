import type { WageItem, WagePaymentMethod } from './types';

export const wageBatchTone = {
  DRAFT: 'warning',
  CONFIRMED: 'warning',
  PARTIALLY_PAID: 'active',
  PAID: 'success',
  CANCELLED: 'neutral',
} as const;

export type WagePaymentAttempt = {
  wageItemId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: WagePaymentMethod;
  reference: string | null;
  idempotencyKey: string;
};

export function retainPaymentAttempt(previous: WagePaymentAttempt | null, input: Omit<WagePaymentAttempt, 'idempotencyKey'>, createKey: () => string): WagePaymentAttempt {
  return previous ?? { ...input, idempotencyKey: createKey() };
}

export function isUncertainPaymentFailure(status?: number) {
  return !status || status >= 500 || status === 408;
}

export function wageItemChanged(saved: WageItem, current?: WageItem) {
  return !current || saved.adjustmentAmount !== current.adjustmentAmount || saved.notes !== current.notes || saved.paidAmount !== current.paidAmount;
}

export function wageToday(timezone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)?.value ?? '').join('-');
}
