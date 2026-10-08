"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import { SourcePaymentsPanel } from "@/features/total-expenses/source-payments-panel";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  siteExpenseTimeline,
  type ExpenseAvailableAction,
} from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import {
  safeFinancialReturn,
  totalExpensesReturn,
} from "@/features/financial-return";
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
  const timeline = siteExpenseTimeline(d);
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
        href={safeFinancialReturn(
          search.get("returnTo"),
          context.project,
          "expenses",
        )}
      >
        {totalExpensesReturn(search.get("returnTo"), context.project)
          ? "Back to Total Expenses"
          : "Back to Site Expenses"}
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
          <RefreshButton busy={query.isFetching}
            variant="outline"
            disabled={query.isFetching}
            onRefresh={() => query.refetch()}
          >
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </RefreshButton>
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
      {d.status !== "APPROVED" && (
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {actions.map((value) => (
              <Button
                key={value}
                variant="outline"
                disabled={query.isFetching}
                onClick={() => setAction(value as ExpenseAvailableAction)}
              >
                {label(value)}
              </Button>
            ))}
          </div>
        </Card>
      )}
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
      <Card>
        <SourcePaymentsPanel
          compact
          org={context.org}
          project={context.project}
          source="expenses"
          id={d.id}
          ledger={d}
          version={d.version}
          permissions={context.permissions}
          active={context.active && !query.isError && d.status === "APPROVED"}
          timezone={context.timezone}
          onSaved={async () => {
            const latest = await refresh();
            if (!latest) throw new Error("Could not reload the expense.");
          }}
          adjustmentAction={
            actions.includes("ADJUST") ? (
              <Button
                variant="outline"
                disabled={query.isFetching}
                onClick={() => setAction("ADJUST")}
              >
                Record adjustment
              </Button>
            ) : null
          }
        />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Timeline ({timeline.length})</h2>
        <ol className="space-y-4">
          {timeline.map((entry) => (
            <li
              key={entry.id}
              className="space-y-1 border-l-2 border-hairline pl-4"
            >
              <p className="font-semibold">
                {label(entry.eventType)}
                {entry.amount !== null ? ` · ${money(entry.amount)}` : ""}
              </p>
              {entry.comment && (
                <p className="whitespace-pre-wrap break-words">
                  {entry.comment}
                </p>
              )}
              <p className="text-sm text-sub">
                {entry.actorName} · {timestamp(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </Card>
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
