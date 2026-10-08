"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  calendarToday,
  isCalendarDate,
  spendingRange,
  type SpendingPeriod,
  type SpendingSource,
  type SpendingCard,
  type TotalExpensesQuery,
  type TotalExpensesList,
  type TotalExpensesSummary,
} from "@nirman-app/shared";
import { Button, Card, LoadingState, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api/api-client";
import {
  TotalExpensesWorkspace,
  type TotalExpensesContext,
} from "./total-expenses-workspace";
const money = (v: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v),
  );
const sources: SpendingSource[] = [
  "ALL",
  "WAGES",
  "MATERIALS",
  "SITE_EXPENSES",
];
const names = {
  ALL: "All",
  WAGES: "Wages",
  MATERIALS: "Materials",
  SITE_EXPENSES: "Site Expenses",
};
export function TotalExpensesPage({
  projectId,
  initialQuery = {},
}: {
  projectId?: string;
  initialQuery?: Record<string, string | undefined>;
}) {
  return (
    <TotalExpensesWorkspace projectId={projectId}>
      {(context) => <Report context={context} initialQuery={initialQuery} />}
    </TotalExpensesWorkspace>
  );
}
function Report({
  context: c,
  initialQuery,
}: {
  context: TotalExpensesContext;
  initialQuery: Record<string, string | undefined>;
}) {
  const [initial] = useState(() => {
    const a =
        typeof initialQuery.startDate === "string"
          ? initialQuery.startDate
          : undefined,
      b =
        typeof initialQuery.endDate === "string"
          ? initialQuery.endDate
          : undefined;
    const valid = Boolean(
      a && b && isCalendarDate(a) && isCalendarDate(b) && a <= b,
    );
    const preset = initialQuery.period as SpendingPeriod;
    const period: SpendingPeriod = valid
      ? ["THIS_MONTH", "PREVIOUS_MONTH", "YEAR", "CUSTOM"].includes(preset)
        ? preset
        : "CUSTOM"
      : preset === "ALL_TIME"
        ? "ALL_TIME"
        : "THIS_MONTH";
    const range: TotalExpensesQuery = valid
      ? { startDate: a, endDate: b }
      : spendingRange(period, c.timezone);
    const source = sources.includes(initialQuery.source as SpendingSource)
      ? (initialQuery.source as SpendingSource)
      : "ALL";
    const n = Number(initialQuery.page);
    return {
      period,
      range,
      source,
      page: Number.isInteger(n) && n > 0 ? n : 1,
      year: Number((a ?? calendarToday(c.timezone)).slice(0, 4)),
    };
  });
  const [period, setPeriod] = useState<SpendingPeriod>(initial.period);
  const [year, setYear] = useState(initial.year);
  const [range, setRange] = useState<TotalExpensesQuery>(initial.range);
  const [source, setSource] = useState<SpendingSource>(initial.source);
  const [page, setPage] = useState(initial.page);
  const [start, setStart] = useState(initial.range.startDate ?? "");
  const [end, setEnd] = useState(initial.range.endDate ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    const p = new URLSearchParams({ period, source, page: String(page) });
    if (range.startDate) p.set("startDate", range.startDate);
    if (range.endDate) p.set("endDate", range.endDate);
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, [period, source, page, range]);
  const returnParams = new URLSearchParams({
    period,
    source,
    page: String(page),
  });
  if (range.startDate) returnParams.set("startDate", range.startDate);
  if (range.endDate) returnParams.set("endDate", range.endDate);
  const returnTo = `/projects/${c.project}/total-expenses?${returnParams}`;
  const base = `/organizations/${c.org}/projects/${c.project}/total-expenses`;
  const summary = useQuery({
    queryKey: ["total-expenses", c.user, c.org, c.project, "summary", range],
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: ({ signal }) =>
      api.get<TotalExpensesSummary>(`${base}/summary`, {
        params: range,
        signal,
      }),
  });
  const list = useQuery({
    queryKey: [
      "total-expenses",
      c.user,
      c.org,
      c.project,
      "list",
      range,
      source,
      page,
    ],
    refetchOnWindowFocus: true,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: ({ signal }) =>
      api.get<TotalExpensesList>(base, {
        signal,
        params: { ...range, source, page, pageSize: 20 },
      }),
  });
  function selectPeriod(value: SpendingPeriod) {
    setPeriod(value);
    setError("");
    if (value !== "CUSTOM") {
      setRange(spendingRange(value, c.timezone, year));
      setPage(1);
    } else {
      setStart(range.startDate ?? "");
      setEnd(range.endDate ?? "");
    }
  }
  function apply() {
    if (!isCalendarDate(start) || !isCalendarDate(end) || start > end) {
      setError("Choose a valid start and end date.");
      return;
    }
    setRange({ startDate: start, endDate: end });
    setPage(1);
    setError("");
  }
  const currentYear = Number(calendarToday(c.timezone).slice(0, 4));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Total Expenses</h1>
          <p className="text-sub">Paid project spending</p>
        </div>
        <RefreshButton busy={summary.isFetching || list.isFetching}
          variant="outline"
          onRefresh={async () => { await Promise.allSettled([summary.refetch(), list.refetch()]); }}
          disabled={summary.isFetching || list.isFetching}
        >
          Refresh
        </RefreshButton>
      </header>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            Period
            <select
              className="rounded-lg border border-hairline bg-surface p-2"
              value={period}
              onChange={(e) => selectPeriod(e.target.value as SpendingPeriod)}
            >
              {[
                ["ALL_TIME", "All time"],
                ["THIS_MONTH", "This month"],
                ["PREVIOUS_MONTH", "Previous month"],
                ["YEAR", "Calendar year"],
                ["CUSTOM", "Custom range"],
              ].map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {period === "YEAR" && (
            <label className="grid gap-1">
              Year
              <input
                type="number"
                min={1900}
                max={currentYear}
                value={year}
                className="rounded-lg border border-hairline p-2"
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  if (Number.isInteger(y) && y >= 1900 && y <= currentYear) {
                    setRange(spendingRange("YEAR", c.timezone, y));
                    setPage(1);
                  }
                }}
              />
            </label>
          )}
          {period === "CUSTOM" && (
            <>
              <label className="grid gap-1">
                From
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="rounded-lg border border-hairline p-2"
                />
              </label>
              <label className="grid gap-1">
                To
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="rounded-lg border border-hairline p-2"
                />
              </label>
              <Button onClick={apply}>Apply dates</Button>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <p className="mt-3 text-sm text-sub">
          {range.startDate
            ? `${range.startDate} – ${range.endDate}`
            : "All payment dates"}{" "}
          · Payments only. Unpaid balances and unconfirmed historical costs are
          excluded. Kharchi is excluded.
        </p>
      </Card>
      {summary.isPending ? (
        <LoadingState label="Loading paid totals" />
      ) : summary.isError ? (
        <Card>
          <p role="alert">{summary.error.message}</p>
          <Button onClick={() => void summary.refetch()}>Retry totals</Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Total paid", summary.data.totalPaid],
              ["Wages paid", summary.data.wagesPaid],
              ["Materials paid", summary.data.materialsPaid],
              ["Site Expenses paid", summary.data.siteExpensesPaid],
            ].map(([n, v]) => (
              <Card key={n}>
                <p className="text-sm text-sub">{n}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {money(v)}
                </p>
              </Card>
            ))}
          </div>
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Monthly spending</h2>
            {!summary.data.months.length ? (
              <p>No payments in this period.</p>
            ) : (
              <ol className="space-y-3">
                {summary.data.months.map((m) => (
                  <li key={m.month}>
                    <div className="flex justify-between text-sm">
                      <span>{m.month}</span>
                      <span>{money(m.totalPaid)}</span>
                    </div>
                    <div
                      className="mt-1 h-3 overflow-hidden rounded-full bg-hairline"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-lime"
                        style={{
                          width: `${(Number(m.totalPaid) / Math.max(...summary.data.months.map((x) => Number(x.totalPaid)), 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Expense category"
      >
        {sources.map((s) => (
          <Button
            key={s}
            variant={source === s ? "primary" : "outline"}
            aria-pressed={source === s}
            onClick={() => {
              setSource(s);
              setPage(1);
            }}
          >
            {names[s]}
          </Button>
        ))}
      </div>
      {list.isPending ? (
        <LoadingState label="Loading paid records" />
      ) : list.isError ? (
        <Card>
          <p role="alert">{list.error.message}</p>
          <Button onClick={() => void list.refetch()}>Retry records</Button>
        </Card>
      ) : (
        <>
          <p className="text-sm text-sub" role="status">
            {list.data.pagination.total} paid records
            {list.isFetching ? " · Refreshing…" : ""}
          </p>
          {!list.data.items.length ? (
            <Card>No payments match this view.</Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {list.data.items.map((item) => (
                <PaidCard
                  key={`${item.source}:${item.id}`}
                  item={item}
                  context={c}
                  returnTo={returnTo}
                />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page <= 1 || list.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {list.data.pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              disabled={
                page >= list.data.pagination.totalPages || list.isFetching
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function PaidCard({
  item: i,
  context: c,
  returnTo,
}: {
  returnTo: string;
  item: SpendingCard;
  context: TotalExpensesContext;
}) {
  const sourceModule =
    i.source === "WAGES"
      ? "wages"
      : i.source === "MATERIALS"
        ? "materials"
        : "expenses";
  const canOpen = c.permissions.includes(`${sourceModule}:read`);
  const href =
    i.source === "WAGES"
      ? `/projects/${c.project}/wages?batchId=${i.detailId}&returnTo=${encodeURIComponent(returnTo)}`
      : i.source === "MATERIALS"
        ? `/projects/${c.project}/materials/${i.detailId}?returnTo=${encodeURIComponent(returnTo)}#purchase-${i.id}`
        : `/projects/${c.project}/expenses/${i.detailId}?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <Card className="space-y-3">
      <div className="flex justify-between gap-3">
        <h2 className="break-words text-lg font-semibold">
          {i.source === "WAGES"
            ? `Wages · ${i.periodStart} – ${i.periodEnd}`
            : i.title}
        </h2>
        <span className="text-sm text-sub">{names[i.source]}</span>
      </div>
      {i.subtitle && <p className="text-sm text-sub">{i.subtitle}</p>}
      <p className="text-2xl font-semibold tabular-nums">
        {money(i.periodPaidAmount)}
      </p>
      <p className="text-sm text-sub">
        Paid in selected period · Latest payment {i.latestPaymentDate}
      </p>
      <p className="text-sm">
        Lifetime paid {money(i.lifetimePaidAmount)} · Remaining{" "}
        {money(i.remainingAmount)}
      </p>
      <StatusBadge tone={i.paymentStatus === "PAID" ? "success" : "warning"}>
        {i.paymentStatus === "PAID" ? "Paid" : "Partially paid"}
      </StatusBadge>
      {i.source === "MATERIALS" && (
        <p className="text-sm">Purchased {i.purchasedOn}</p>
      )}
      {i.source === "SITE_EXPENSES" && (
        <p className="text-sm">
          {i.category.replaceAll("_", " ")} · {i.expenseDate}
          {i.classificationReview
            ? " · Legacy classification: review for duplicate costs"
            : ""}
        </p>
      )}
      {canOpen ? (
        <Link className="inline-block underline" href={href}>
          View{" "}
          {sourceModule === "wages"
            ? "wage batch"
            : sourceModule === "materials"
              ? "material purchase"
              : "site expense"}
        </Link>
      ) : (
        <p className="text-sm text-sub">Detail access unavailable</p>
      )}
    </Card>
  );
}
