"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LEAD_STAGES } from "@nirman-app/shared";
import { Button, Card, LoadingState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
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
          <RefreshButton variant="outline" busy={query.isFetching} onRefresh={() => query.refetch()}>
            Refresh
          </RefreshButton>
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
        <Failure error={query.error} retry={() => query.refetch()} />
      ) : (
        <>
          {query.isFetching && <p role="status">Refreshing leads…</p>}
          <p className="text-sm text-sub">
            {query.data.meta.total} leads matching your filters
          </p>
          {!query.data.data.length && (
            <Card>No leads found. Try clearing filters or create a lead.</Card>
          )}
          {!!query.data.data.length && (
            <Table aria-label="Sales leads" className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Link
                        className="font-semibold text-body underline decoration-hairline underline-offset-4 transition-colors hover:text-lime focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                        href={salesDetailUrl(`/projects/${c.project}/sales/leads/${lead.id}`, salesListUrl(pathname, params, {}))}
                      >
                        {lead.customerName}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{lead.primaryMobile}</TableCell>
                    <TableCell>{label(lead.source)}</TableCell>
                    <TableCell>{label(lead.priority)}</TableCell>
                    <TableCell>{lead.assignedToName || "Unassigned"}</TableCell>
                    <TableCell><Status value={lead.currentStage} /></TableCell>
                    <TableCell className="whitespace-nowrap text-sub">{dateTime(lead.updatedAt, c.timezone)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
