"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
} from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { projectsService } from "@/features/projects/services/projects.service";
import { validDate } from "@/features/attendance/date-utils";
import {
  useExpenses,
  useExpenseSettings,
  useExpenseSummary,
} from "../hooks/use-expenses";
import { expenseKey, label } from "../expense-rules";
import { expensesService } from "../services/expenses.service";
import type { ExpensesQuery } from "../types/expenses.types";
import { ExpensesWorkspace, type ExpensesContext } from "./expenses-workspace";
import { ExpenseForm } from "./expense-form";
import { ExpenseSettingsDialog } from "./expense-settings";
import { ExpensesCollectionFilters, defaultExpensesQuery } from "./expenses-collection-filters";
import { financialListHref } from "@/features/financial-return";
import { date, ExpenseStatusBadge, Failure, money } from "./expenses-ui";

export function ExpensesPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading Site Expenses" />}>
      <ExpensesWorkspace projectId={projectId}>
        {(context) => <List context={context} />}
      </ExpensesWorkspace>
    </Suspense>
  );
}
const defaultQuery = defaultExpensesQuery;
function List({ context }: { context: ExpensesContext }) {
  const router = useRouter();
  const params = useSearchParams();
  const cache = useQueryClient();
  const [query, setQuery] = useState<ExpensesQuery>(() => ({
    ...defaultQuery,
    page: /^\d{1,6}$/.test(params.get("page") ?? "")
      ? Math.max(1, Number(params.get("page")))
      : 1,
    search: params.get("search")?.slice(0, 160) || undefined,
    status: EXPENSE_STATUSES.find((v) => v === params.get("status")),
    category: EXPENSE_CATEGORIES.find((v) => v === params.get("category")),
    paymentMethod: EXPENSE_PAYMENT_METHODS.find(
      (v) => v === params.get("paymentMethod"),
    ),
    expenseFrom: validDate(params.get("expenseFrom") ?? "")
      ? params.get("expenseFrom")!
      : undefined,
    expenseTo: validDate(params.get("expenseTo") ?? "")
      ? params.get("expenseTo")!
      : undefined,
    recordedByMemberId: /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
      params.get("recordedByMemberId") ?? "",
    )
      ? params.get("recordedByMemberId")!
      : undefined,
    sortBy:
      (["expenseDate", "amount", "updatedAt", "description"] as const).find(
        (v) => v === params.get("sortBy"),
      ) ?? "expenseDate",
    sortOrder: params.get("sortOrder") === "asc" ? "asc" : "desc",
  }));
  const [search, setSearch] = useState(query.search ?? "");
  const [memberSearch, setMemberSearch] = useState("");
  const [create, setCreate] = useState(false);
  const [configure, setConfigure] = useState(false);
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      exportController.current?.abort();
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((q) =>
          q.search === (search.trim() || undefined)
            ? q
            : { ...q, page: 1, search: search.trim() || undefined },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) next.set(key, String(value));
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${next}`,
    );
  }, [query]);
  const invalidRange = Boolean(
    (query.expenseFrom && !validDate(query.expenseFrom)) ||
    (query.expenseTo && !validDate(query.expenseTo)) ||
    (query.expenseFrom &&
      query.expenseTo &&
      query.expenseFrom > query.expenseTo),
  );
  const list = useExpenses(context.org, context.project, query, !invalidRange);
  const summary = useExpenseSummary(
    context.org,
    context.project,
    query,
    !invalidRange,
  );
  const settings = useExpenseSettings(context.org, context.project);
  const can = (permission: string) =>
    context.permissions.includes(`expenses:${permission}`);
  const canReadMembers = context.permissions.includes("project-members:read");
  const members = useQuery({
    queryKey: [...expenseKey(context.org, context.project), "members"],
    queryFn: () => projectsService.members(context.org, context.project),
    enabled: canReadMembers,
  });
  const exporting = useMutation({
    retry: false,
    mutationFn: () => {
      exportController.current = new AbortController();
      return expensesService.export(
        context.org,
        context.project,
        query,
        exportController.current.signal,
      );
    },
    onSuccess: (csv) => {
      if (!mounted.current) return;
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `site-expenses-${context.project}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Expenses CSV downloaded.");
    },
  });
  const filtered = Boolean(
    query.search ||
    query.status ||
    query.category ||
    query.paymentMethod ||
    query.expenseFrom ||
    query.expenseTo ||
    query.recordedByMemberId,
  );
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Site Expenses</h1>
          <p className="text-sub">Site spending, approvals, and corrections</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void cache.invalidateQueries({
                queryKey: expenseKey(context.org, context.project),
              });
              void cache.invalidateQueries({
                queryKey: ["expenses-access", context.org],
              });
            }}
          >
            Refresh
          </Button>
          {can("configure") && context.active && (
            <Button
              variant="outline"
              disabled={!settings.data || settings.isError}
              onClick={() => setConfigure(true)}
            >
              Workflow settings
            </Button>
          )}
          {can("create") && context.active && (
            <Button
              disabled={!settings.data?.configured || settings.isError}
              onClick={() => setCreate(true)}
            >
              Record expense
            </Button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      {settings.isPending ? (
        <LoadingState label="Loading expense workflow" />
      ) : settings.isError ? (
        <Failure error={settings.error} retry={() => void settings.refetch()} />
      ) : (
        <Card>
          <p>
            Workflow:{" "}
            <strong>
              {settings.data.workflowMode
                ? label(settings.data.workflowMode)
                : "Not configured"}
            </strong>
          </p>
          <p className="text-sm text-sub">
            {!settings.data.configured
              ? `Configure the workflow before recording expenses.${!can("configure") ? " Ask a project administrator to configure it." : ""}`
              : settings.data.workflowMode === "DIRECT"
                ? "New submissions are approved immediately. Drafts remain editable until submitted."
                : "New submissions require a separate authorized reviewer."}
          </p>
        </Card>
      )}
      {!invalidRange &&
        (summary.isPending ? (
          <LoadingState label="Loading expense summary" />
        ) : summary.isError ? (
          <Failure error={summary.error} retry={() => void summary.refetch()} />
        ) : (
          <section
            aria-label="Filtered expense summary"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              ["Recognized cost", money(summary.data.recognizedAmount)],
              ["Approved original", money(summary.data.approvedOriginalAmount)],
              ["Signed adjustments", money(summary.data.adjustmentTotal)],
              [
                `Pending (${summary.data.pendingCount})`,
                money(summary.data.pendingAmount),
              ],
            ].map(([title, value]) => (
              <Card key={title}>
                <p className="text-sm text-sub">{title}</p>
                <p className="break-words text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </Card>
            ))}
          </section>
        ))}
      <Card className="space-y-4">
        <ExpensesCollectionFilters
          query={query} search={search} onSearch={setSearch}
          onApply={setQuery} members={members.data ?? []}
          canReadMembers={canReadMembers} memberSearch={memberSearch}
          onMemberSearch={setMemberSearch}
          memberState={<>{members.isPending && <p role="status">Loading members…</p>}{members.isError && <Failure error={members.error} retry={() => void members.refetch()} />}</>}
        />
        {invalidRange && <p role="alert" className="text-danger">Choose valid dates with the end on or after the start.</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setSearch(""); setMemberSearch(""); setQuery(defaultQuery); }}>Clear all</Button>
          {can("export") && <Button variant="outline" disabled={exporting.isPending || invalidRange} onClick={() => exporting.mutate()}>{exporting.isPending ? "Preparing CSV…" : "Export filtered CSV"}</Button>}
        </div>
        {exporting.isError && <p role="alert" className="text-danger">{exporting.error.message} Use Export filtered CSV to retry.</p>}
      </Card>
      {!invalidRange &&
        (list.isPending ? (
          <LoadingState label="Loading expenses" />
        ) : list.isError ? (
          <Failure error={list.error} retry={() => void list.refetch()} />
        ) : (
          <>
            <p role="status" className="text-sm text-sub">
              {list.data.pagination.total} expenses
              {list.isFetching ? " · Refreshing…" : ""}
            </p>
            {!list.data.items.length ? (
              <Card>
                {filtered
                  ? "No expenses match these filters. Clear filters to see all expenses."
                  : "No site expenses recorded yet."}
              </Card>
            ) : (
              <>
                <div
                  className="hidden overflow-x-auto rounded-card border border-hairline bg-surface md:block"
                  role="region"
                  aria-label="Site expenses table"
                  tabIndex={0}
                >
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-hairline text-sub">
                      <tr>
                        {[
                          "Expense",
                          "Date / recorder",
                          "Status",
                          "Original",
                          "Adjustments",
                          "Recognized",
                        ].map((title) => (
                          <th
                            key={title}
                            scope="col"
                            className="px-4 py-3 font-semibold"
                          >
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-hairline last:border-0"
                        >
                          <td className="max-w-sm px-4 py-4">
                            <Link
                              className="break-words font-semibold underline"
                              href={`/projects/${context.project}/expenses/${item.id}?returnTo=${encodeURIComponent(financialListHref(context.project, "expenses", query))}`}
                            >
                              {item.description}
                            </Link>
                            <p className="mt-1 text-sub">
                              {label(item.category)} ·{" "}
                              {item.vendorPayee ?? "No vendor / payee"}
                            </p>
                            <p className="text-sub">
                              {item.paymentMethod
                                ? label(item.paymentMethod)
                                : "Payment not specified"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="whitespace-nowrap">
                              {date(item.expenseDate)}
                            </p>
                            <p>{item.recordedBy}</p>
                          </td>
                          <td className="px-4 py-4">
                            <ExpenseStatusBadge status={item.status} />
                            <p className="mt-1 text-xs text-sub">{item.status === "PENDING_APPROVAL" ? "Needs authorized review" : item.status === "APPROVED" ? "Included in recognized cost" : item.status === "DRAFT" ? "Ready to submit" : item.status === "REJECTED" ? "Review rejection" : "No further action"}</p>
                          </td>
                          {[
                            item.amount,
                            item.adjustmentTotal,
                            item.recognizedAmount,
                          ].map((value, i) => (
                            <td
                              key={i}
                              className="whitespace-nowrap px-4 py-4 text-right tabular-nums"
                            >
                              {money(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {list.data.items.map((item) => (
                    <Link
                      key={item.id}
                      className="block min-w-0 rounded-card focus-visible:outline-2 focus-visible:outline-lime"
                      href={`/projects/${context.project}/expenses/${item.id}?returnTo=${encodeURIComponent(financialListHref(context.project, "expenses", query))}`}
                    >
                      <Card className="space-y-3">
                        <div className="flex flex-wrap justify-between gap-2">
                          <p className="text-sm text-sub">
                            {date(item.expenseDate)} · {label(item.category)}
                          </p>
                          <ExpenseStatusBadge status={item.status} />
                        </div>
                        <h2 className="break-words text-lg font-semibold">
                          {item.description}
                        </h2>
                        <p className="break-words text-sm">
                          {item.vendorPayee ?? "No vendor / payee"} ·{" "}
                          {item.recordedBy}
                        </p>
                        <p className="font-semibold tabular-nums">
                          {money(item.recognizedAmount)} recognized
                        </p>
                        <p className="text-sm text-sub">{item.status === "PENDING_APPROVAL" ? "Needs authorized review" : item.status === "APPROVED" ? "Included in recognized cost" : item.status === "DRAFT" ? "Ready to submit" : item.status === "REJECTED" ? "Review rejection" : "No further action"}</p>
                        <p className="text-sm">
                          Original {money(item.amount)} · Adjustments{" "}
                          {money(item.adjustmentTotal)}
                        </p>
                        <p className="text-sm text-sub">
                          {item.paymentMethod
                            ? label(item.paymentMethod)
                            : "Payment not specified"}
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
            <nav
              aria-label="Expense pagination"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Button
                variant="outline"
                disabled={list.data.pagination.page <= 1 || list.isFetching}
                onClick={() =>
                  setQuery((q) => ({
                    ...q,
                    page: Math.max(1, (q.page ?? 1) - 1),
                  }))
                }
              >
                Previous
              </Button>
              <span>
                Page {list.data.pagination.page} of{" "}
                {Math.max(1, list.data.pagination.totalPages)}
              </span>
              <Button
                variant="outline"
                disabled={
                  list.data.pagination.page >=
                    list.data.pagination.totalPages || list.isFetching
                }
                onClick={() =>
                  setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))
                }
              >
                Next
              </Button>
            </nav>
          </>
        ))}
      {create && (
        <ExpenseForm
          context={context}
          action="CREATE"
          close={() => setCreate(false)}
          refresh={async () => undefined}
          saved={(record) => {
            setCreate(false);
            router.push(
              `/projects/${context.project}/expenses/${record.id}?created=1`,
            );
          }}
        />
      )}
      {configure && settings.data && (
        <ExpenseSettingsDialog
          context={context}
          settings={settings.data}
          close={() => setConfigure(false)}
          saved={() => {
            setConfigure(false);
            setNotice("Expense workflow saved.");
          }}
        />
      )}
    </div>
  );
}
