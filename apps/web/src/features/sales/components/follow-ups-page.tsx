"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FOLLOW_UP_STATUSES, type FollowUpStatus } from "@nirman-app/shared";
import { Button, Card, LoadingState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
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
import { SalesFilters } from "./sales-filters";
import { salesDetailUrl, salesListUrl } from "../sales-view";
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
  const search = params.get("search") ?? "";
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
    { search: search || undefined, status, assignedTo, from: start, to: end },
    !dateError,
  );
  const rows = query.data ?? [];
  const assignees = useAssignees(c);
  const [selected, setSelected] = useState<SalesFollowUp | null>(null);
  const snapshot = useRef<SalesFollowUp | null>(null);
  const [success, setSuccess] = useState("");
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
        <RefreshButton busy={query.isFetching}
          variant="outline"
          disabled={Boolean(dateError) || query.isFetching}
          onRefresh={() => query.refetch()}
        >
          Refresh
        </RefreshButton>
      </header>
      <p>
        Schedule a follow-up from a lead’s detail page. Dates use {c.timezone}.
      </p>
      {success && <p role="status">{success}</p>}
      <SalesFilters
        name="follow-ups"
        search={{ value: search, placeholder: "Customer name or mobile", maxLength: 160, onChange: search => router.replace(salesListUrl(pathname, params, { search }), { scroll: false }) }}
        scope={`Due dates use ${c.timezone}.`}
        value={{ status: status ?? "", from, to, ...(team ? { assignedTo: assignedTo ?? "" } : {}) }}
        fields={[
          { key: "status", name: "Status", options: FOLLOW_UP_STATUSES },
          { key: "from", name: "From date", type: "date" },
          { key: "to", name: "To date", type: "date" },
          ...(team ? [{ key: "assignedTo", name: "Assigned user", options: assignees.data?.map((a) => a.value) ?? [], optionLabels: Object.fromEntries((assignees.data ?? []).map((a) => [a.value, a.label])) }] : []),
        ]}
        validate={(value) => value.from && value.to && value.from > value.to ? "End date must be on or after start date." : null}
        onApply={(value) => router.replace(salesListUrl(pathname, params, value), { scroll: false })}
      />
      {dateError ? (
        <p role="alert">{dateError}</p>
      ) : query.isPending ? (
        <LoadingState label="Loading follow-ups" />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          {query.isFetching && <p role="status">Refreshing follow-ups…</p>}
          <p className="text-sm text-sub">
            {rows.length} follow-ups · all matching records
          </p>
          {!rows.length && (
            <Card>No follow-ups match these filters.</Card>
          )}
          {!!rows.length && (
            <Table aria-label="Sales follow-ups" className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome / next step</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => {
                  const overdue = f.status === "SCHEDULED" && new Date(f.scheduledAt).getTime() < now;
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Link className="font-semibold underline decoration-hairline underline-offset-4 transition-colors hover:text-lime focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime" href={salesDetailUrl(`/projects/${c.project}/sales/leads/${f.leadId}`, salesListUrl(pathname, params, {}))}>
                          {f.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>{label(f.type)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span>{dateTime(f.scheduledAt, c.timezone)}</span>
                        {overdue && <span className="mt-1 block text-xs font-medium text-danger">Overdue</span>}
                      </TableCell>
                      <TableCell>{assignees.data?.find((a) => a.value === f.assignedUserId)?.label ?? f.assignedUserId}</TableCell>
                      <TableCell><Status value={f.status} /></TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="line-clamp-2 whitespace-pre-wrap break-words">{f.outcome || f.notes || "No outcome recorded"}</p>
                        <p className="mt-1 text-xs text-sub">Next: {f.nextFollowUpAt ? dateTime(f.nextFollowUpAt, c.timezone) : "Not scheduled"}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.active && c.permissions.includes("followups:manage") ? (
                          <Button variant="outline" onClick={() => { snapshot.current = f; setSelected(f); }}>Update</Button>
                        ) : <span className="text-sub">Read only</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
