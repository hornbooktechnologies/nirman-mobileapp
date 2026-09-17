"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { KHARCHI_PAYMENT_METHODS, type KharchiAdvanceDetail, type KharchiPaymentMethod } from "@nirman-app/shared";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { workToday, validDate } from "@/features/attendance/date-utils";
import { ApiError } from "@/lib/api/api-client";
import { amountError, kharchiKey, retainAttempt, uncertainFailure } from "../kharchi-rules";
import { useKharchiWrite } from "../hooks/use-kharchi";
import { kharchiService, type AdvanceInput, type AdjustmentInput } from "../services/kharchi.service";
import type { KharchiContext } from "./kharchi-workspace";

export function KharchiForm({ context, detail, close, saved, refresh }: { context: KharchiContext; detail?: KharchiAdvanceDetail; close: () => void; saved: (record: KharchiAdvanceDetail) => void; refresh: () => void }) {
  const [date, setDate] = useState(() => workToday("Asia/Kolkata"));
  const [worker, setWorker] = useState("");
  const [search, setSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [page, setPage] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<KharchiPaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [decrease, setDecrease] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState<{ input: AdvanceInput | AdjustmentInput; idempotencyKey: string } | null>(null);
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const mutation = useKharchiWrite(context.org, context.project, detail?.id);
  useEffect(() => { const timer = setTimeout(() => setWorkerSearch(search), 300); return () => clearTimeout(timer); }, [search]);
  const roster = useQuery({ queryKey: [...kharchiKey(context.org, context.project), "eligible", date, workerSearch, page], queryFn: () => kharchiService.eligible(context.org, context.project, date, workerSearch, page), enabled: !detail && validDate(date) && context.permissions.includes("workers:read") });
  const dirty = Boolean(amount || worker || reference || notes || attempt);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => { if ((event.target as Element).closest("a[href]") && !window.confirm("Discard the unsaved Kharchi form?")) { event.preventDefault(); event.stopPropagation(); } };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function requestClose() { if (!lock.current && (!dirty || window.confirm(attempt ? "The previous result is uncertain. Closing loses its retry key; check the ledger before recording again. Close?" : "Discard this unsaved form?"))) close(); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current) return;
    const next: Record<string, string> = {};
    if (!attempt) {
      const moneyError = amountError(amount, detail && decrease ? detail.outstandingAmount : undefined);
      if (moneyError) next.amount = moneyError;
      if (detail && (notes.trim().length < 2 || notes.trim().length > 500)) next.notes = "Enter a reason of 2–500 characters.";
      if (!detail && !validDate(date)) next.date = "Choose a valid date paid.";
      if (!detail && !roster.data?.data.some(w => w.currentAssignment.id === worker)) next.worker = "Select an eligible worker for this date.";
      setErrors(next);
      if (Object.keys(next).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus()); return; }
    }
    const input = detail ? { amount: Number(amount) * (decrease ? -1 : 1), reason: notes.trim() } : { workerAssignmentId: worker, amount: Number(amount), requestDate: date, paymentMethod: method, paymentReference: reference.trim() || null, notes: notes.trim() || null };
    const current = retainAttempt(attempt, input, () => crypto.randomUUID());
    setAttempt(current); lock.current = true;
    try { const result = await mutation.mutateAsync({ ...current.input, idempotencyKey: current.idempotencyKey }); saved(result); }
    catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      if (!uncertainFailure(apiError?.statusCode)) setAttempt(null);
      if (apiError?.code === "KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE") { setErrors({ amount: "The balance has changed. Refresh the record, review the remaining amount, and submit again." }); refresh(); }
      if (apiError?.code?.includes("ASSIGNMENT") || apiError?.code === "KHARCHI_WORKER_INACTIVE") { setWorker(""); setErrors({ worker: apiError.message }); void roster.refetch(); }
    } finally { lock.current = false; }
  }
  const error = (name: string) => errors[name] ? <p id={`${name}-error`} role="alert" className="text-sm text-danger">{errors[name]}</p> : null;
  return <Dialog open title={detail ? "Correct advance" : "Record paid advance"} description="Record money already given to the worker. Corrections are permanent history entries." onOpenChange={requestClose} footer={<><Button variant="outline" disabled={mutation.isPending} onClick={requestClose}>Cancel</Button><Button type="submit" form="kharchi-form" disabled={mutation.isPending || (!detail && !attempt && (roster.isFetching || !context.permissions.includes("workers:read")))}>{mutation.isPending ? "Saving…" : attempt ? "Retry original request" : "Save record"}</Button></>}>
    <form id="kharchi-form" ref={form} onSubmit={submit} className="space-y-4 text-base">
      {mutation.isError && <p role="alert" className="text-danger">{mutation.error.message}</p>}
      {attempt && mutation.isError && <p role="status">The result is uncertain. Retry the original request to safely recover its result. Inputs remain locked to avoid a duplicate.</p>}
      <fieldset disabled={mutation.isPending || Boolean(attempt)} className="space-y-4">
        {!detail && <><label className="block">Date paid *<Input name="date" type="date" required value={date} invalid={Boolean(errors.date)} aria-describedby="date-error" onChange={e => { setDate(e.target.value); setWorker(""); setPage(1); }} />{error("date")}</label>
        {!context.permissions.includes("workers:read") ? <p role="alert">Worker selection requires workers:read for this project. Ask an administrator for access.</p> : <><label className="block">Find worker<Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); setWorker(""); }} /></label>
        {roster.isError && <p role="alert">{roster.error.message} <Button onClick={() => void roster.refetch()}>Retry worker lookup</Button></p>}
        <label className="block">Worker *<Select name="worker" required value={worker} disabled={roster.isFetching} invalid={Boolean(errors.worker)} aria-describedby="worker-error" onChange={e => setWorker(e.target.value)}><option value="">{roster.isFetching ? "Loading workers…" : "Choose worker"}</option>{roster.data?.data.map(w => <option key={w.currentAssignment.id} value={w.currentAssignment.id}>{w.name} · {w.workerCode} · {w.trade}</option>)}</Select>{error("worker")}</label>
        {roster.isSuccess && !roster.data.data.length && <p>No eligible workers match this date and search.</p>}
        <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); setWorker(""); }}>Previous workers</Button><span>{page} / {roster.data?.meta.pageCount || 1}</span><Button variant="outline" disabled={page >= (roster.data?.meta.pageCount || 1)} onClick={() => { setPage(page + 1); setWorker(""); }}>Next workers</Button></div></>}</>}
        {detail && <label className="block">Correction type<Select value={decrease ? "decrease" : "increase"} onChange={e => setDecrease(e.target.value === "decrease")}><option value="increase">Increase advance</option><option value="decrease">Decrease advance</option></Select><span className="text-sm">Outstanding: ₹{detail.outstandingAmount}</span></label>}
        <label className="block">Amount (INR) *<Input name="amount" inputMode="decimal" required value={amount} invalid={Boolean(errors.amount)} aria-describedby="amount-error" onChange={e => setAmount(e.target.value)} />{error("amount")}</label>
        {!detail && <><label className="block">Payment method *<Select value={method} onChange={e => setMethod(e.target.value as KharchiPaymentMethod)}>{KHARCHI_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replaceAll("_", " ")}</option>)}</Select></label><label className="block">Payment reference<Input maxLength={120} value={reference} onChange={e => setReference(e.target.value)} /></label></>}
        <label className="block">{detail ? "Reason *" : "Notes"}<Textarea name="notes" required={Boolean(detail)} maxLength={detail ? 500 : 2000} value={notes} aria-invalid={Boolean(errors.notes)} aria-describedby="notes-error" onChange={e => setNotes(e.target.value)} />{error("notes")}</label>
      </fieldset>
    </form>
  </Dialog>;
}
