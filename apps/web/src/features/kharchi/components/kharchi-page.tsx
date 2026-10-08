"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import { downloadPdf } from "@/lib/exports/pdf";
import { ExportProgress } from "@/components/common/export-progress";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KharchiAdvanceDetail } from "@nirman-app/shared";
import { Button, Card, LoadingState, StatusBadge } from "@/components/ui";
import { KharchiCollectionFilters, defaultKharchiFilters } from "./kharchi-collection-filters";
import { useKharchiDetail, useKharchiList, useKharchiSummary } from "../hooks/use-kharchi";
import { kharchiService, type KharchiQuery } from "../services/kharchi.service";
import { KharchiWorkspace, type KharchiContext } from "./kharchi-workspace";
import { KharchiForm } from "./kharchi-form";
import { kharchiStatusLabels, kharchiPaymentMethodLabels } from "../kharchi-labels";

const money = (value: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));

const date = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", ...(value.length > 10 ? { timeStyle: "short" as const, timeZone: "Asia/Kolkata" } : {}) }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
function Balance({ title, value }: { title: string; value: string }) { return <div><p className="text-sm text-sub">{title}</p><p className="text-xl font-semibold tabular-nums">{money(value)}</p></div>; }
function Status({ value }: { value: KharchiAdvanceDetail["status"] }) { return <StatusBadge className="text-sm" tone={value === "DEDUCTED" ? "success" : value === "PARTIALLY_DEDUCTED" ? "info" : "warning"}>{kharchiStatusLabels[value]}</StatusBadge>; }

function List({ context, initialQuery = {} }: { context: KharchiContext; initialQuery?: KharchiQuery }) {
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [filters, setFilters] = useState<KharchiQuery>({ sortBy: "requestDate", sortOrder: "desc", ...initialQuery, page: undefined });
  const [page, setPage] = useState(initialQuery.page ?? 1);
  const [form, setForm] = useState(false);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [filterError, setFilterError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, page }).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [filters, page]);
  const list = useKharchiList(context.org, context.project, { ...filters, page, pageSize: 20 });
  const summary = useKharchiSummary(context.org, context.project, filters);
  const workerOptions = useKharchiSummary(context.org, context.project, {});
  function apply(next: KharchiQuery) { if (next.startDate && next.endDate && next.endDate < next.startDate) { setFilterError("End date must be on or after start date."); return false; } setFilterError(""); setFilters(next); setPage(1); return true; }
  async function exportCsv() {
    setExporting(true); setExportError("");
    try { const file = await kharchiService.exportPdf(context.org, context.project, filters); if (!mounted.current) return; downloadPdf(file); setMessage("PDF downloaded."); }
    catch (error) { setExportError(error instanceof Error ? error.message : "Export failed. Try again."); } finally { setExporting(false); }
  }
  return <><ExportProgress active={exporting} /><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Kharchi</h1><p className="text-sub">Paid worker advances and wage recovery.</p></div><div className="flex flex-wrap gap-2"><RefreshButton busy={list.isFetching || summary.isFetching} variant="outline" onRefresh={async () => { await Promise.allSettled([list.refetch(), summary.refetch()]); }} disabled={list.isFetching || summary.isFetching}>Refresh</RefreshButton>{context.permissions.includes("kharchi:export") && <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting}>{exporting ? "Preparing PDF…" : "Export PDF"}</Button>}{context.active && context.permissions.includes("kharchi:create") && <Button onClick={() => setForm(true)}>Record paid advance</Button>}</div></header>
    {message && <p role="status">{message}</p>}{exportError && <p role="alert" className="text-danger">{exportError}</p>}
    {summary.isPending ? <LoadingState label="Loading balances" /> : summary.isError ? <Card><p role="alert">{summary.error.message}</p><Button onClick={() => void summary.refetch()}>Retry summary</Button></Card> : <Card><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5"><Balance title="Original advances" value={summary.data.originalAmount} /><Balance title="Adjustments" value={summary.data.adjustmentAmount} /><Balance title="Effective advances" value={summary.data.effectiveAmount} /><Balance title="Deducted" value={summary.data.deductedAmount} /><Balance title="Outstanding" value={summary.data.outstandingAmount} /></div><p className="mt-3 text-sm text-sub">Project summary follows the selected worker, assignment and paid-date range. Search, deduction progress, payment method and sort affect the list and PDF only.</p></Card>}
    <Card><KharchiCollectionFilters value={filters} workers={workerOptions.data?.workers ?? []} assignmentId={filters.workerAssignmentId} error={filterError} onApply={apply} /><Button variant="ghost" onClick={() => apply(defaultKharchiFilters)}>Clear all applied filters</Button></Card>
    {list.isPending ? <LoadingState label="Loading advances" /> : list.isError ? <Card><p role="alert">{list.error.message}</p><Button onClick={() => void list.refetch()}>Retry list</Button></Card> : <><p role="status" className="text-sm text-sub">{list.data.pagination.total} advances{list.isFetching ? " · Refreshing…" : ""}</p>{!list.data.items.length ? <Card>No advances match this view. Clear filters or record an already-paid advance.</Card> : <div className="grid gap-3 lg:grid-cols-2">{list.data.items.map(item => <Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><Link className="text-lg font-semibold underline focus-visible:ring-2 focus-visible:ring-lime" href={`/projects/${context.project}/kharchi/${item.id}`}>{item.workerName}</Link><p className="text-sm text-sub">{item.workerCode} · {item.trade}</p>{context.permissions.includes("workers:read") && <Link className="text-sm underline" href={`/workers/${item.workerId}?organizationId=${context.org}&tab=${context.permissions.includes("attendance:read") ? "attendance" : "history"}&projectId=${context.project}`}>Worker context</Link>}</div><Status value={item.status} /></div><p className="my-3 text-sm">Paid {date(item.requestDate)} · {kharchiPaymentMethodLabels[item.paymentMethod]}</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Balance title="Effective amount" value={item.effectiveAmount} /><Balance title="Deducted" value={item.deductedAmount} /><Balance title="Outstanding" value={item.outstandingAmount} /></div></Card>)}</div>}<div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={page <= 1 || list.isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page} of {list.data.pagination.totalPages || 1}</span><Button variant="outline" disabled={page >= list.data.pagination.totalPages || list.isFetching} onClick={() => setPage(page + 1)}>Next</Button></div></>}
    {form && context.active && context.permissions.includes("kharchi:create") && <KharchiForm context={context} close={() => setForm(false)} saved={() => { setForm(false); setMessage("The paid advance and updated balance are confirmed."); }} refresh={() => void list.refetch()} />}
  </>;
}

function Detail({ context, id }: { context: KharchiContext; id: string }) {
  const query = useKharchiDetail(context.org, context.project, id);
  const [form, setForm] = useState(false);
  const [message, setMessage] = useState("");
  if (query.isPending) return <LoadingState label="Loading advance" />;
  if (query.isError) return <Card><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Retry detail</Button><Link href={`/projects/${context.project}/kharchi`}>Back to Kharchi</Link></Card>;
  const detail = query.data;
  return <><Link className="underline" href={`/projects/${context.project}/kharchi`}>Back to Kharchi</Link><header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-semibold">{detail.workerName}</h1><p>{detail.workerCode} · {detail.trade}</p></div><div className="flex flex-wrap items-center gap-2"><Status value={detail.status} /><RefreshButton busy={query.isFetching} variant="outline" disabled={query.isFetching} onRefresh={() => query.refetch()}>Refresh</RefreshButton>{context.active && context.permissions.includes("kharchi:adjust") && <Button disabled={query.isFetching} onClick={() => setForm(true)}>Add adjustment</Button>}</div></header>{message && <p role="status">{message}</p>}
    <Card><h2 className="mb-3 text-lg font-semibold">Balance</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5"><Balance title="Original paid" value={detail.amount} /><Balance title="Adjustments" value={detail.adjustmentAmount} /><Balance title="Effective amount" value={detail.effectiveAmount} /><Balance title="Deducted" value={detail.deductedAmount} /><Balance title="Outstanding" value={detail.outstandingAmount} /></div></Card>
    <Card><h2 className="mb-3 text-lg font-semibold">Payment details</h2><Link className="mb-3 inline-block underline" href={`/projects/${context.project}/kharchi?workerAssignmentId=${detail.workerAssignmentId}`}>View assignment ledger</Link><dl className="grid gap-3 break-words sm:grid-cols-2">{[["Date paid", date(detail.requestDate)], ["Payment method", kharchiPaymentMethodLabels[detail.paymentMethod]], ["Reference", detail.paymentReference || "—"], ["Recorded at (India time)", date(detail.paidAt)], ["Recorded by", detail.recordedByName || "Name unavailable"], ["Worker assignment", `${detail.workerName} (${detail.workerCode})${detail.projectName ? ` · ${detail.projectName}` : ""}${detail.assignmentStartsOn ? ` · From ${date(detail.assignmentStartsOn)}${detail.assignmentEndsOn ? ` to ${date(detail.assignmentEndsOn)}` : " · No end date"}` : ""}`], ["Notes", detail.notes || "—"]].map(([key, value]) => <div key={key}><dt className="text-sm text-sub">{key}</dt><dd className="whitespace-pre-wrap">{value}</dd></div>)}</dl></Card>
    <Card><h2 className="mb-3 text-lg font-semibold">Adjustment history</h2>{!detail.adjustments.length && <p>No adjustments. The original paid amount has not been corrected.</p>}<ol className="space-y-4">{detail.adjustments.map(a => <li key={a.id} className="border-t border-hairline pt-3"><strong>{Number(a.amount) >= 0 ? "Increase" : "Decrease"} · {money(a.amount)}</strong><p className="whitespace-pre-wrap break-words">{a.reason}</p><p className="break-words text-sm text-sub">{date(a.recordedAt)} · {a.recordedByName || "Name unavailable"}</p></li>)}</ol></Card>
    <Card><h2 className="mb-3 text-lg font-semibold">Wage deductions</h2>{!detail.deductionAllocations.length && <p>No wage deductions. This advance has not yet been allocated during Wage confirmation.</p>}<ol className="space-y-4">{detail.deductionAllocations.map(a => <li key={a.id} className="space-y-1 break-words border-t border-hairline pt-3"><strong>{money(a.deductionAmount)}</strong> <StatusBadge tone={a.reversedAt ? "warning" : "success"}>{a.reversedAt ? "Reversed wage deduction" : "Wage deduction"}</StatusBadge><p className="text-sm">{date(a.deductedAt)} · {a.recordedByName || "Name unavailable"}</p>{context.permissions.includes("wages:read") ? <Link className="text-sm underline" href={`/projects/${context.project}/wages?batchId=${a.wageBatchId}&wageItemId=${a.wageItemId}`}>View wage batch and item</Link> : <p className="text-sm text-sub">Wage record access unavailable</p>}{a.reversedAt && <p className="whitespace-pre-wrap">Reversed {date(a.reversedAt)} by {a.reversedByName || "Name unavailable"}: {a.reversalReason}</p>}</li>)}</ol></Card>
    {form && context.active && context.permissions.includes("kharchi:adjust") && <KharchiForm context={context} detail={detail} close={() => setForm(false)} saved={() => { setForm(false); setMessage("The permanent adjustment and updated balance are confirmed."); }} refresh={() => void query.refetch()} />}
  </>;
}
export function KharchiPage({ projectId, advanceId, initialQuery }: { projectId?: string; advanceId?: string; initialQuery?: KharchiQuery }) { return <KharchiWorkspace projectId={projectId}>{context => advanceId ? <Detail key={advanceId} context={context} id={advanceId} /> : <List key={JSON.stringify(initialQuery)} context={context} initialQuery={initialQuery} />}</KharchiWorkspace>; }
