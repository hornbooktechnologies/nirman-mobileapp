"use client";

import Link from "next/link";
import { Banknote, CalendarDays, Check, CreditCard, Download, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Dialog, Input, LoadingState, PageHeader, Select, StatusBadge } from "@/components/ui";
import { WageWorkspace } from "./wage-workspace";
import { WageFinancialDetail, WageRateBreakdown } from "./wage-financial-detail";
import { canCancelWageBatch, paymentValidation, isUncertainPaymentFailure, retainPaymentAttempt, type WagePaymentAttempt } from "../wage-rules";
import { ApiError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  useCancelWageBatch,
  useCreateWageBatch,
  useRecordWagePayment,
  useUpdateWageItem,
  useWageBatchDetail,
  useWageBatches,
  useWagePreview,
} from "@/features/wages/hooks/use-wages";
import { wagesService } from "@/features/wages/services/wages.service";
import type { WageItem, WagePaymentMethod } from "@/features/wages/types/wages.types";
import { WAGE_PAYMENT_METHODS } from "@nirman-app/shared";

const DEFAULT_WORKING_TIMEZONE = "Asia/Kolkata";

const todayInTimezone = (timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const monthStart = (date: string) => `${date.slice(0, 8)}01`;

const currency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const batchTone = {
  DRAFT: "pending",
  CONFIRMED: "warning",
  PARTIALLY_PAID: "active",
  PAID: "success",
  CANCELLED: "inactive",
} as const;

const paymentMethods: Record<WagePaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

const remainingAmount = (item: WageItem | undefined) =>
  Math.max(0, Number(item?.netAmount ?? 0) - Number(item?.paidAmount ?? 0)).toFixed(2);

export function WagesPage({ projectId }: { projectId: string }) {
  return <WageWorkspace projectId={projectId}>{(permissions, archived) => <WagesContent projectId={projectId} permissions={permissions} archived={archived} />}</WageWorkspace>;
}

function WagesContent({ projectId, permissions, archived }: { projectId: string; permissions: string[]; archived: boolean }) {
  const { activeOrganizationId, activeOrganizationTimezone } = useAuth();
  const hasPermission = (permission: string) => permissions.includes(permission);
  const organizationId = activeOrganizationId ?? "";
  const wageToday = todayInTimezone(activeOrganizationTimezone ?? DEFAULT_WORKING_TIMEZONE);
  const [periodStart, setPeriodStart] = useState(() => monthStart(wageToday));
  const [periodEnd, setPeriodEnd] = useState(wageToday);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(wageToday);
  const [paymentMethod, setPaymentMethod] = useState<WagePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [failure, setFailure] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [paymentAttempt, setPaymentAttempt] = useState<WagePaymentAttempt | null>(null);
  const actionLock = useRef(false);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (failure && !cancelOpen) errorRef.current?.focus(); }, [failure, cancelOpen]);
  const closeCancel = useCallback((open: boolean) => { if (!actionLock.current) setCancelOpen(open); }, []);
  const canGenerate = !archived && hasPermission("wages:generate");
  const canPay = !archived && hasPermission("wages:mark-paid");
  const canUpdate = !archived && hasPermission("wages:update");
  const canExport = hasPermission("wages:export");
  const canCancel = !archived && hasPermission("wages:cancel");
  const invalidRange = periodEnd < periodStart;
  const futurePeriodEnd = periodEnd > wageToday;
  const periodError = !periodStart || !periodEnd ? "Both period dates are required." : invalidRange
    ? "End date cannot be before start date."
    : futurePeriodEnd
      ? "End date must be today or earlier."
      : "";
  const preview = useWagePreview(organizationId, projectId, periodStart, periodEnd, previewRequested && !periodError);
  const batches = useWageBatches(organizationId, projectId);
  const createBatch = useCreateWageBatch(organizationId, projectId);
  const detail = useWageBatchDetail(organizationId, projectId, selectedBatchId);
  const recordPayment = useRecordWagePayment(organizationId, projectId);
  const updateItem = useUpdateWageItem(organizationId, projectId);
  const cancelBatch = useCancelWageBatch(organizationId, projectId);
  const cancelled = detail.data?.status === "CANCELLED";
  const hasPayments = Boolean(detail.data && (detail.data.payments.length || Number(detail.data.totals.paidAmount) > 0));
  const paymentError = paymentValidation(amount, detail.data?.items.find(item => item.id === selectedItemId));
  const adjustmentError = adjustmentAmount !== "" && !/^-?\d+(\.\d{1,2})?$/.test(adjustmentAmount) ? "Use an amount with up to two decimal places." : "";
  const [itemSnapshot, setItemSnapshot] = useState<WageItem | null>(null);
  const selectedRecordChanged = Boolean(itemSnapshot && detail.data?.items.some(item => item.id === itemSnapshot.id && (item.adjustmentAmount !== itemSnapshot.adjustmentAmount || item.notes !== itemSnapshot.notes || item.paidAmount !== itemSnapshot.paidAmount)));
  const formDirty = Boolean(selectedItemId && (itemNotes !== (itemSnapshot?.notes ?? "") || adjustmentAmount !== itemSnapshot?.adjustmentAmount || reference || amount !== remainingAmount(itemSnapshot ?? undefined) || paymentDate !== wageToday || paymentMethod !== "CASH"));
  useEffect(() => {
    if (!formDirty && !paymentAttempt && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const intercept = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && (paymentAttempt || busy || !window.confirm("Discard your unsaved wage form?"))) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", intercept, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", intercept, true); };
  }, [formDirty, paymentAttempt, busy]);

  async function perform(action: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setFailure(""); setMessage("");
    try { await action(); }
    catch (error) {
      setFailure(`${error instanceof Error ? error.message : "Unable to complete wage action."} Review the refreshed record before submitting again.`);
      void batches.refetch();
      if (selectedBatchId) void detail.refetch();
    } finally { actionLock.current = false; setBusy(false); }
  }
  function selectBatch(id: string) {
    if (busy || paymentAttempt) return;
    if (formDirty && !window.confirm("Discard the current worker form and open this batch?")) return;
    setSelectedBatchId(id); setSelectedItemId(""); setReason(""); setFailure(""); setMessage("");
  }

  const selectedItem = useMemo(
    () => detail.data?.items.find((item) => item.id === selectedItemId) ?? null,
    [detail.data?.items, selectedItemId],
  );
  const previewReady = Boolean(preview.data?.items.length) && !preview.data?.items.some((item) => !item.isReady);

  async function confirmBatch() {
    if (!canGenerate || !previewReady || periodError) return;
    if (formDirty && !window.confirm("Discard the current worker form and confirm this batch?")) return;
    setMessage("");
    const created = await createBatch.mutateAsync({ periodStart, periodEnd });
    setSelectedItemId("");
    setSelectedBatchId(created.id);
    setPreviewRequested(false);
    setMessage("Wage batch confirmed.");
  }

  async function pay() {
    if (!selectedItem || (!paymentAttempt && paymentError) || cancelled || !canPay) return;
    setMessage("");
    const input = retainPaymentAttempt(paymentAttempt, {
      wageItemId: selectedItem.id,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference: reference || null,
    }, () => crypto.randomUUID());
    setPaymentAttempt(input);
    let updated;
    try { updated = await recordPayment.mutateAsync(input); }
    catch (error) {
      if (error instanceof ApiError && !isUncertainPaymentFailure(error.statusCode)) setPaymentAttempt(null);
      throw error;
    }
    setPaymentAttempt(null);
    setSelectedBatchId(updated.id);
    setSelectedItemId("");
    setAmount("");
    setReference("");
    setMessage("Wage payment recorded.");
  }

  async function saveAdjustment() {
    if (!selectedItem || cancelled || !canUpdate || adjustmentError || selectedRecordChanged) return;
    const current = await wagesService.batchDetail(organizationId, projectId, selectedBatchId!);
    const currentItem = current.items.find(item => item.id === selectedItem.id);
    if (!currentItem || currentItem.adjustmentAmount !== itemSnapshot?.adjustmentAmount || currentItem.notes !== itemSnapshot?.notes || currentItem.paidAmount !== itemSnapshot?.paidAmount) {
      throw new Error("This wage item changed. Select it again to load the latest values before adjusting it.");
    }
    setMessage("");
    const updated = await updateItem.mutateAsync({
      wageItemId: selectedItem.id,
      adjustmentAmount: adjustmentAmount === "" ? undefined : Number(adjustmentAmount),
      notes: itemNotes || null,
    });
    setSelectedBatchId(updated.id);
    setSelectedItemId("");
    setItemSnapshot(null);
    setMessage("Wage item updated.");
  }

  async function exportBatch() {
    if (!selectedBatchId || !organizationId) return;
    setIsExporting(true);
    try {
      const csv = await wagesService.exportCsv(organizationId, projectId, selectedBatchId);
      const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `wages-${projectId}-${selectedBatchId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  function chooseItem(item: WageItem) {
    if (busy || paymentAttempt) return;
    if (formDirty && !window.confirm("Discard the current worker form?")) return;
    setItemSnapshot(item);
    setReference("");
    setSelectedItemId(item.id);
    setAmount(remainingAmount(item));
    setAdjustmentAmount(item.adjustmentAmount);
    setItemNotes(item.notes ?? "");
  }

  return (
    <>
      <div className="min-w-0 space-y-4 pb-8 [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11 [&_input]:text-base [&_select]:text-base">
        {archived ? <Card>This project is archived. Wage records are read-only.</Card> : null}
        {failure ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-sm text-danger">{failure}</p> : null}
        {message ? <p role="status" className="text-sm text-success">{message}</p> : null}
        <PageHeader
          title="Wages"
          description="Generate wage batches from attendance and record worker payments."
          onBack={() => { if (!busy && !paymentAttempt && (!formDirty || window.confirm("Discard your unsaved wage form?"))) window.history.back(); }}
          actions={<Link href={`/projects/${projectId}`}><Button variant="outline">Project</Button></Link>}
        />

        <Card className="min-w-0 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[180px_180px_auto] md:items-end">
            <label className="grid gap-1 text-sm font-semibold text-sub">
              Period start *
              <Input disabled={busy} type="date" max={periodEnd < wageToday ? periodEnd : wageToday} value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPreviewRequested(false); }} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-sub">
              Period end *
              <Input disabled={busy} type="date" min={periodStart} max={wageToday} invalid={Boolean(periodError)} aria-describedby={periodError ? "wage-period-error" : undefined} value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPreviewRequested(false); }} />
            </label>
            <Button onClick={() => { setPreviewRequested(true); if (previewRequested) void preview.refetch(); }} disabled={!organizationId || Boolean(periodError) || preview.isFetching || busy}>
              <CalendarDays size={16} />
              {preview.isFetching ? "Generating" : "Generate preview"}
            </Button>
          </div>
          {periodError ? <p id="wage-period-error" role="alert" className="text-[14px] text-danger">{periodError}</p> : null}
          {preview.isError ? <p className="text-[14px] text-danger">{preview.error instanceof Error ? preview.error.message : "Unable to generate wage preview."}</p> : null}
        </Card>

        {previewRequested && preview.data && !preview.isError ? (
          <Card className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-body">Preview</p>
                <p className="text-[12px] text-sub">{preview.data.items.length} eligible workers in this period</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-sub">Net payable</p>
                <p className="text-xl font-bold text-body">{currency(preview.data.totals.netAmount)}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3"><p>Gross {currency(preview.data.totals.grossAmount)}</p><p>Kharchi deduction {currency(preview.data.totals.kharchiDeduction)}</p><p>Adjustments {currency(preview.data.totals.adjustmentAmount)}</p></div>
            <div role="region" aria-label="Wage comparison table" tabIndex={0} className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-[14px]">
                <thead className="bg-sunken text-[12px] uppercase tracking-[0.12em] text-sub">
                  <tr><th className="px-3 py-2">Worker</th><th>Days</th><th>Rate</th><th>Gross</th><th>Net</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {preview.data.items.map((item) => (
                    <tr key={item.workerAssignmentId}>
                      <td className="px-3 py-2"><span className="font-semibold">{item.workerName}</span><span className="block text-[12px] text-sub">{item.workerCode} - {item.trade}</span><details className="mt-2"><summary className="cursor-pointer">Calculation details</summary><WageRateBreakdown item={item} /></details></td>
                      <td>{item.presentDays} P / {item.halfDays} H / {item.absentDays} A</td>
                      <td>{item.dailyRate ? currency(item.dailyRate) : "-"}</td>
                      <td>{currency(item.grossAmount)}</td>
                      <td>{currency(item.netAmount)}</td>
                      <td>{item.isReady ? <StatusBadge tone="success">Ready</StatusBadge> : <StatusBadge tone="warning">{item.readinessIssue}</StatusBadge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!preview.data.items.length ? <p>No eligible workers in this period.</p> : null}
            {canGenerate ? <Button onClick={() => void perform(confirmBatch)} disabled={!previewReady || Boolean(periodError) || busy || preview.isFetching || Boolean(paymentAttempt)}><Check size={16} /> {createBatch.isPending ? "Confirming" : "Confirm wage batch"}</Button> : null}
          </Card>
        ) : null}

        <div className="grid gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="min-w-0 space-y-3">
            <p className="font-semibold text-body">Confirmed batches</p>
            {batches.isLoading ? <LoadingState label="Loading batches" /> : null}
            {batches.isError ? <p role="alert">{batches.error.message} <Button onClick={() => void batches.refetch()}>Retry</Button></p> : null}
            {(batches.data ?? []).map((batch) => (
              <button key={batch.id} type="button" disabled={busy || Boolean(paymentAttempt)} aria-pressed={selectedBatchId === batch.id} onClick={() => selectBatch(batch.id)} className="block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-inner border border-hairline p-3 text-left hover:bg-sunken">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{batch.periodStart} to {batch.periodEnd}</span>
                  <StatusBadge tone={batchTone[batch.status]}>{batch.status}</StatusBadge>
                </div>
                <p className="mt-1 text-[12px] text-sub">Net {currency(batch.totals.netAmount)} - Paid {currency(batch.totals.paidAmount)}</p>
              </button>
            ))}
            {!batches.isLoading && !batches.isError && !(batches.data ?? []).length ? <p className="text-[14px] text-sub">No wage batches yet.</p> : null}
          </Card>

          <Card className="min-w-0 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote size={18} />
              <p className="font-semibold text-body">Batch detail</p>
            </div>
            {!selectedBatchId ? <p className="text-[14px] text-sub">Select a confirmed batch to view items and record payments.</p> : detail.isLoading ? <LoadingState label="Loading batch" /> : detail.data && !detail.isError ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid flex-1 gap-2 text-[14px] sm:grid-cols-3">
                  <div><p className="text-sub">Adjustments</p><p className="font-semibold">{currency(detail.data.totals.adjustmentAmount)}</p></div>
                  <div><p className="text-sub">Gross</p><p className="font-semibold">{currency(detail.data.totals.grossAmount)}</p></div>
                  <div><p className="text-sub">Deductions</p><p className="font-semibold">{currency(detail.data.totals.kharchiDeduction)}</p></div>
                  <div><p className="text-sub">Net</p><p className="font-semibold">{currency(detail.data.totals.netAmount)}</p></div>
                  <div><p className="text-sub">Paid</p><p className="font-semibold">{currency(detail.data.totals.paidAmount)}</p></div>
                  </div>
                  {canExport ? <Button variant="outline" onClick={() => void perform(exportBatch)} disabled={isExporting || busy}><Download size={16} /> {isExporting ? "Exporting" : "Export"}</Button> : null}
                </div>
                <div role="region" aria-label="Wage comparison table" tabIndex={0} className="overflow-x-auto">
                  <table className="min-w-[640px] w-full text-left text-[14px]">
                    <thead className="bg-sunken text-[12px] uppercase tracking-[0.12em] text-sub">
                      <tr><th className="px-3 py-2">Worker</th><th>Net</th><th>Paid</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {detail.data.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2"><span className="font-semibold">{item.workerName}</span><span className="block text-[12px] text-sub">{currency(item.dailyRate)}/day · {item.presentDays} P / {item.halfDays} H</span></td>
                          <td>{currency(item.netAmount)}</td>
                          <td>{currency(item.paidAmount)}</td>
                          <td><StatusBadge tone={item.paymentStatus === "PAID" ? "success" : item.paymentStatus === "PARTIALLY_PAID" ? "active" : "warning"}>{item.paymentStatus}</StatusBadge></td>
                          <td><Button disabled={busy || Boolean(paymentAttempt)} size="sm" variant="outline" onClick={() => chooseItem(item)}>Details</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 text-sm">
                  <StatusBadge tone={batchTone[detail.data.status]}>{detail.data.status}</StatusBadge>
                  <p>{detail.data.periodStart} to {detail.data.periodEnd}</p>
                  {cancelled ? <p>Cancelled {detail.data.cancelledAt}: {detail.data.cancellationReason}. Actor {detail.data.cancelledBy}. This snapshot is read-only; Kharchi deductions have been reversed.</p> : null}
                  {canCancel && !cancelled ? !canCancelWageBatch(detail.data) ? <p>Cancellation is unavailable because this batch has payment history.</p> : <Button variant="danger" disabled={busy || Boolean(paymentAttempt)} onClick={() => setCancelOpen(true)}>Cancel batch</Button> : null}
                </div>
                {selectedRecordChanged ? <p role="alert" className="text-danger">This wage item changed. Select Details again to review the latest values before submitting.</p> : null}
                {selectedItem ? <WageFinancialDetail key={selectedItem.id} item={selectedItem} detail={detail.data} organizationId={organizationId} projectId={projectId} canReadKharchi={hasPermission("kharchi:read")} /> : null}
                {paymentAttempt && !busy ? <p role="alert">The last payment has an uncertain result. Retry the same payment to safely recover its result. Keep this page open until resolved.</p> : null}
                {canPay && !cancelled ? (
                  <div className="grid gap-3 border-t border-hairline pt-4 xl:grid-cols-2 md:items-end">
                    <label className="grid gap-1 text-sm font-semibold text-sub">Worker<Select disabled={busy || Boolean(paymentAttempt)} value={selectedItemId} onChange={(event) => { const item = detail.data?.items.find((candidate) => candidate.id === event.target.value); if (item) chooseItem(item); else setSelectedItemId(""); }}><option value="">Select worker</option>{detail.data.items.filter((item) => item.paymentStatus !== "PAID" || item.id === selectedItemId).map((item) => <option key={item.id} value={item.id}>{item.workerName} - due {currency(remainingAmount(item))}</option>)}</Select></label>
                    <label className="grid gap-1 text-sm font-semibold text-sub">Amount *<Input disabled={busy || Boolean(paymentAttempt)} invalid={Boolean(amount && paymentError)} aria-describedby={amount && paymentError ? "wage-payment-error" : undefined} type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
                    <label className="grid gap-1 text-sm font-semibold text-sub">Date *<Input disabled={busy || Boolean(paymentAttempt)} type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
                    <label className="grid gap-1 text-sm font-semibold text-sub">Method *<Select disabled={busy || Boolean(paymentAttempt)} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as WagePaymentMethod)}>{WAGE_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentMethods[method]}</option>)}</Select></label>
                    <Button onClick={() => void perform(pay)} disabled={!selectedItemId || (!paymentAttempt && Boolean(paymentError)) || !paymentDate || busy || (!paymentAttempt && selectedRecordChanged)}><CreditCard size={16} /> {busy ? "Recording" : paymentAttempt ? "Retry same payment" : "Record payment"}</Button>
                    {amount && paymentError && !paymentAttempt ? <p id="wage-payment-error" role="alert" className="text-sm text-danger">{paymentError}</p> : null}
                    <label className="grid gap-1 text-sm font-semibold text-sub xl:col-span-2">Reference<Input maxLength={120} disabled={busy || Boolean(paymentAttempt)} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transaction reference" /></label>
                  </div>
                ) : null}
                {canUpdate && !cancelled ? (
                  <div className="grid gap-3 border-t border-hairline pt-4 xl:grid-cols-2 md:items-end">
                    <label className="grid gap-1 text-sm font-semibold text-sub">Selected worker<Select disabled={busy || Boolean(paymentAttempt)} value={selectedItemId} onChange={(event) => { const item = detail.data?.items.find((candidate) => candidate.id === event.target.value); if (item) chooseItem(item); else setSelectedItemId(""); }}><option value="">Select worker</option>{detail.data.items.map((item) => <option key={item.id} value={item.id}>{item.workerName}</option>)}</Select></label>
                    <label className="grid gap-1 text-sm font-semibold text-sub">Adjustment<Input disabled={busy || Boolean(paymentAttempt)} invalid={Boolean(adjustmentError)} aria-describedby={adjustmentError ? "wage-adjustment-error" : undefined} type="number" step="0.01" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} /></label>
                    {adjustmentError ? <p role="alert" id="wage-adjustment-error" className="text-danger">{adjustmentError}</p> : null}
                    <Button onClick={() => void perform(saveAdjustment)} disabled={!selectedItemId || busy || Boolean(paymentAttempt) || (Boolean(adjustmentError) || selectedRecordChanged)}><Save size={16} /> {updateItem.isPending ? "Saving" : "Save adjustment"}</Button>
                    <label className="grid gap-1 text-sm font-semibold text-sub xl:col-span-2">Notes<Input maxLength={500} disabled={busy || Boolean(paymentAttempt)} value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="Adjustment note" /></label>
                  </div>
                ) : null}
              </>
            ) : <p role="alert" className="text-[14px] text-danger">{detail.error?.message ?? "Unable to load selected wage batch."} <Button onClick={() => void detail.refetch()}>Retry</Button></p>}
          </Card>
        </div>

        <Dialog open={cancelOpen} onOpenChange={closeCancel} title="Cancel wage batch" description="This keeps the wage snapshot, reverses Kharchi deductions, and allows the period to be generated again. Any recorded payment prevents cancellation.">
          <label className="grid gap-2 text-base">Reason *<Input autoFocus aria-describedby="wage-cancel-reason-help" minLength={2} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
          <p id="wage-cancel-reason-help" className="mt-2 text-sm text-sub">Enter 2 to 500 characters explaining the cancellation.</p>
          {failure ? <p role="alert" className="text-danger">{failure}</p> : null}
          <Button className="mt-4" variant="danger" disabled={busy || reason.trim().length < 2 || hasPayments || cancelled} onClick={() => void perform(async () => { await cancelBatch.mutateAsync({ batchId: selectedBatchId!, reason: reason.trim() }); setCancelOpen(false); setSelectedItemId(""); setMessage("Wage batch cancelled. Kharchi deductions reversed."); })}>{busy ? "Cancelling" : "Confirm cancellation"}</Button>
        </Dialog>

      </div>
    </>
  );
}
