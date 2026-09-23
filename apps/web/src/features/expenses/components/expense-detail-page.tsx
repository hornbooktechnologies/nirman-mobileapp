"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ExpenseAvailableAction } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { safeFinancialReturn } from "@/features/financial-return";
import { useExpenseDetail } from "../hooks/use-expenses";
import { expenseActions, label } from "../expense-rules";
import { ExpensesWorkspace, type ExpensesContext } from "./expenses-workspace";
import { date, money, Facts, Failure, ExpenseStatusBadge } from "./expenses-ui";
import { ExpenseForm } from "./expense-form";

export function ExpenseDetailPage({
  projectId,
  id,
}: {
  projectId: string;
  id: string;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading expense" />}>
      <ExpensesWorkspace projectId={projectId}>
        {(context) => <Detail key={id} context={context} id={id} />}
      </ExpensesWorkspace>
    </Suspense>
  );
}
function Detail({ context, id }: { context: ExpensesContext; id: string }) {
  const query = useExpenseDetail(context.org, context.project, id);
  const search = useSearchParams();
  const [action, setAction] = useState<ExpenseAvailableAction | null>(null);
  const [notice, setNotice] = useState(
    search.get("created") === "1"
      ? "Expense saved. Review its status and available actions below."
      : "",
  );
  const refresh = async () => {
    const result = await query.refetch();
    return result.isError ? undefined : result.data;
  };
  if (query.isPending) return <LoadingState label="Loading expense" />;
  if ((query.isError && !action) || !query.data)
    return (
      <Failure
        error={query.error ?? new Error("Expense unavailable")}
        retry={() => void query.refetch()}
      />
    );
  const d = query.data;
  const actions = expenseActions(
    d.availableActions,
    context.permissions,
    context.active && !query.isError,
  );
  const timestamp = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-IN", {
          timeZone: context.timezone,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "Not provided";
  return (
    <div className="space-y-5">
      <Link
        className="underline"
        href={safeFinancialReturn(search.get("returnTo"), context.project, "expenses")}
      >
        Back to Site Expenses
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-sub">
            {label(d.category)} · {date(d.expenseDate)}
          </p>
          <h1 className="break-words text-2xl font-semibold">
            {d.description}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ExpenseStatusBadge status={d.status} />
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>
      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      {query.isError && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Current state and next step</h2>
        <p className="text-sm text-sub">{d.status === "PENDING_APPROVAL" ? "Awaiting a separate authorized reviewer. Only a permitted action can approve or reject this expense." : d.status === "APPROVED" ? "Recognized cost includes the approved original amount and signed adjustments." : d.status === "DRAFT" ? "Draft expense. Submit when the details are ready." : d.status === "REJECTED" ? "Rejected expense. Review the reason and available actions." : "Cancelled expense. No further changes are allowed."}</p>
        {actions.length ? <div aria-label="Available expense actions" className="flex flex-wrap gap-3">{actions.map(value => <Button key={value} variant={value === "APPROVE" || value === "SUBMIT" ? "primary" : value === "CANCEL" || value === "REJECT" ? "danger" : "outline"} disabled={query.isFetching} onClick={() => setAction(value as ExpenseAvailableAction)}>{label(value)}</Button>)}</div> : <p className="text-sm text-sub">No actions available for this expense.</p>}
      </Card>
      <section
        aria-label="Expense amounts"
        className="grid gap-3 sm:grid-cols-3"
      >
        {[
          ["Original amount", d.amount],
          ["Signed adjustments", d.adjustmentTotal],
          ["Recognized cost", d.recognizedAmount],
        ].map(([title, value]) => (
          <Card key={title}>
            <p className="text-sm text-sub">{title}</p>
            <p className="break-words text-2xl font-semibold tabular-nums">
              {money(value)}
            </p>
          </Card>
        ))}
      </section>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Expense details</h2>
        <Facts
          rows={[
            ["Vendor / payee", d.vendorPayee],
            [
              "Payment method",
              d.paymentMethod ? label(d.paymentMethod) : "Not specified",
            ],
            ["Recorded by", d.recordedBy],
            ["Workflow snapshot", label(d.workflowMode)],
            ["Approved by", d.approvedBy],
            ["Approved at", timestamp(d.approvedAt)],
          ]}
        />
        {d.rejectionReason && (
          <div role="note" className="rounded-inner border border-hairline p-3">
            <p className="font-semibold">Rejection reason</p>
            <p className="whitespace-pre-wrap break-words">
              {d.rejectionReason}
            </p>
          </div>
        )}
      </Card>
      {d.status === "APPROVED" && (
        <p className="text-sm text-sub">
          Approved expenses are immutable. Authorized users can record a signed
          adjustment.
        </p>
      )}
      {d.status === "CANCELLED" && (
        <p className="text-sm text-sub">
          This expense is cancelled and cannot be changed.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">
            Adjustments ({d.adjustments.length})
          </h2>
          {!d.adjustments.length ? (
            <p>No adjustments recorded.</p>
          ) : (
            <ol className="space-y-4">
              {d.adjustments.map((a) => (
                <li
                  key={a.id}
                  className="space-y-1 border-b border-hairline pb-4 last:border-0"
                >
                  <p className="font-semibold tabular-nums">
                    {Number(a.amount) < 0 ? "Decrease" : "Increase"} ·{" "}
                    {money(a.amount)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{a.reason}</p>
                  <p className="text-sm text-sub">
                    {a.recordedBy} · {timestamp(a.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">History ({d.events.length})</h2>
          <ol className="space-y-4">
            {d.events.map((e) => (
              <li
                key={e.id}
                className="space-y-1 border-l-2 border-hairline pl-4"
              >
                <p className="font-semibold">{label(e.eventType)}</p>
                <p className="text-sm">
                  {e.previousStatus ? `${label(e.previousStatus)} → ` : ""}
                  {label(e.nextStatus)}
                </p>
                {e.comment && (
                  <p className="whitespace-pre-wrap break-words">{e.comment}</p>
                )}
                <p className="text-sm text-sub">
                  {e.actorName} · {timestamp(e.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      {context.permissions.includes("materials:read") && <Card className="space-y-2"><h2 className="text-lg font-semibold">Related project work</h2><p className="text-sm text-sub">This expense has no automatic link to a Materials purchase.</p><Link className="underline" href={`/projects/${context.project}/materials`}>View project Materials</Link></Card>}
      <details className="rounded-card border border-hairline p-4 text-sm text-sub"><summary className="cursor-pointer font-semibold">Record metadata</summary><p>Created {timestamp(d.createdAt)} · Updated {timestamp(d.updatedAt)} · Version {d.version}</p><p className="break-all">Expense ID {d.id}</p></details>
      {action && (
        <ExpenseForm
          context={{ ...context, active: context.active && !query.isError }}
          action={action}
          detail={d}
          close={() => setAction(null)}
          refresh={refresh}
          saved={() => {
            setNotice("Expense updated successfully.");
            setAction(null);
          }}
        />
      )}
    </div>
  );
}
