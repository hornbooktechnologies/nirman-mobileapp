"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import { type ReactNode, useRef, useState } from "react";
import {
  calendarToday,
  isPaymentLedgerAvailable,
  isCalendarDate,
  moneyPaise,
  sourcePaymentFailure,
  type PaymentLedger,
  type RecordSourcePayment,
  type VoidSourcePayment,
  type SourcePaymentMethod,
} from "@nirman-app/shared";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api/api-client";
const money = (v: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v),
  );
export function SourcePaymentsPanel({
  org,
  project,
  source,
  id,
  parent,
  ledger,
  version,
  permissions,
  active,
  timezone,
  onSaved,
  compact = false,
  adjustmentAction,
}: {
  org: string;
  project: string;
  source: "materials" | "expenses";
  id: string;
  parent?: string;
  ledger: PaymentLedger;
  version: number;
  permissions: readonly string[];
  active: boolean;
  timezone: string;
  onSaved: () => void | Promise<unknown>;
  compact?: boolean;
  adjustmentAction?: ReactNode;
}) {
  const [form, setForm] = useState<"record" | string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => calendarToday(timezone));
  const [method, setMethod] = useState<SourcePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [failure, setFailure] = useState("");
  const locked =
    busy || uncertain || failure === "stale" || failure === "denied";
  const busyRef = useRef(false);
  const pending = useRef<{
    path: string;
    body: RecordSourcePayment | VoidSourcePayment;
  } | null>(null);
  const base = `/organizations/${org}/projects/${project}/${source}/${source === "materials" ? `${parent}/purchases/` : ""}${id}/payments`;
  async function submit() {
    if (busyRef.current || !form || failure === "stale" || failure === "denied")
      return;
    setError("");
    try {
      if (!pending.current) {
        if (form === "record") {
          if (
            !isCalendarDate(date) ||
            date > calendarToday(timezone) ||
            !/^\d{1,12}(?:\.\d{1,2})?$/.test(amount.trim()) ||
            moneyPaise(amount.trim()) <= BigInt(0) ||
            ledger.remainingAmount === null ||
            moneyPaise(amount.trim()) > moneyPaise(ledger.remainingAmount)
          )
            throw new Error("Enter a valid payment amount and date.");
          pending.current = {
            path: base,
            body: {
              amount: amount.trim(),
              paymentDate: date,
              paymentMethod: method,
              reference: reference.trim(),
              expectedVersion: version,
              idempotencyKey: crypto.randomUUID(),
            },
          };
        } else {
          if (reason.trim().length < 2)
            throw new Error("A reason is required to void this payment.");
          pending.current = {
            path: `${base}/${form}/void`,
            body: {
              reason: reason.trim(),
              expectedVersion: version,
              idempotencyKey: crypto.randomUUID(),
            },
          };
        }
      }
      busyRef.current = true;
      setBusy(true);
      await api.post(pending.current.path, pending.current.body);
      pending.current = null;
      setUncertain(false);
      setForm(null);
      setAmount("");
      setReason("");
      try {
        await onSaved();
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Refresh failed.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
      const kind = sourcePaymentFailure(
        e instanceof ApiError ? e.statusCode : undefined,
        e instanceof ApiError ? e.code : undefined,
      );
      if (pending.current && kind === "uncertain") setUncertain(true);
      else {
        pending.current = null;
        setUncertain(false);
        setFailure(kind === "uncertain" ? "" : kind);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (!ledger) return null;
  if (!isPaymentLedgerAvailable(ledger))
    return (
      <div className="space-y-3">
        {adjustmentAction}
        {compact && (
          <Button variant="outline" disabled>
            Record payment
          </Button>
        )}
        <p className="text-sm text-sub">
          Payment tracking is unavailable. Refresh to check again.
        </p>
        <RefreshButton
          variant="outline"
          onRefresh={async () => {
            await Promise.resolve()
              .then(onSaved)
              .catch(() => setError("Could not refresh the record."));
          }}
        >
          Refresh
        </RefreshButton>
        {error && <p role="alert">{error}</p>}
      </div>
    );
  return (
    <section className="space-y-3 border-t border-hairline pt-3">
      {!compact && (
        <>
          <h3 className="font-semibold">Payments</h3>
          <p className="text-sm">
            Paid {money(ledger.paidAmount)} · Remaining{" "}
            {ledger.remainingAmount === null
              ? "Cost not recorded"
              : money(ledger.remainingAmount)}{" "}
            · {ledger.paymentStatus.replaceAll("_", " ").toLowerCase()}
          </p>
          <p className="text-sm text-sub">
            Only recorded payments enter Total Expenses. Confirm historical
            payments explicitly.
          </p>
        </>
      )}
      {adjustmentAction}
      {(compact ||
        (active &&
          permissions.includes(`${source}:mark-paid`) &&
          ledger.remainingAmount !== null &&
          Number(ledger.remainingAmount) > 0)) && (
        <Button
          variant="outline"
          disabled={
            busy ||
            uncertain ||
            !active ||
            !permissions.includes(`${source}:mark-paid`) ||
            ledger.remainingAmount === null ||
            Number(ledger.remainingAmount) <= 0
          }
          onClick={() => {
            setAmount("");
            setDate(calendarToday(timezone));
            setMethod("CASH");
            setReference("");
            setFailure("");
            setForm("record");
            setError("");
          }}
        >
          Record payment
        </Button>
      )}
      {!compact && (
        <ol className="space-y-2">
          {ledger.payments.map((p) => (
            <li key={p.id} className="rounded-lg bg-surface p-2 text-sm">
              <p>
                {money(p.amount)} · {p.paymentDate} ·{" "}
                {p.paymentMethod.replaceAll("_", " ")}
              </p>
              <p className="text-sub">
                {p.recordedBy} ·{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  timeZone: timezone,
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(p.recordedAt))}{" "}
                · {p.reference || "No reference"}
              </p>
              {p.voidedAt ? (
                <p>
                  Voided by {p.voidedBy}: {p.voidReason}
                </p>
              ) : (
                active &&
                permissions.includes(`${source}:void-payment`) && (
                  <Button
                    variant="ghost"
                    disabled={locked}
                    onClick={() => {
                      setFailure("");
                      setReason("");
                      setForm(p.id);
                      setError("");
                    }}
                  >
                    Void mistaken payment
                  </Button>
                )
              )}
            </li>
          ))}
        </ol>
      )}
      {form && (
        <div className="space-y-3 rounded-lg border border-hairline p-3">
          <h4 className="font-semibold">
            {form === "record" ? "Record payment" : "Void mistaken payment"}
          </h4>
          {form === "record" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Amount
                <input
                  aria-label="Payment amount"
                  inputMode="decimal"
                  value={amount}
                  disabled={locked}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full rounded-lg border p-2"
                />
              </label>
              <label>
                Payment date
                <input
                  type="date"
                  value={date}
                  max={calendarToday(timezone)}
                  disabled={locked}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full rounded-lg border p-2"
                />
              </label>
              <label>
                Method
                <select
                  value={method}
                  disabled={locked}
                  onChange={(e) =>
                    setMethod(e.target.value as SourcePaymentMethod)
                  }
                  className="block w-full rounded-lg border p-2"
                >
                  {[
                    "CASH",
                    "UPI",
                    "BANK_TRANSFER",
                    "CARD",
                    "CHEQUE",
                    "OTHER",
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reference
                <input
                  value={reference}
                  maxLength={160}
                  disabled={locked}
                  onChange={(e) => setReference(e.target.value)}
                  className="block w-full rounded-lg border p-2"
                />
              </label>
            </div>
          ) : (
            <label>
              Reason
              <textarea
                value={reason}
                maxLength={2000}
                disabled={locked}
                onChange={(e) => setReason(e.target.value)}
                className="block w-full rounded-lg border p-2"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          {failure === "stale" && (
            <div role="alert">
              <p>
                This record changed. Refresh and review the latest balance
                before recording again.
              </p>
              <RefreshButton
                variant="outline"
                disabled={busy}
                onRefresh={async () => {
                  await Promise.resolve()
                    .then(onSaved)
                    .then(() => {
                      setFailure("");
                      setForm(null);
                    })
                    .catch(() =>
                      setError("Could not refresh the record. Try again."),
                    );
                }}
              >
                Refresh record
              </RefreshButton>
            </div>
          )}
          {failure === "denied" && (
            <p role="alert">
              This payment action is no longer available. Close and refresh
              project access.
            </p>
          )}
          {uncertain && (
            <p role="status">
              Outcome uncertain. Retry the same command before making another
              change.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              disabled={busy || failure === "stale" || failure === "denied"}
              onClick={() => void submit()}
            >
              {busy ? "Saving…" : uncertain ? "Retry same command" : "Confirm"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || uncertain}
              onClick={() => {
                setForm(null);
                pending.current = null;
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
