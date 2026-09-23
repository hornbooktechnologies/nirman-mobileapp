"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WageBatchDetail, WageItem, WagePreviewItem } from "@nirman-app/shared";
import { Button, LoadingState, Select } from "@/components/ui";
import { wagesService } from "../services/wages.service";
import { wageRateLabel, wageBalanceLabel } from "../wage-display";

const money = (value: string | null) => value === null ? "Rate missing" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));

export function WageRateBreakdown({ item, confirmed = false }: { item: WageItem | WagePreviewItem; confirmed?: boolean }) {
  return <dl className="space-y-2 text-sm">
    <div><dt>Payable days</dt><dd>{item.presentDays} full · {item.halfDays} half · {item.absentDays} absent · {item.holidayDays} non-working</dd></div>
    <div><dt>{wageRateLabel(item, confirmed)}</dt><dd>{item.dailyRate === null ? "Rate unavailable" : item.rateBreakdown && item.rateBreakdown.length > 1 ? `Representative latest rate: ${money(item.dailyRate)}/day` : `${money(item.dailyRate)}/day`}</dd></div>
    {item.rateBreakdown?.map((rate, index) => <div key={index} className="rounded-inner bg-sunken p-3"><dt>Rate period {index + 1}: {money(rate.dailyRate)}/day</dt><dd>{rate.presentDays} full · {rate.halfDays} half · {rate.absentDays} absent — Gross {money(rate.grossAmount)}</dd></div>)}
    <div><dt>Gross</dt><dd>{money(item.grossAmount)}</dd></div>
    <div><dt>Kharchi deduction</dt><dd>{money(item.kharchiDeduction)}</dd></div>
    <div><dt>Adjustment</dt><dd>{money(item.adjustmentAmount)}</dd></div>
    <div><dt>Net payable</dt><dd>{money(item.netAmount)}</dd></div>
  </dl>;
}

function Allocations({ organizationId, projectId, item }: { organizationId: string; projectId: string; item: WageItem }) {
  const [page, setPage] = useState(1);
  const [advanceId, setAdvanceId] = useState("");
  const advances = useQuery({
    queryKey: ["wage-kharchi", organizationId, projectId, item.workerId, page],
    queryFn: () => wagesService.workerAdvances(organizationId, projectId, item.workerId, page),
  });
  const advance = useQuery({
    queryKey: ["wage-kharchi", organizationId, projectId, "detail", advanceId],
    queryFn: () => wagesService.advanceDetail(organizationId, projectId, advanceId),
    enabled: Boolean(advanceId),
  });
  return <section className="space-y-3">
    <h3 className="font-semibold">Kharchi allocation history</h3>
    <p className="text-sm text-sub">Choose a worker advance to inspect its allocations to this wage item, including reversals.</p>
    {advances.isPending ? <LoadingState label="Loading worker advances" /> : advances.isError ? <p role="alert">{advances.error.message} <Button onClick={() => void advances.refetch()}>Retry</Button></p> : <>
      <label className="grid gap-1">Worker advance<Select value={advanceId} onChange={event => setAdvanceId(event.target.value)}><option value="">Select advance</option>{advances.data.items.map(row => <option key={row.id} value={row.id}>{row.requestDate} · {money(row.amount)} · {row.status}</option>)}</Select></label>
      {!advances.data.items.length ? <p>No advances found.</p> : null}
      <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page === 1} onClick={() => { setPage(page - 1); setAdvanceId(""); }}>Previous</Button><span>Page {page} of {Math.max(1, advances.data.pagination.totalPages)}</span><Button variant="outline" disabled={page >= advances.data.pagination.totalPages} onClick={() => { setPage(page + 1); setAdvanceId(""); }}>Next</Button></div>
    </>}
    {advanceId && advance.isPending ? <LoadingState label="Loading allocation history" /> : null}
    {advance.isError ? <p role="alert">{advance.error.message} <Button onClick={() => void advance.refetch()}>Retry</Button></p> : null}
    {advance.data ? <>
      <p>Advance balance: {money(advance.data.outstandingAmount)} · <Link className="underline" href={`/projects/${projectId}/kharchi/${advance.data.id}`}>Open advance and correction history</Link></p>
      {advance.data.deductionAllocations.filter(row => row.wageItemId === item.id).map(row => <div key={row.id} className="rounded-inner border border-hairline p-3 text-sm"><p>{money(row.deductionAmount)} · {row.reversedAt ? "Reversed" : "Allocated"}</p><p>Allocated {row.deductedAt} · Actor {row.recordedBy}</p>{row.reversedAt ? <p>Reversed {row.reversedAt} · Actor {row.reversedBy} · {row.reversalReason}</p> : null}</div>)}
      {!advance.data.deductionAllocations.some(row => row.wageItemId === item.id) ? <p>This advance has no allocations to the selected wage item.</p> : null}
    </> : null}
  </section>;
}

export function WageFinancialDetail({ item, detail, organizationId, projectId, canReadKharchi, canReadAttendance }: { item: WageItem; detail: WageBatchDetail; organizationId: string; projectId: string; canReadKharchi: boolean; canReadAttendance: boolean }) {
  const [showAllocations, setShowAllocations] = useState(false);
  const payments = detail.payments.filter(payment => payment.wageItemId === item.id);
  return <section className="space-y-4 rounded-inner border border-hairline p-4">
    <h2 className="text-lg font-semibold">{item.workerName} — saved calculation and history</h2>
    <p className="text-sm text-sub">These rates and day counts were saved when this batch was confirmed. Later attendance or rate changes do not rewrite them.</p>
    <WageRateBreakdown item={item} confirmed />
    <nav aria-label="Worker financial context" className="flex flex-wrap gap-3 text-sm">
      {canReadAttendance ? <Link className="underline" href={`/workers/${item.workerId}?organizationId=${organizationId}&tab=attendance&projectId=${projectId}`}>Worker attendance</Link> : null}
      {canReadKharchi ? <Link className="underline" href={`/projects/${projectId}/kharchi?workerAssignmentId=${item.workerAssignmentId}`}>Assignment Kharchi ledger</Link> : null}
    </nav>
    <p className="text-sm">Notes: {item.notes || "No notes"}</p>
    <p className="text-sm">Payment state: {wageBalanceLabel(item)} · Paid: {money(item.paidAmount)} · Remaining: {money(Math.max(0, Number(item.netAmount) - Number(item.paidAmount)).toFixed(2))}</p>
    {detail.status !== "CANCELLED" && Number(item.netAmount) === 0 && Number(item.kharchiDeduction) > 0 ? <p>Settled by Kharchi deduction. No wage payment is due.</p> : null}
    <h3 className="font-semibold">Payment history</h3>
    {!payments.length ? <p className="text-sm">No payments recorded.</p> : payments.map(payment => <div key={payment.id} className="space-y-1 rounded-inner bg-sunken p-3 text-sm break-words"><p>{money(payment.amount)} · {payment.paymentMethod.replaceAll("_", " ")} · Paid {payment.paymentDate}</p><p>Reference: {payment.reference || "None"}</p><p>Recorded {payment.recordedAt} · Actor {payment.recordedBy}</p></div>)}
    {canReadKharchi ? <><Button variant="outline" aria-expanded={showAllocations} onClick={() => setShowAllocations(!showAllocations)}>{showAllocations ? "Hide" : "View"} Kharchi allocations</Button>{showAllocations ? <Allocations organizationId={organizationId} projectId={projectId} item={item} /> : null}</> : <p className="text-sm text-sub">Kharchi source history requires Kharchi read permission.</p>}
  </section>;
}
