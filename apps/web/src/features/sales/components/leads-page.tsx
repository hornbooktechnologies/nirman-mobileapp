"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LEAD_STAGES } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { CollectionPagination } from "@/components/ui/collection-toolbar";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { useLeads, useSalesLifetime } from "../hooks/use-sales";
import { salesService } from "../services/sales.service";
import { label, salesKey } from "../sales-rules";
import { Failure, Status, dateTime } from "./sales-ui";
import { LeadForm, useAssignees } from "./lead-form";
import { SalesFilters } from "./sales-filters";
import { salesDetailUrl, salesListUrl } from "../sales-view";
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
    router.replace(salesListUrl(pathname, params, { [name]: value }, name === "page" ? [] : ["page"]), { scroll: false });
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
      <SalesFilters
        name="leads"
        scope={team ? "Showing leads visible to your project role." : "Showing leads assigned to you or otherwise visible to your role."}
        search={{ value: search, placeholder: "Name, phone or email", maxLength: 160, onChange: (value) => filter("search", value) }}
        value={{ stage: stage ?? "", ...(team ? { assignedTo: assignedTo ?? "" } : {}) }}
        fields={[
          { key: "stage", name: "Stage", options: LEAD_STAGES },
          ...(team ? [{ key: "assignedTo", name: "Assignee", options: assignees.data?.map((a) => a.value) ?? [], optionLabels: Object.fromEntries((assignees.data ?? []).map((a) => [a.value, a.label])) }] : []),
        ]}
        onApply={(value) => router.replace(salesListUrl(pathname, params, value, ["page"]), { scroll: false })}
      />
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
                      href={salesDetailUrl(`/projects/${c.project}/sales/leads/${lead.id}`, salesListUrl(pathname, params, {}))}
                    >
                      {lead.customerName}
                    </Link>
                    <Status value={lead.currentStage} />
                  </div>
                  <p className="mt-2">{lead.primaryMobile}</p>
                  <p className="text-sm text-sub">
                    {label(lead.source)} · {label(lead.priority)} priority
                  </p>
                  <p className="mt-3">Owner: {lead.assignedToName || "Unassigned"}</p>
                  <p className="text-sm text-sub">
                    Updated {dateTime(lead.updatedAt, c.timezone)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
          <CollectionPagination page={page} pageCount={Math.ceil(query.data.meta.total / 25)} total={query.data.meta.total} busy={query.isFetching} onPageChange={(next) => filter("page", String(next))} />
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
