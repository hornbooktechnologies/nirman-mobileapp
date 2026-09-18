"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LEAD_STAGES } from "@nirman-app/shared";
import { Button, Card, Input, Select, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { useLeads, useSalesLifetime } from "../hooks/use-sales";
import { salesService } from "../services/sales.service";
import { label, salesKey } from "../sales-rules";
import { Failure, Status, dateTime } from "./sales-ui";
import { LeadForm, useAssignees } from "./lead-form";
function Leads({ c }: { c: SalesContext }) {
  const live = useSalesLifetime();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const cache = useQueryClient();
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const stage = LEAD_STAGES.find((s) => s === params.get("stage"));
  const search = (params.get("search") ?? "").slice(0, 160);
  const team =
    c.permissions.includes("leads:read-team") ||
    c.permissions.includes("leads:read-all");
  const assignedTo = team ? params.get("assignedTo") || undefined : undefined;
  const query = useLeads(c.org, c.project, {
    page,
    limit: 25,
    stage,
    search,
    assignedTo,
  });
  const assignees = useAssignees(c);
  const [open, setOpen] = useState(false);
  function filter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-semibold">Sales leads</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            Refresh
          </Button>
          {c.active && c.permissions.includes("leads:create") && (
            <Button onClick={() => setOpen(true)}>Create lead</Button>
          )}
        </div>
      </header>
      <form
        className="grid items-end gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          filter(
            "search",
            String(new FormData(e.currentTarget).get("search") ?? "").trim(),
          );
        }}
      >
        <label>
          Search customers
          <Input
            key={search}
            name="search"
            defaultValue={search}
            maxLength={160}
            placeholder="Name, phone or email"
          />
        </label>
        <label>
          Stage
          <Select
            value={stage ?? ""}
            onChange={(e) => filter("stage", e.target.value)}
          >
            <option value="">All stages</option>
            {LEAD_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {team && (
        <label className="block max-w-md">
          Assignee
          <Select
            value={assignedTo ?? ""}
            onChange={(e) => filter("assignedTo", e.target.value)}
          >
            <option value="">All assignees</option>
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
      {(search || stage || assignedTo) && (
        <Button variant="outline" onClick={() => router.replace(pathname)}>
          Clear filters
        </Button>
      )}
      {query.isPending ? (
        <LoadingState label="Loading leads" />
      ) : query.isError ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.isFetching && <p role="status">Refreshing leads…</p>}
          <p className="text-sm text-sub">
            {query.data.meta.total} leads matching your filters
          </p>
          {!query.data.data.length && (
            <Card>No leads found. Try clearing filters or create a lead.</Card>
          )}
          <ul className="grid gap-4 lg:grid-cols-2">
            {query.data.data.map((lead) => (
              <li key={lead.id}>
                <Card>
                  <div className="flex flex-wrap justify-between gap-3">
                    <Link
                      className="text-lg font-semibold underline"
                      href={`/projects/${c.project}/sales/leads/${lead.id}`}
                    >
                      {lead.customerName}
                    </Link>
                    <Status value={lead.currentStage} />
                  </div>
                  <p className="mt-2">{lead.primaryMobile}</p>
                  <p className="text-sm text-sub">
                    {label(lead.source)} · {label(lead.priority)} priority
                  </p>
                  <p className="mt-3">{lead.assignedToName || "Unassigned"}</p>
                  <p className="text-sm text-sub">
                    Updated {dateTime(lead.updatedAt, c.timezone)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
          <nav
            aria-label="Lead pagination"
            className="flex items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => filter("page", String(page - 1))}
            >
              Previous
            </Button>
            <p>
              Page {page} of{" "}
              {Math.max(1, Math.ceil(query.data.meta.total / 25))}
            </p>
            <Button
              variant="outline"
              disabled={page * 25 >= query.data.meta.total}
              onClick={() => filter("page", String(page + 1))}
            >
              Next
            </Button>
          </nav>
        </>
      )}
      {open && (
        <LeadForm
          c={c}
          close={() => setOpen(false)}
          refresh={async () => {
            const r = await query.refetch();
            if (r.error) throw r.error;
          }}
          save={async (input) => {
            const lead = await salesService.createLead(c.org, c.project, input);
            if (!live.current) return;
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
            setOpen(false);
            router.push(
              `/projects/${c.project}/sales/leads/${lead.id}?created=1`,
            );
          }}
        />
      )}
    </div>
  );
}
export function LeadsPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading Sales" />}>
      <SalesWorkspace projectId={projectId} section="leads">
        {(c) => <Leads c={c} />}
      </SalesWorkspace>
    </Suspense>
  );
}
