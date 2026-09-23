"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MATERIAL_REQUEST_STATUSES,
  MATERIAL_WORKFLOW_MODES,
  type MaterialWorkflowMode,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Dialog,
  LoadingState,
  Select,
} from "@/components/ui";
import { projectsService } from "@/features/projects/services/projects.service";
import { validDate } from "@/features/attendance/date-utils";
import {
  useMaterials,
  useMaterialSettings,
  useMaterialSummary,
} from "../hooks/use-materials";
import { label, materialKey } from "../material-rules";
import { materialsService } from "../services/materials.service";
import type {
  MaterialsQuery,
  MaterialSettings,
} from "../types/materials.types";
import {
  MaterialsWorkspace,
  type MaterialsContext,
} from "./materials-workspace";
import { MaterialForm } from "./material-form";
import { MaterialsCollectionFilters, defaultMaterialsQuery } from "./materials-collection-filters";
import { financialListHref } from "@/features/financial-return";
import { date, Failure, MaterialStatus, money } from "./materials-ui";

export function MaterialsPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading Materials" />}>
      <MaterialsWorkspace projectId={projectId}>
        {(context) => <List context={context} />}
      </MaterialsWorkspace>
    </Suspense>
  );
}
function List({ context }: { context: MaterialsContext }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState<MaterialsQuery>(() => ({
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: 20,
    search: params.get("search")?.slice(0, 160) || undefined,
    status: MATERIAL_REQUEST_STATUSES.find((s) => s === params.get("status")),
    requiredFrom: validDate(params.get("requiredFrom") ?? "") ? params.get("requiredFrom")! : undefined,
    requiredTo: validDate(params.get("requiredTo") ?? "") ? params.get("requiredTo")! : undefined,
    requestedByMemberId: params.get("requestedByMemberId") || undefined,
    responsibleContractorMemberId:
      params.get("responsibleContractorMemberId") || undefined,
    sortBy:
      (
        ["requestedOn", "requiredByDate", "updatedAt", "materialName"] as const
      ).find((s) => s === params.get("sortBy")) ?? "updatedAt",
    sortOrder: params.get("sortOrder") === "asc" ? "asc" : "desc",
  }));
  const [search, setSearch] = useState(query.search ?? "");
  const [create, setCreate] = useState(false);
  const [configure, setConfigure] = useState(false);
  const [notice, setNotice] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
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
      if (value !== undefined && key !== "pageSize")
        next.set(key, String(value));
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${next}`,
    );
  }, [query]);
  const list = useMaterials(context.org, context.project, query);
  const summary = useMaterialSummary(context.org, context.project, query);
  const settings = useMaterialSettings(context.org, context.project);
  const members = useQuery({
    queryKey: [...materialKey(context.org, context.project), "members"],
    queryFn: () => projectsService.members(context.org, context.project),
    enabled: context.permissions.includes("project-members:read"),
  });
  const can = (permission: string) =>
    context.permissions.includes(`materials:${permission}`);
  const exporting = useMutation({
    retry: false,
    mutationFn: () =>
      materialsService.export(context.org, context.project, query),
    onSuccess: (csv) => {
      if (!mounted.current) return;
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `materials-${context.project}.csv`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Materials CSV downloaded.");
    },
  });
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Materials</h1>
          <p className="text-sub">
            Requests, approvals, purchases, and deliveries
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void list.refetch();
              void summary.refetch();
              void settings.refetch();
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
              New request
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
        <LoadingState label="Loading workflow" />
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
          {!settings.data.configured && (
            <p>
              Configure the project workflow before creating requests.
              {!can("configure") &&
                " Ask a project administrator to configure it."}
            </p>
          )}
        </Card>
      )}
      {summary.isPending ? (
        <LoadingState label="Loading Materials summary" />
      ) : summary.isError ? (
        <Failure error={summary.error} retry={() => void summary.refetch()} />
      ) : (
        <section
          aria-label="Filtered Materials summary"
          className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        >
          {[
            ["Requests", summary.data.totalRequests],
            ["Overdue", summary.data.overdueRequests],
            ["Estimated cost", money(summary.data.estimatedCost)],
            ["Purchase cost", money(summary.data.purchaseCost)],
          ].map(([title, value]) => (
            <Card key={title}>
              <p className="text-sm text-sub">{title}</p>
              <p className="break-words text-xl font-semibold tabular-nums">
                {value}
              </p>
            </Card>
          ))}
        </section>
      )}
      <Card className="space-y-4">
        <MaterialsCollectionFilters
          query={query} search={search} onSearch={setSearch}
          onApply={setQuery} members={members.data ?? []}
          canReadMembers={context.permissions.includes("project-members:read")}
          memberSearch={memberSearch} onMemberSearch={setMemberSearch}
          memberState={<>{members.isPending && <p role="status">Loading members…</p>}{members.isError && <Failure error={members.error} retry={() => void members.refetch()} />}</>}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setSearch(""); setMemberSearch(""); setQuery(defaultMaterialsQuery); }}>Clear all</Button>
          {can("export") && <Button variant="outline" disabled={exporting.isPending} onClick={() => exporting.mutate()}>{exporting.isPending ? "Preparing CSV…" : "Export filtered CSV"}</Button>}
        </div>
        {exporting.isError && <p role="alert" className="text-danger">{exporting.error.message} Use Export filtered CSV to retry.</p>}
      </Card>
      {list.isPending ? (
        <LoadingState label="Loading requests" />
      ) : list.isError ? (
        <Failure error={list.error} retry={() => void list.refetch()} />
      ) : (
        <>
          <p className="text-sm text-sub" role="status">
            {list.data.pagination.total} requests
            {list.isFetching ? " · Refreshing…" : ""}
          </p>
          {!list.data.items.length ? (
            <Card>
              No requests match these filters. Clear filters or create a
              request.
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {list.data.items.map((item) => (
                <Link
                  className="block min-w-0 rounded-card focus-visible:outline-2 focus-visible:outline-lime"
                  key={item.id}
                  href={`/projects/${context.project}/materials/${item.id}?returnTo=${encodeURIComponent(financialListHref(context.project, "materials", query))}`}
                >
                  <Card className="h-full space-y-3 hover:border-lime">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="break-words text-lg font-semibold">
                        {item.materialName}
                      </h2>
                      <MaterialStatus status={item.status} />
                    </div>
                    <p className="text-sm text-sub">
                      {item.category ?? "Uncategorized"} · Requested by{" "}
                      {item.requestedBy}
                    </p>
                    <p className="text-sm text-sub">{item.status === "PENDING_FINAL" ? "Awaiting final approval" : item.status === "APPROVED" ? "Approved; purchase can be recorded" : item.status === "ORDERED" ? "Ordered; delivery can be recorded" : item.status === "PARTIALLY_DELIVERED" ? "Partially delivered" : item.status === "DELIVERED" ? "Delivered in full" : "Open request detail for permitted actions"}</p>
                    <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums sm:grid-cols-4">
                      {[["Requested", item.requestedQuantity], ["Ordered", item.orderedQuantity], ["Delivered", item.deliveredQuantity], ["Outstanding", item.remainingQuantity]].map(([title, value]) => <div key={title}><dt className="text-sub">{title}</dt><dd className="font-semibold">{value} {item.customUnitLabel ?? label(item.unitOfMeasure)}</dd></div>)}
                    </dl>
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>Required: {date(item.requiredByDate)}</span>
                      <span>Purchased: {money(item.totalPurchaseCost)}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          <nav
            aria-label="Materials pagination"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              disabled={list.data.pagination.page <= 1}
              onClick={() =>
                setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))
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
                list.data.pagination.page >= list.data.pagination.totalPages
              }
              onClick={() =>
                setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))
              }
            >
              Next
            </Button>
          </nav>
        </>
      )}
      {create && (
        <MaterialForm
          context={context}
          action="CREATE"
          close={() => setCreate(false)}
          refresh={async () => undefined}
          saved={(record) => {
            setCreate(false);
            router.push(
              `/projects/${context.project}/materials/${record.id}?created=1`,
            );
          }}
        />
      )}
      {configure && settings.data && (
        <Settings
          context={context}
          settings={settings.data}
          close={() => setConfigure(false)}
          saved={() => {
            setConfigure(false);
            setNotice(
              "Workflow settings saved. Existing requests keep their original workflow.",
            );
          }}
        />
      )}
    </div>
  );
}
function Settings({
  context,
  settings,
  close,
  saved,
}: {
  context: MaterialsContext;
  settings: MaterialSettings;
  close: () => void;
  saved: () => void;
}) {
  const [mode, setMode] = useState<MaterialWorkflowMode>(
    settings.workflowMode ?? "DIRECT",
  );
  const [approvers, setApprovers] = useState<string[]>(settings.approvalMembers?.filter((m) => m.delegated).map((m) => m.memberId) ?? []);
  const cache = useQueryClient();
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      materialsService.configure(context.org, context.project, mode, settings.canManageApprovers ? approvers : undefined, settings.version),
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: materialKey(context.org, context.project),
      });
      saved();
    },
  });
  const cancel = () => {
    if (
      !mutation.isPending &&
      ((mode === settings.workflowMode && JSON.stringify(approvers) === JSON.stringify(settings.approvalMembers?.filter((m) => m.delegated).map((m) => m.memberId) ?? [])) ||
        window.confirm("Discard workflow changes?"))
    )
      close();
  };
  return (
    <Dialog
      open
      title="Materials workflow"
      description="Workflow changes apply to new requests. Approval delegation applies to all pending requests in this project."
      onOpenChange={cancel}
      footer={
        <>
          <Button
            variant="outline"
            onClick={cancel}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save workflow"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-base">
        {mutation.isError && (
          <div className="space-y-2">
            <p role="alert" className="text-danger">{mutation.error.message}</p>
            <Button variant="outline" onClick={() => { void cache.invalidateQueries({ queryKey: materialKey(context.org, context.project) }); close(); }}>Close and refresh settings</Button>
          </div>
        )}
        <label>
          Workflow *
          <Select
            disabled={mutation.isPending}
            value={mode}
            onChange={(e) => setMode(e.target.value as MaterialWorkflowMode)}
          >
            {MATERIAL_WORKFLOW_MODES.map((m) => (
              <option key={m} value={m}>
                {label(m)}
              </option>
            ))}
          </Select>
        </label>
        <p>
          {mode === "DIRECT"
            ? "Submission approves the request directly."
            : "The Owner or a delegated project approver makes the final decision. The first decision completes the review. Owners can approve their own requests; delegates cannot."}
        </p>
        <fieldset className="space-y-3" disabled={mutation.isPending || !settings.canManageApprovers}>
          <legend className="font-semibold">Delegated project approvers</legend>
          <p className="text-sm text-muted-foreground">Only the organization Owner can grant or revoke approval. Members need active project access and Materials read access.</p>
          {(settings.approvalMembers ?? []).filter((m) => m.isOwner && m.canApprove).map((m) => <p key={m.memberId}>{m.name} — Owner</p>)}
          {(settings.approvalMembers ?? []).filter((m) => !m.isOwner).map((m) => (
            <label key={m.memberId} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={approvers.includes(m.memberId)} onChange={(e) => setApprovers((current) => e.target.checked ? [...current, m.memberId] : current.filter((id) => id !== m.memberId))} />
              <span>{m.name} · {m.roleName}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </Dialog>
  );
}
