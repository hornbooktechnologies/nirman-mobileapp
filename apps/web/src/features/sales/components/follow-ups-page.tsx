"use client";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FOLLOW_UP_STATUSES, type FollowUpStatus } from "@nirman-app/shared";
import { Button, Card, Input, LoadingState, Select } from "@/components/ui";
import { useFollowUps, useSalesLifetime } from "../hooks/use-sales";
import {
  canWriteLead,
  instant,
  label,
  localTime,
  salesKey,
} from "../sales-rules";
import { salesService } from "../services/sales.service";
import type { SalesFollowUp } from "../types/sales.types";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { SalesForm } from "./sales-form";
import { Failure, Status, dateTime } from "./sales-ui";
import { useAssignees } from "./lead-form";
function FollowUps({ c }: { c: SalesContext }) {
  const live = useSalesLifetime();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const cache = useQueryClient();
  const [now] = useState(() => Date.now());
  const status = FOLLOW_UP_STATUSES.find((s) => s === params.get("status"));
  const team =
    c.permissions.includes("leads:read-team") ||
    c.permissions.includes("leads:read-all");
  const assignedTo = team ? params.get("assignedTo") || undefined : undefined;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  let dateError = "";
  let start: string | undefined;
  let end: string | undefined;
  try {
    start = from ? instant(`${from}T00:00`, c.timezone) : undefined;
    end = to
      ? instant(`${to}T23:59`, c.timezone).replace(":00.000Z", ":59.999Z")
      : undefined;
    if (from && to && from > to)
      dateError = "End date must be on or after start date.";
  } catch {
    dateError = "Enter valid filter dates.";
  }
  const query = useFollowUps(
    c.org,
    c.project,
    { status, assignedTo, from: start, to: end },
    !dateError,
  );
  const assignees = useAssignees(c);
  const [selected, setSelected] = useState<SalesFollowUp | null>(null);
  const snapshot = useRef<SalesFollowUp | null>(null);
  const [success, setSuccess] = useState("");
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  async function refreshSelected() {
    const records = await salesService.followUps(c.org, c.project);
    const current = records.find((f) => f.id === selected?.id);
    if (!current)
      throw new Error("This follow-up is no longer available to you.");
    snapshot.current = current;
    await cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">Follow-ups</h1>
        <Button
          variant="outline"
          disabled={Boolean(dateError)}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </header>
      <p>
        Schedule a follow-up from a lead’s detail page. Dates use {c.timezone}.
      </p>
      {success && <p role="status">{success}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Status
          <Select
            value={status ?? ""}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {FOLLOW_UP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </label>
        <label>
          From date
          <Input
            type="date"
            value={from}
            onChange={(e) => filter("from", e.target.value)}
          />
        </label>
        <label>
          To date
          <Input
            type="date"
            value={to}
            onChange={(e) => filter("to", e.target.value)}
          />
        </label>
      </div>
      {team && (
        <label className="block max-w-md">
          Assigned user
          <Select
            value={assignedTo ?? ""}
            onChange={(e) => filter("assignedTo", e.target.value)}
          >
            <option value="">All users</option>
            {assignedTo &&
              !assignees.data?.some((a) => a.value === assignedTo) && (
                <option value={assignedTo}>{assignedTo}</option>
              )}
            {assignees.data?.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>
      )}
      {(status || assignedTo || from || to) && (
        <Button variant="outline" onClick={() => router.replace(pathname)}>
          Clear filters
        </Button>
      )}
      {dateError ? (
        <p role="alert">{dateError}</p>
      ) : query.isPending ? (
        <LoadingState label="Loading follow-ups" />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.isFetching && <p role="status">Refreshing follow-ups…</p>}
          <p className="text-sm text-sub">
            {query.data.length} follow-ups · all matching records
          </p>
          {!query.data.length && (
            <Card>No follow-ups match these filters.</Card>
          )}
          <ul className="grid gap-4 lg:grid-cols-2">
            {query.data.map((f) => (
              <li key={f.id}>
                <Card>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="font-semibold underline"
                      href={`/projects/${c.project}/sales/leads/${f.leadId}`}
                    >
                      {f.customerName}
                    </Link>
                    <Status value={f.status} />
                  </div>
                  <p className="mt-2">
                    {label(f.type)} · {dateTime(f.scheduledAt, c.timezone)}
                  </p>
                  {f.status === "SCHEDULED" &&
                    new Date(f.scheduledAt).getTime() < now && (
                      <p className="text-sm text-danger">Overdue</p>
                    )}
                  <p className="text-sm text-sub">
                    Assigned to{" "}
                    {assignees.data?.find((a) => a.value === f.assignedUserId)
                      ?.label ?? f.assignedUserId}
                  </p>
                  <dl className="mt-3 space-y-2">
                    {[
                      ["Notes", f.notes],
                      ["Outcome", f.outcome],
                      [
                        "Next follow-up",
                        f.nextFollowUpAt
                          ? dateTime(f.nextFollowUpAt, c.timezone)
                          : null,
                      ],
                      [
                        "Completed",
                        f.completedAt
                          ? dateTime(f.completedAt, c.timezone)
                          : null,
                      ],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-sm text-sub">{k}</dt>
                          <dd className="whitespace-pre-wrap break-words">
                            {v}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {c.active && c.permissions.includes("followups:manage") && (
                    <Button
                      className="mt-3"
                      variant="outline"
                      onClick={() => {
                        snapshot.current = f;
                        setSelected(f);
                      }}
                    >
                      Update follow-up
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
      {selected && (
        <SalesForm
          title={`Update follow-up · ${selected.customerName}`}
          timezone={c.timezone}
          fields={[
            {
              name: "status",
              label: "Status",
              required: true,
              options: FOLLOW_UP_STATUSES,
              initial:
                selected.status === "SCHEDULED" ? "COMPLETED" : selected.status,
            },
            {
              name: "outcome",
              label: "Outcome",
              type: "textarea",
              maxLength: 4000,
              initial: selected.outcome ?? "",
            },
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              maxLength: 4000,
              initial: selected.notes ?? "",
            },
            {
              name: "nextFollowUpAt",
              label: `Next follow-up time (${c.timezone})`,
              type: "datetime-local",
              initial: selected.nextFollowUpAt
                ? localTime(selected.nextFollowUpAt, c.timezone)
                : "",
              help: "Records the next-action time only. To schedule another follow-up, use the lead detail page.",
            },
          ]}
          close={() => setSelected(null)}
          refresh={refreshSelected}
          save={async (v) => {
            const lead = await salesService.lead(
              c.org,
              c.project,
              selected.leadId,
            );
            if (
              !canWriteLead(
                c.permissions,
                c.active,
                "followups:manage",
                lead,
                c.user,
              )
            )
              throw new Error(
                "This lead is no longer writable with your current permissions.",
              );
            const current = (
              await salesService.followUps(c.org, c.project)
            ).find((f) => f.id === selected.id);
            if (
              !current ||
              current.updatedAt !== snapshot.current?.updatedAt ||
              current.status !== snapshot.current?.status
            )
              throw new Error(
                "This follow-up changed. Refresh and review before saving.",
              );
            if (!live.current) return;
            await salesService.updateFollowUp(
              c.org,
              c.project,
              selected.leadId,
              selected.id,
              {
                status: v.status as FollowUpStatus,
                outcome: v.outcome || undefined,
                notes: v.notes || undefined,
                nextFollowUpAt: v.nextFollowUpAt
                  ? instant(v.nextFollowUpAt, c.timezone)
                  : undefined,
              },
            );
            if (!live.current) return;
            setSelected(null);
            setSuccess("Follow-up updated.");
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
        />
      )}
    </div>
  );
}
export function FollowUpsPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading follow-ups" />}>
      <SalesWorkspace projectId={projectId} section="follow-ups">
        {(c) => <FollowUps c={c} />}
      </SalesWorkspace>
    </Suspense>
  );
}
