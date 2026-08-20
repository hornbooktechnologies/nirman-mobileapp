"use client";

import Link from "next/link";
import { Banknote, CalendarDays, Check, CreditCard, Download, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, Input, PageHeader, Select, StatusBadge } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
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

const today = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const monthStart = () => `${today().slice(0, 8)}01`;

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

const remainingAmount = (item: WageItem) =>
  Math.max(0, Number(item.netAmount) - Number(item.paidAmount)).toFixed(2);

export function WagesPage({ projectId }: { projectId: string }) {
  const { activeOrganizationId, hasPermission } = useAuth();
  const organizationId = activeOrganizationId ?? "";
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<WagePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const canGenerate = hasPermission("wages:generate");
  const canPay = hasPermission("wages:mark-paid");
  const canUpdate = hasPermission("wages:update");
  const canExport = hasPermission("wages:export");
  const preview = useWagePreview(organizationId, projectId, periodStart, periodEnd, previewRequested);
  const batches = useWageBatches(organizationId, projectId);
  const createBatch = useCreateWageBatch(organizationId, projectId);
  const detail = useWageBatchDetail(organizationId, projectId, selectedBatchId);
  const recordPayment = useRecordWagePayment(organizationId, projectId);
  const updateItem = useUpdateWageItem(organizationId, projectId);

  const selectedItem = useMemo(
    () => detail.data?.items.find((item) => item.id === selectedItemId) ?? null,
    [detail.data?.items, selectedItemId],
  );
  const previewReady = Boolean(preview.data?.items.length) && !preview.data?.items.some((item) => !item.isReady);

  async function confirmBatch() {
    setMessage("");
    const created = await createBatch.mutateAsync({ periodStart, periodEnd });
    setSelectedBatchId(created.id);
    setMessage("Wage batch confirmed.");
  }

  async function pay() {
    if (!selectedItem || !amount) return;
    setMessage("");
    const updated = await recordPayment.mutateAsync({
      wageItemId: selectedItem.id,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference: reference || null,
      idempotencyKey: `${selectedItem.id}-${paymentDate}-${amount}-${Date.now()}`,
    });
    setSelectedBatchId(updated.id);
    setSelectedItemId("");
    setAmount("");
    setReference("");
    setMessage("Wage payment recorded.");
  }

  async function saveAdjustment() {
    if (!selectedItem) return;
    setMessage("");
    const updated = await updateItem.mutateAsync({
      wageItemId: selectedItem.id,
      adjustmentAmount: adjustmentAmount === "" ? undefined : Number(adjustmentAmount),
      notes: itemNotes || null,
    });
    setSelectedBatchId(updated.id);
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
    setSelectedItemId(item.id);
    setAmount(remainingAmount(item));
    setAdjustmentAmount(item.adjustmentAmount);
    setItemNotes(item.notes ?? "");
  }

  return (
    <PermissionGuard permission="wages:read">
      <div className="space-y-4 pb-8">
        <PageHeader
          title="Wages"
          description="Generate wage batches from attendance and record worker payments."
          onBack={() => window.history.back()}
          actions={<Link href={`/projects/${projectId}`}><Button variant="outline">Project</Button></Link>}
        />

        <Card className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[180px_180px_auto] md:items-end">
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">
              Period start
              <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">
              Period end
              <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </label>
            <Button onClick={() => setPreviewRequested(true)} disabled={!organizationId || preview.isFetching}>
              <CalendarDays size={16} />
              {preview.isFetching ? "Generating" : "Generate preview"}
            </Button>
          </div>
          {preview.isError ? <p className="text-[13px] text-red-600">Unable to generate wage preview.</p> : null}
        </Card>

        {preview.data ? (
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-body">Preview</p>
                <p className="text-[12px] text-sub">{preview.data.items.length} workers with attendance in this period</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-sub">Net payable</p>
                <p className="text-xl font-bold text-body">{currency(preview.data.totals.netAmount)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13px]">
                <thead className="bg-sunken text-[11px] uppercase tracking-[0.12em] text-sub">
                  <tr><th className="px-3 py-2">Worker</th><th>Days</th><th>Rate</th><th>Gross</th><th>Net</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {preview.data.items.map((item) => (
                    <tr key={item.workerAssignmentId}>
                      <td className="px-3 py-2"><span className="font-semibold">{item.workerName}</span><span className="block text-[11px] text-sub">{item.workerCode} - {item.trade}</span></td>
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
            {canGenerate ? <Button onClick={confirmBatch} disabled={!previewReady || createBatch.isPending}><Check size={16} /> {createBatch.isPending ? "Confirming" : "Confirm wage batch"}</Button> : null}
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="space-y-3">
            <p className="font-semibold text-body">Confirmed batches</p>
            {batches.isLoading ? <p className="text-[13px] text-sub">Loading batches</p> : null}
            {(batches.data ?? []).map((batch) => (
              <button key={batch.id} type="button" onClick={() => setSelectedBatchId(batch.id)} className="block w-full rounded-inner border border-hairline p-3 text-left hover:bg-sunken">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{batch.periodStart} to {batch.periodEnd}</span>
                  <StatusBadge tone={batchTone[batch.status]}>{batch.status}</StatusBadge>
                </div>
                <p className="mt-1 text-[12px] text-sub">Net {currency(batch.totals.netAmount)} - Paid {currency(batch.totals.paidAmount)}</p>
              </button>
            ))}
            {!batches.isLoading && !(batches.data ?? []).length ? <p className="text-[13px] text-sub">No wage batches yet.</p> : null}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <Banknote size={18} />
              <p className="font-semibold text-body">Batch detail</p>
            </div>
            {!selectedBatchId ? <p className="text-[13px] text-sub">Select a confirmed batch to view items and record payments.</p> : detail.isLoading ? <p className="text-[13px] text-sub">Loading batch</p> : detail.data ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid flex-1 gap-2 text-[13px] sm:grid-cols-4">
                  <div><p className="text-sub">Gross</p><p className="font-semibold">{currency(detail.data.totals.grossAmount)}</p></div>
                  <div><p className="text-sub">Deductions</p><p className="font-semibold">{currency(detail.data.totals.kharchiDeduction)}</p></div>
                  <div><p className="text-sub">Net</p><p className="font-semibold">{currency(detail.data.totals.netAmount)}</p></div>
                  <div><p className="text-sub">Paid</p><p className="font-semibold">{currency(detail.data.totals.paidAmount)}</p></div>
                  </div>
                  {canExport ? <Button variant="outline" onClick={exportBatch} disabled={isExporting}><Download size={16} /> {isExporting ? "Exporting" : "Export"}</Button> : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[13px]">
                    <thead className="bg-sunken text-[11px] uppercase tracking-[0.12em] text-sub">
                      <tr><th className="px-3 py-2">Worker</th><th>Net</th><th>Paid</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {detail.data.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2"><span className="font-semibold">{item.workerName}</span><span className="block text-[11px] text-sub">{item.presentDays} P / {item.halfDays} H</span></td>
                          <td>{currency(item.netAmount)}</td>
                          <td>{currency(item.paidAmount)}</td>
                          <td><StatusBadge tone={item.paymentStatus === "PAID" ? "success" : item.paymentStatus === "PARTIALLY_PAID" ? "active" : "warning"}>{item.paymentStatus}</StatusBadge></td>
                          <td>{(canPay || canUpdate) ? <Button size="sm" variant="outline" onClick={() => chooseItem(item)}>{item.paymentStatus !== "PAID" ? "Select" : "Edit"}</Button> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canPay ? (
                  <div className="grid gap-3 border-t border-hairline pt-4 md:grid-cols-[1fr_140px_150px_150px_auto] md:items-end">
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Worker<Select value={selectedItemId} onChange={(event) => { const item = detail.data?.items.find((candidate) => candidate.id === event.target.value); if (item) chooseItem(item); else setSelectedItemId(""); }}><option value="">Select worker</option>{detail.data.items.filter((item) => item.paymentStatus !== "PAID").map((item) => <option key={item.id} value={item.id}>{item.workerName} - due {currency(remainingAmount(item))}</option>)}</Select></label>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Amount<Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Date<Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Method<Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as WagePaymentMethod)}>{WAGE_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{paymentMethods[method]}</option>)}</Select></label>
                    <Button onClick={pay} disabled={!selectedItemId || !amount || recordPayment.isPending}><CreditCard size={16} /> {recordPayment.isPending ? "Recording" : "Record payment"}</Button>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub md:col-span-5">Reference<Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Optional transaction reference" /></label>
                  </div>
                ) : null}
                {canUpdate ? (
                  <div className="grid gap-3 border-t border-hairline pt-4 md:grid-cols-[1fr_180px_auto] md:items-end">
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Selected worker<Select value={selectedItemId} onChange={(event) => { const item = detail.data?.items.find((candidate) => candidate.id === event.target.value); if (item) chooseItem(item); else setSelectedItemId(""); }}><option value="">Select worker</option>{detail.data.items.map((item) => <option key={item.id} value={item.id}>{item.workerName}</option>)}</Select></label>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub">Adjustment<Input type="number" step="0.01" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} /></label>
                    <Button onClick={saveAdjustment} disabled={!selectedItemId || updateItem.isPending}><Save size={16} /> {updateItem.isPending ? "Saving" : "Save adjustment"}</Button>
                    <label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sub md:col-span-3">Notes<Input value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} placeholder="Optional adjustment note" /></label>
                  </div>
                ) : null}
              </>
            ) : <p className="text-[13px] text-red-600">Unable to load selected wage batch.</p>}
          </Card>
        </div>

        {message ? <p className="text-[13px] text-success">{message}</p> : null}
        {createBatch.isError || recordPayment.isError || updateItem.isError ? <p className="text-[13px] text-red-600">Unable to complete wage action. Check permissions, payment amount, and wage readiness.</p> : null}
      </div>
    </PermissionGuard>
  );
}
