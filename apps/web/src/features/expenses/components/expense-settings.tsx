"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  EXPENSE_WORKFLOW_MODES,
  type ExpenseWorkflowMode,
} from "@nirman-app/shared";
import { Button, Dialog } from "@/components/ui";
import { ApiError } from "@/lib/api/api-client";
import {
  commandFailure,
  expenseKey,
  label,
  retainAttempt,
} from "../expense-rules";
import { expensesService } from "../services/expenses.service";
import { useExpenseDialog } from "../hooks/use-expense-dialog";
import type { ExpenseSettings } from "../types/expenses.types";
import type { ExpensesContext } from "./expenses-workspace";

export function ExpenseSettingsDialog({
  context,
  settings,
  close,
  saved,
}: {
  context: ExpensesContext;
  settings: ExpenseSettings;
  close: () => void;
  saved: () => void;
}) {
  const [mode, setMode] = useState<ExpenseWorkflowMode>(
    settings.workflowMode ?? "DIRECT",
  );
  const [dirty, setDirty] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState<{
    input: { workflowMode: ExpenseWorkflowMode };
    idempotencyKey: string;
  } | null>(null);
  const { busyRef, mountedRef, requestClose } = useExpenseDialog(
    dirty,
    Boolean(attempt),
    close,
  );
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: {
      workflowMode: ExpenseWorkflowMode;
      idempotencyKey: string;
    }) => expensesService.configure(context.org, context.project, input),
    retry: false,
  });
  const allowed =
    context.active && context.permissions.includes("expenses:configure");
  async function save() {
    if (busyRef.current || blocked || !allowed) return;
    const current = retainAttempt(attempt, { workflowMode: mode }, () =>
      crypto.randomUUID(),
    );
    setAttempt(current);
    busyRef.current = true;
    try {
      await mutation.mutateAsync({
        ...current.input,
        idempotencyKey: current.idempotencyKey,
      });
      if (!mountedRef.current) return;
      await cache.invalidateQueries({
        queryKey: expenseKey(context.org, context.project),
      });
      if (mountedRef.current) saved();
    } catch (error) {
      if (!mountedRef.current) return;
      const e = error instanceof ApiError ? error : undefined;
      const kind = commandFailure(e?.statusCode, e?.code);
      if (kind !== "uncertain") setAttempt(null);
      setBlocked(kind === "stale" || kind === "denied");
    } finally {
      busyRef.current = false;
    }
  }
  return (
    <Dialog
      open
      title="Expense workflow settings"
      onOpenChange={requestClose}
      description="The selected mode applies to new expenses. Existing expenses retain their original workflow."
      footer={
        <>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={requestClose}
          >
            Close
          </Button>
          <Button
            disabled={mutation.isPending || blocked || !allowed}
            onClick={() => void save()}
          >
            {mutation.isPending
              ? "Saving…"
              : attempt
                ? "Retry original request"
                : "Save workflow"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-base">
        {mutation.isError && (
          <p role="alert" className="text-danger">
            {mutation.error.message}
          </p>
        )}
        {attempt && mutation.isError && (
          <p role="status">
            The result is uncertain. Retry the same selection with its original
            key.
          </p>
        )}
        {blocked && (
          <p role="alert">
            Close this dialog and refresh the workflow and project access before
            making another change.
          </p>
        )}
        <fieldset
          disabled={
            mutation.isPending || Boolean(attempt) || blocked || !allowed
          }
          className="space-y-3"
        >
          <legend className="mb-2 font-semibold">Workflow *</legend>
          {EXPENSE_WORKFLOW_MODES.map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-3 rounded-inner border border-hairline p-4"
            >
              <input
                className="mt-1"
                type="radio"
                name="workflow"
                value={value}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  setDirty(true);
                }}
              />
              <span>
                <span className="block font-semibold">{label(value)}</span>
                <span className="block text-sm text-sub">
                  {value === "DIRECT"
                    ? "Submitting approves the expense immediately."
                    : "A separate authorized reviewer must approve submitted expenses."}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
    </Dialog>
  );
}
