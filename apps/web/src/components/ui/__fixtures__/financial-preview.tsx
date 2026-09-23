"use client";

import { useState } from "react";
import type { WageBatchDetail, WageItem } from "@nirman-app/shared";
import { Card } from "@/components/ui";
import { WageFinancialDetail, WageRateBreakdown } from "@/features/wages/components/wage-financial-detail";
import { KharchiCollectionFilters, defaultKharchiFilters } from "@/features/kharchi/components/kharchi-collection-filters";
import type { KharchiQuery } from "@/features/kharchi/services/kharchi.service";

const item: WageItem = {
  id: "fixture-item", wageBatchId: "fixture-batch", workerAssignmentId: "fixture-assignment", workerId: "fixture-worker", workerCode: "TEST-01", workerName: "Long worker name showing saved multi-rate earnings across a narrow screen", trade: "Mason", dailyRate: "900.00", presentDays: 12, halfDays: 2, absentDays: 1, holidayDays: 2,
  grossAmount: "11050.00", kharchiDeduction: "1000.00", adjustmentAmount: "-100.00", netAmount: "9950.00", paidAmount: "2500.00", paymentStatus: "PARTIALLY_PAID", notes: "Saved fixture snapshot",
  rateBreakdown: [
    { dailyRate: "800.00", presentDays: 6, halfDays: 1, absentDays: 1, grossAmount: "5200.00" },
    { dailyRate: "900.00", presentDays: 6, halfDays: 1, absentDays: 0, grossAmount: "5850.00" },
  ],
};
const detail: WageBatchDetail = {
  id: "fixture-batch", organizationId: "fixture-org", projectId: "fixture-project", periodStart: "2026-09-01", periodEnd: "2026-09-15", status: "PARTIALLY_PAID", generatedBy: "fixture", createdAt: "2026-09-16T00:00:00Z", updatedAt: "2026-09-16T00:00:00Z", totals: { grossAmount: "11050.00", kharchiDeduction: "1000.00", adjustmentAmount: "-100.00", netAmount: "9950.00", paidAmount: "2500.00" }, items: [item], payments: [{ id: "fixture-payment", wageItemId: item.id, amount: "2500.00", paymentDate: "2026-09-17", paymentMethod: "CASH", recordedAt: "2026-09-17T00:00:00Z", recordedBy: "Fixture" }],
};
export function FinancialPreview() {
  const [filters, setFilters] = useState<KharchiQuery>(defaultKharchiFilters);
  return <main className="space-y-5 p-4">
    <p className="text-sm text-sub">Development fixture: synthetic financial records; no API calls or payment actions.</p>
    <h1 className="text-2xl font-semibold">Wages and Kharchi</h1>
    <Card><h2 className="mb-3 text-lg font-semibold">Period preview</h2><WageRateBreakdown item={item} /></Card>
    <WageFinancialDetail item={item} detail={detail} organizationId="fixture-org" projectId="fixture-project" canReadKharchi={false} canReadAttendance={false} />
    <Card><h2 className="mb-3 text-lg font-semibold">Kharchi collection filters</h2><KharchiCollectionFilters value={filters} workers={[]} error="" onApply={next => { setFilters(next); return true; }} /><p className="mt-3 text-sm">Applied status: {filters.status ?? "all"}; method: {filters.paymentMethod ?? "all"}</p></Card>
  </main>;
}
