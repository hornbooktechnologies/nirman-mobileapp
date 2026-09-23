import type { WageItem, WagePreviewItem } from "@nirman-app/shared";

type RateItem = WageItem | WagePreviewItem;

export function wageRateLabel(item: RateItem, confirmed: boolean) {
  const rates = item.rateBreakdown ?? [];
  if (rates.length > 1) return confirmed ? "Multiple saved rates" : "Multiple period rates";
  if (rates.length === 1 && rates[0].dailyRate !== null) {
    return confirmed ? "Saved calculation rate" : "Period calculation rate";
  }
  if (item.dailyRate === null) return "Rate unavailable";
  return confirmed ? "Saved representative rate" : "Representative period rate";
}

export function wageBalanceLabel(item: WageItem) {
  if (item.paymentStatus === "PAID") return "Paid in full";
  return item.paymentStatus === "PARTIALLY_PAID" ? "Partially paid" : "Unpaid";
}

export function wageDirectSelection(batchId?: string, wageItemId?: string) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!batchId || !uuid.test(batchId)) return { batchId: undefined, wageItemId: undefined };
  return { batchId, wageItemId: wageItemId && uuid.test(wageItemId) ? wageItemId : undefined };
}

export function selectedWageItem(items: readonly WageItem[] | undefined, selectedBatchId: string | null, selectedItemId: string, initialBatchId?: string, initialWageItemId?: string) {
  const id = selectedItemId || (selectedBatchId === initialBatchId ? initialWageItemId : undefined);
  return items?.find(item => item.id === id && item.wageBatchId === selectedBatchId) ?? null;
}
