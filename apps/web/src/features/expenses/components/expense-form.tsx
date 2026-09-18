"use client";
import { useRef, useState, type FormEvent } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  type ExpenseAvailableAction,
  type SiteExpenseDetail,
} from "@nirman-app/shared";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { workToday, validDate } from "@/features/attendance/date-utils";
import { ApiError } from "@/lib/api/api-client";
import {
  amountError,
  commandFailure,
  expenseActions,
  label,
  retainAttempt,
} from "../expense-rules";
import { useExpenseWrite } from "../hooks/use-expenses";
import { useExpenseDialog } from "../hooks/use-expense-dialog";
import type { ExpenseWrite } from "../services/expenses.service";
import type { ExpensesContext } from "./expenses-workspace";
import { money } from "./expenses-ui";

export function ExpenseForm({
  context,
  action,
  detail,
  close,
  saved,
  refresh,
}: {
  context: ExpensesContext;
  action: ExpenseAvailableAction | "CREATE";
  detail?: SiteExpenseDetail;
  close: () => void;
  saved: (record: SiteExpenseDetail) => void;
  refresh: () => Promise<SiteExpenseDetail | undefined>;
}) {
  const request = action === "CREATE" || action === "EDIT";
  const adjustment = action === "ADJUST";
  const reasonRequired = ["REJECT", "CANCEL", "ADJUST"].includes(action);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    expenseDate: detail?.expenseDate ?? workToday("Asia/Kolkata"),
    category: detail?.category ?? "MISCELLANEOUS",
    description: detail?.description ?? "",
    amount: request ? (detail?.amount ?? "") : "",
    paymentMethod: detail?.paymentMethod ?? "",
    vendorPayee: detail?.vendorPayee ?? "",
    recordAs: "SUBMIT",
    direction: "INCREASE",
    reason: "",
  }));
  const [reviewed, setReviewed] = useState(detail);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [denied, setDenied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [attempt, setAttempt] = useState<{
    input: Record<string, unknown>;
    idempotencyKey: string;
  } | null>(null);
  const { busyRef, mountedRef, requestClose } = useExpenseDialog(
    dirty,
    Boolean(attempt),
    close,
  );
  const form = useRef<HTMLFormElement>(null);
  const write = useExpenseWrite(context.org, context.project);
  const allowed =
    context.active &&
    (action === "CREATE"
      ? context.permissions.includes("expenses:create")
      : expenseActions(
          detail?.availableActions ?? [],
          context.permissions,
          true,
        ).includes(action));
  const change = (name: string, value: string) => {
    setDirty(true);
    setValues((v) => ({ ...v, [name]: value }));
  };
  const errorProps = (name: string) => ({
    invalid: Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name: string) =>
    errors[name] ? (
      <span
        id={`${name}-error`}
        className="block text-sm text-danger"
        role="alert"
      >
        {errors[name]}
      </span>
    ) : null;
  function field(
    name: string,
    title: string,
    type = "text",
    required = false,
    maxLength = 160,
  ) {
    return (
      <label className="block space-y-1">
        {title}
        {required ? " *" : ""}
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          inputMode={name === "amount" ? "decimal" : undefined}
          max={type === "date" ? workToday("Asia/Kolkata") : undefined}
          value={values[name] ?? ""}
          {...errorProps(name)}
          onChange={(e) => change(name, e.target.value)}
        />
        {errorText(name)}
      </label>
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current || stale || denied || !allowed) return;
    const value = (name: string) => (values[name] ?? "").trim();
    if (!attempt) {
      const next: Record<string, string> = {};
      if (request) {
        if (
          !validDate(value("expenseDate")) ||
          value("expenseDate") > workToday("Asia/Kolkata")
        )
          next.expenseDate =
            "Choose a valid date, today or earlier (India time).";
        if (
          value("description").length < 2 ||
          value("description").length > 1000
        )
          next.description =
            "Enter a description between 2 and 1,000 characters.";
      }
      if (request || adjustment) {
        const error = amountError(
          value("amount"),
          reviewed?.recognizedAmount,
          adjustment && values.direction === "DECREASE",
        );
        if (error) next.amount = error;
      }
      if (reasonRequired && value("reason").length < 2)
        next.reason = "Enter a reason of at least 2 characters.";
      setErrors(next);
      if (Object.keys(next).length) {
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
            ?.focus(),
        );
        return;
      }
    }
    const input: Record<string, unknown> = request
      ? {
          expenseDate: value("expenseDate"),
          category: values.category,
          description: value("description"),
          amount: Number(value("amount")),
          paymentMethod: values.paymentMethod || null,
          vendorPayee: value("vendorPayee") || null,
          ...(action === "CREATE"
            ? { saveAsDraft: values.recordAs === "DRAFT" }
            : {}),
        }
      : adjustment
        ? {
            amount:
              Number(value("amount")) *
              (values.direction === "DECREASE" ? -1 : 1),
            reason: value("reason"),
          }
        : { reason: value("reason") || null };
    if (action !== "CREATE") input.expectedVersion = reviewed?.version;
    const current = retainAttempt(attempt, input, () => crypto.randomUUID());
    setAttempt(current);
    busyRef.current = true;
    try {
      const record = await write.mutateAsync({
        action,
        id: detail?.id,
        input: { ...current.input, idempotencyKey: current.idempotencyKey },
      } as ExpenseWrite);
      if (mountedRef.current) saved(record);
    } catch (error) {
      if (!mountedRef.current) return;
      const e = error instanceof ApiError ? error : undefined;
      const kind = commandFailure(e?.statusCode, e?.code);
      if (kind !== "uncertain") setAttempt(null);
      setStale(kind === "stale");
      setDenied(kind === "denied");
    } finally {
      busyRef.current = false;
    }
  }
  async function reviewLatest() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const latest = await refresh();
      if (!mountedRef.current) return;
      if (!latest) {
        setRefreshError(
          "Could not reload the expense. Retry before continuing.",
        );
        return;
      }
      setReviewed(latest);
      setStale(false);
      setAttempt(null);
      setDenied(
        !expenseActions(
          latest.availableActions,
          context.permissions,
          context.active,
        ).includes(action),
      );
      write.reset();
    } catch {
      if (mountedRef.current)
        setRefreshError(
          "Could not reload the expense. Retry before continuing.",
        );
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }
  return (
    <Dialog
      open
      title={
        action === "CREATE"
          ? "Record site expense"
          : action === "ADJUST"
            ? "Adjust approved expense"
            : `${label(action)} expense`
      }
      description={
        request
          ? "Record the actual expense. Approved records can only be corrected through adjustments."
          : "This action will be recorded in the immutable expense history."
      }
      className="max-w-2xl"
      onOpenChange={requestClose}
      footer={
        <>
          <Button
            variant="outline"
            disabled={write.isPending}
            onClick={requestClose}
          >
            Close
          </Button>
          <Button
            form="expense-form"
            type="submit"
            disabled={write.isPending || stale || denied || !allowed}
            variant={
              action === "CANCEL" || action === "REJECT" ? "danger" : "primary"
            }
          >
            {write.isPending
              ? "Saving…"
              : attempt
                ? "Retry original request"
                : action === "CREATE"
                  ? values.recordAs === "DRAFT"
                    ? "Save draft"
                    : "Record and submit"
                  : action === "EDIT"
                    ? "Save changes"
                    : `Confirm ${label(action).toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form
        id="expense-form"
        ref={form}
        noValidate
        onSubmit={submit}
        className="space-y-5 text-base"
      >
        {reviewed && (
          <div className="rounded-inner border border-hairline p-3">
            <p>{reviewed.description}</p>
            <p className="text-sm">
              Version {reviewed.version} · {label(reviewed.status)} ·{" "}
              {label(reviewed.workflowMode)}
            </p>
            <p>
              Original: {money(reviewed.amount)} · Recognized:{" "}
              {money(reviewed.recognizedAmount)}
            </p>
          </div>
        )}
        {write.isError && (
          <p role="alert" className="text-danger">
            {write.error.message}
          </p>
        )}
        {attempt && write.isError && (
          <p role="status">
            The result is uncertain. Retry the original request with the same
            values and key to recover safely.
          </p>
        )}
        {stale && (
          <div role="alert" className="space-y-2">
            <p>
              {action === "CREATE"
                ? "The retry key or workflow conflicts. Close and check the list before recording another expense."
                : "The expense changed. Reload and review its latest amount, status, and history before submitting again. Your inputs are preserved."}
            </p>
            {action !== "CREATE" && (
              <Button
                variant="outline"
                disabled={refreshing}
                onClick={() => void reviewLatest()}
              >
                {refreshing ? "Reloading…" : "Reload latest expense"}
              </Button>
            )}
          </div>
        )}
        {refreshError && (
          <p role="alert" className="text-danger">
            {refreshError}
          </p>
        )}
        {(denied || !allowed) && (
          <p role="alert">
            This action is no longer available. Close and refresh project
            access.
          </p>
        )}
        <fieldset
          disabled={
            write.isPending || Boolean(attempt) || stale || denied || !allowed
          }
          className="grid gap-4 sm:grid-cols-2"
        >
          {request && (
            <>
              {field("expenseDate", "Expense date", "date", true)}
              <label>
                Category *
                <Select
                  name="category"
                  value={values.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="sm:col-span-2">
                Description *
                <Textarea
                  id="description"
                  name="description"
                  maxLength={1000}
                  value={values.description}
                  {...errorProps("description")}
                  onChange={(e) => change("description", e.target.value)}
                />
                {errorText("description")}
              </label>
            </>
          )}
          {adjustment && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-2">Adjustment direction *</legend>
              <div className="flex flex-wrap gap-4">
                {["INCREASE", "DECREASE"].map((v) => (
                  <label key={v} className="flex min-h-11 items-center gap-2">
                    <input
                      type="radio"
                      name="direction"
                      value={v}
                      checked={values.direction === v}
                      onChange={() => change("direction", v)}
                    />
                    {label(v)}
                  </label>
                ))}
              </div>
              <p className="text-sm text-sub">
                A decrease cannot exceed{" "}
                {money(reviewed?.recognizedAmount ?? "0")}. The API calculates
                the resulting recognized cost.
              </p>
            </fieldset>
          )}
          {(request || adjustment) &&
            field(
              "amount",
              adjustment ? "Adjustment amount (INR)" : "Amount (INR)",
              "text",
              true,
              18,
            )}
          {request && (
            <>
              <label>
                Payment method
                <Select
                  value={values.paymentMethod}
                  onChange={(e) => change("paymentMethod", e.target.value)}
                >
                  <option value="">Not specified</option>
                  {EXPENSE_PAYMENT_METHODS.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </Select>
              </label>
              {field("vendorPayee", "Vendor / payee")}
              {action === "CREATE" && (
                <label>
                  Record as *
                  <Select
                    value={values.recordAs}
                    onChange={(e) => change("recordAs", e.target.value)}
                  >
                    <option value="SUBMIT">Submit now</option>
                    <option value="DRAFT">Save draft</option>
                  </Select>
                </label>
              )}
              {action === "EDIT" && (
                <p className="text-sm sm:col-span-2">
                  Saving edits preserves the current status. Submit the draft or
                  rejected expense from the detail when ready.
                </p>
              )}
            </>
          )}
          {!request && (
            <label className="sm:col-span-2">
              Reason{reasonRequired ? " *" : ""}
              <Textarea
                id="reason"
                name="reason"
                maxLength={2000}
                value={values.reason}
                {...errorProps("reason")}
                onChange={(e) => change("reason", e.target.value)}
              />
              {errorText("reason")}
            </label>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
