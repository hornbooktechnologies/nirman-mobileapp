import { test } from "node:test";
import assert from "node:assert/strict";
import { siteExpenseTimeline } from "../../dist/types/expenses.js";
import { isPaymentLedgerAvailable } from "../../dist/types/total-expenses.js";

test("older API responses cannot enable payment writes or crash status rendering", () => {
  assert.equal(isPaymentLedgerAvailable(undefined), false);
  assert.equal(isPaymentLedgerAvailable({ version: 1 }), false);
  assert.equal(isPaymentLedgerAvailable({ payments: [], paidAmount: "0.00", remainingAmount: "100.00" }), false);
  const ledger = { payments: [], paidAmount: "0.00", remainingAmount: "100.00", paymentStatus: "UNPAID" };
  assert.equal(isPaymentLedgerAvailable(ledger), true);
  assert.equal(isPaymentLedgerAvailable({ ...ledger, paymentTrackingAvailable: false }), false);
  assert.equal(isPaymentLedgerAvailable({ ...ledger, remainingAmount: null }), true);
});
test("timeline preserves signed adjustments, payment and void audit entries in newest-first order", () => {
  const createdAt = "2026-10-01T10:00:00Z";
  const rows = siteExpenseTimeline({
    events: [{ id: "created", eventType: "CREATED", createdAt, actorName: "Owner" }, { id: "adjusted", eventType: "ADJUSTED", createdAt: "2026-10-01T10:00:01Z", actorUserId: "owner", actorName: "Owner" }],
    adjustments: [{ id: "adjustment", amount: "-10.00", reason: "Correction", createdAt, recordedByUserId: "owner", recordedBy: "Owner" }],
    payments: [{ id: "payment", amount: "25.00", paymentDate: "2026-10-02", paymentMethod: "CASH", recordedAt: "2026-10-02T10:00:00Z", recordedBy: "Owner", voidedAt: "2026-10-03T10:00:00Z", voidedBy: "Owner", voidReason: "Mistake" }],
  });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].eventType, "PAYMENT_VOIDED");
  assert.equal(rows[1].eventType, "PAYMENT_RECORDED");
  assert.equal(rows.filter(row => row.eventType === "ADJUSTED").length, 1);
  assert.equal(rows.find(row => row.eventType === "ADJUSTED").amount, "-10.00");
  assert.equal(siteExpenseTimeline({ events: [], adjustments: [] }).length, 0);
});
