import assert from "node:assert/strict";
import test from "node:test";
import { wageRateLabel, wageBalanceLabel, wageDirectSelection, selectedWageItem } from "./wage-display.ts";
const item = { dailyRate: "800.00", rateBreakdown: [] };

test("historical multi-rate wages never collapse to a current rate", () => {
  assert.equal(wageRateLabel({ ...item, rateBreakdown: [{ dailyRate: "700.00" }, { dailyRate: "800.00" }] }, true), "Multiple saved rates");
  assert.equal(wageRateLabel({ ...item, rateBreakdown: [{ dailyRate: "700.00" }, { dailyRate: "800.00" }] }, false), "Multiple period rates");
  assert.equal(wageRateLabel(item, true), "Saved representative rate");
  assert.equal(wageRateLabel({ dailyRate: null, rateBreakdown: [] }, false), "Rate unavailable");
});

test("payment state is identified separately from net payable", () => {
  assert.equal(wageBalanceLabel({ paymentStatus: "UNPAID" }), "Unpaid");
  assert.equal(wageBalanceLabel({ paymentStatus: "PARTIALLY_PAID" }), "Partially paid");
  assert.equal(wageBalanceLabel({ paymentStatus: "PAID" }), "Paid in full");
});

test("deep links select only a valid item in the requested batch", () => {
  const batchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const itemId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  assert.deepEqual(wageDirectSelection("bad", itemId), { batchId: undefined, wageItemId: undefined });
  assert.deepEqual(wageDirectSelection(batchId, itemId), { batchId, wageItemId: itemId });
  assert.deepEqual(wageDirectSelection(batchId, "bad"), { batchId, wageItemId: undefined });
  assert.equal(selectedWageItem([{ id: itemId, wageBatchId: batchId }], batchId, "", batchId, itemId)?.id, itemId);
  assert.equal(selectedWageItem([{ id: itemId, wageBatchId: "other" }], batchId, "", batchId, itemId), null);
});
