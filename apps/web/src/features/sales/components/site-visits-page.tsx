"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SITE_VISIT_STATUSES } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { useSalesLifetime, useSiteVisits } from "../hooks/use-sales";
import { canWriteLead, instant, salesKey } from "../sales-rules";
import { visitActionable, visitSnapshot } from "../site-visit-rules";
import { salesService } from "../services/sales.service";
import type { SalesSiteVisit, SiteVisitUpdate } from "../types/sales.types";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { SiteVisitForm } from "./site-visit-form";
import { Failure, Status, dateTime } from "./sales-ui";
import { SalesFilters } from "./sales-filters";
import { salesDetailUrl, salesListUrl } from "../sales-view";
import { siteVisitSalespeople } from "../sales-filter-options";
function Visits({ c }: { c: SalesContext }) {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  const cache = useQueryClient(),
    live = useSalesLifetime();
  const [selected, setSelected] = useState<SalesSiteVisit | null>(null);
  const [success, setSuccess] = useState("");
  const status = SITE_VISIT_STATUSES.find((s) => s === params.get("status"));
  const from = params.get("from") || "",
    to = params.get("to") || "",
    search = params.get("search") || "";
  const team =
    c.permissions.includes("leads:read-all") ||
    c.permissions.includes("leads:read-team");
  const salesperson = team ? params.get("salesperson") || "" : "";
  let scheduledFrom: string | undefined,
    scheduledTo: string | undefined,
    error = "";
  try {
    scheduledFrom = from ? instant(`${from}T00:00`, c.timezone) : undefined;
    scheduledTo = to
      ? instant(`${to}T23:59`, c.timezone).replace(":00.000Z", ":59.999Z")
      : undefined;
    if (from && to && from > to)
      error = "End date must be on or after start date.";
  } catch {
    error = "Enter valid filter dates.";
  }
  const query = useSiteVisits(
    c.org,
    c.project,
    {
      status,
      search: search || undefined,
      scheduledFrom,
      scheduledTo,
      assignedSalesperson: salesperson || undefined,
    },
    !error,
  );
  const rows = query.data ?? [];
  // Keep the directory independent of the selected salesperson/date/status/search.
  // This uses the same scoped endpoint and never widens access to project members.
  const directory = useSiteVisits(c.org, c.project, {}, team);
  const people = siteVisitSalespeople(directory.data ?? []);
  const detail = params.get("visit");
  const visible = detail ? rows.filter((v) => v.id === detail) : rows;
  function filter(name: string, value: string) {
    router.replace(salesListUrl(pathname, params, { [name]: value }, ["visit"]), { scroll: false });
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">Site Visits</h1>
        <RefreshButton variant="outline" disabled={Boolean(error)} busy={query.isFetching || (team && directory.isFetching)} onRefresh={async () => { await Promise.allSettled([query.refetch(), ...(team ? [directory.refetch()] : [])]); }}>
          Refresh
        </RefreshButton>
      </header>
      <p>
        Schedule visits from a{" "}
        <Link className="underline" href={`/projects/${c.project}/sales/leads`}>
          lead’s detail page
        </Link>
        . Dates use {c.timezone}.
      </p>
      {success && <p role="status">{success}</p>}
      <SalesFilters
        name="site visits"
        scope={`Visit dates use ${c.timezone}.`}
        search={{ value: search, placeholder: "Customer, mobile or salesperson", onChange: (value) => filter("search", value) }}
        value={{ status: status ?? "", from, to, ...(team ? { salesperson } : {}) }}
        fields={[
          { key: "status", name: "Status", options: SITE_VISIT_STATUSES },
          { key: "from", name: "From date", type: "date" },
          { key: "to", name: "To date", type: "date" },
          ...(team ? [{ key: "salesperson", name: "Salesperson", options: people.map(person => person.value), optionLabels: Object.fromEntries(people.map(person => [person.value, person.label])), loading: directory.isPending, optionsMessage: directory.isError ? "Could not load salesperson options. Refresh to retry." : undefined }] : []),
        ]}
        validate={(value) => value.from && value.to && value.from > value.to ? "End date must be on or after start date." : null}
        onApply={(value) => router.replace(salesListUrl(pathname, params, value, ["visit"]), { scroll: false })}
      />
      {detail && <Link className="underline" href={salesListUrl(pathname, params, {}, ["visit"])}>Back to matching visits</Link>}
      {error ? (
        <p role="alert">{error}</p>
      ) : query.isPending ? (
        <LoadingState label="Loading site visits" />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          {query.isFetching && <p role="status">Refreshing visits…</p>}
          <p className="text-sm text-sub">
            {visible.length} visits · all matching records.
          </p>
          {!visible.length && (
            <Card>
              No visits match this view. Clear filters or schedule a visit from
              a lead.
            </Card>
          )}
          <ul className="grid gap-4 lg:grid-cols-2">
            {visible.map((v) => (
              <li key={v.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="font-semibold underline"
                      href={salesListUrl(pathname, params, { visit: v.id })}
                    >
                      {v.customerName}
                    </Link>
                    <Status value={v.status} />
                  </div>
                  <p className="mt-2">{dateTime(v.scheduledAt, c.timezone)}</p>
                  <p className="text-sm text-sub">
                    {v.assignedSalespersonName} ·{" "}
                    {v.attendeeCount ?? "Unspecified"} attendees
                  </p>
                  <dl className="mt-3 space-y-2">
                    {[
                      ["Customer feedback", v.customerFeedback],
                      ["Objections and concerns", v.objectionsConcerns],
                      ["Next action", v.nextAction],
                      [
                        "Completed",
                        v.completedAt
                          ? dateTime(v.completedAt, c.timezone)
                          : null,
                      ],
                    ]
                      .filter(([, value]) => value)
                      .map(([name, value]) => (
                        <div key={name}>
                          <dt className="text-sm text-sub">{name}</dt>
                          <dd className="whitespace-pre-wrap break-words">
                            {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {!visitActionable(v.status) && (
                    <p className="mt-2 text-sm text-sub">
                      Final outcome · read-only
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                    <Link
                      className="underline"
                      href={salesDetailUrl(`/projects/${c.project}/sales/leads/${v.leadId}`, salesListUrl(pathname, params, { visit: "" }))}
                    >
                      Lead and activity history
                    </Link>
                    {c.active &&
                      c.permissions.includes("site-visits:manage") &&
                      visitActionable(v.status) && (
                        <Button
                          variant="outline"
                          onClick={() => setSelected(v)}
                        >
                          Update visit
                        </Button>
                      )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
      {selected && (
        <SiteVisitForm
          key={visitSnapshot(selected)}
          c={c}
          visit={selected}
          close={() => setSelected(null)}
          refresh={async () => {
            const current = (
              await salesService.siteVisits(c.org, c.project)
            ).find((v) => v.id === selected.id);
            if (!live.current) return;
            if (!current)
              throw new Error("This visit is no longer available to you.");
            setSelected(visitActionable(current.status) ? current : null);
            setSuccess(
              "Current visit refreshed. Review the latest record before saving.",
            );
            await cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
          save={async (input) => {
            const lead = await salesService.lead(
              c.org,
              c.project,
              selected.leadId,
            );
            if (
              !canWriteLead(
                c.permissions,
                c.active,
                "site-visits:manage",
                lead,
                c.user,
              )
            )
              throw new Error(
                "You no longer have permission to update this lead’s visits.",
              );
            const current = (
              await salesService.siteVisits(c.org, c.project)
            ).find((v) => v.id === selected.id);
            if (
              !current ||
              !visitActionable(current.status) ||
              visitSnapshot(current) !== visitSnapshot(selected)
            )
              throw new Error(
                "This visit changed. Refresh and review before saving.",
              );
            if (!live.current) return;
            await salesService.updateSiteVisit(
              c.org,
              c.project,
              selected.leadId,
              selected.id,
              input as SiteVisitUpdate,
            );
            if (!live.current) return;
            setSelected(null);
            setSuccess("Site visit updated.");
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
        />
      )}
    </div>
  );
}
export function SiteVisitsPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading site visits" />}>
      <SalesWorkspace projectId={projectId} section="site-visits">
        {(c) => <Visits c={c} />}
      </SalesWorkspace>
    </Suspense>
  );
}
