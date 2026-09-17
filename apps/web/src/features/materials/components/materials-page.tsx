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
  Input,
  LoadingState,
  Select,
} from "@/components/ui";
import { projectsService } from "@/features/projects/services/projects.service";
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
    requiredFrom: params.get("requiredFrom") || undefined,
    requiredTo: params.get("requiredTo") || undefined,
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
  const filter = (key: keyof MaterialsQuery, value: string) =>
    setQuery((q) => ({ ...q, [key]: value || undefined, page: 1 }));
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            Search
            <Input
              maxLength={160}
              value={search}
              placeholder="Material or category"
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Status
            <Select
              value={query.status ?? ""}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {MATERIAL_REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Required from
            <Input
              type="date"
              value={query.requiredFrom ?? ""}
              onChange={(e) => filter("requiredFrom", e.target.value)}
            />
          </label>
          <label>
            Required to
            <Input
              type="date"
              min={query.requiredFrom}
              value={query.requiredTo ?? ""}
              onChange={(e) => filter("requiredTo", e.target.value)}
            />
          </label>
          <label>
            Sort by
            <Select
              value={query.sortBy}
              onChange={(e) => filter("sortBy", e.target.value)}
            >
              {[
                "updatedAt",
                "requestedOn",
                "requiredByDate",
                "materialName",
              ].map((s, i) => (
                <option key={s} value={s}>
                  {
                    [
                      "Last updated",
                      "Request date",
                      "Required date",
                      "Material name",
                    ][i]
                  }
                </option>
              ))}
            </Select>
          </label>
          <label>
            Order
            <Select
              value={query.sortOrder}
              onChange={(e) => filter("sortOrder", e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </label>
        </div>
        {context.permissions.includes("project-members:read") && (
          <details>
            <summary className="cursor-pointer py-2 font-medium">
              Member filters
            </summary>
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                Find member
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
              </label>
              {(
                [
                  "requestedByMemberId",
                  "responsibleContractorMemberId",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {i === 0 ? "Requested by" : "Responsible member"}
                  <Select
                    value={query[key] ?? ""}
                    onChange={(e) => filter(key, e.target.value)}
                  >
                    <option value="">All members</option>
                    {query[key] &&
                      !members.data?.some((m) => m.memberId === query[key]) && (
                        <option value={query[key]}>
                          Selected member ({query[key]})
                        </option>
                      )}
                    {members.data
                      ?.filter(
                        (m) =>
                          m.memberId === query[key] ||
                          m.user.name
                            .toLowerCase()
                            .includes(memberSearch.toLowerCase()),
                      )
                      .map((m) => (
                        <option key={m.memberId} value={m.memberId}>
                          {m.user.name}
                        </option>
                      ))}
                  </Select>
                </label>
              ))}
            </div>
            {members.isPending && <p role="status">Loading members…</p>}
            {members.isError && (
              <Failure
                error={members.error}
                retry={() => void members.refetch()}
              />
            )}
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setMemberSearch("");
              setQuery({
                page: 1,
                pageSize: 20,
                sortBy: "updatedAt",
                sortOrder: "desc",
              });
            }}
          >
            Clear filters
          </Button>
          {can("export") && (
            <Button
              variant="outline"
              disabled={exporting.isPending}
              onClick={() => exporting.mutate()}
            >
              {exporting.isPending ? "Preparing CSV…" : "Export filtered CSV"}
            </Button>
          )}
        </div>
        {exporting.isError && (
          <p role="alert" className="text-danger">
            {exporting.error.message} Use Export filtered CSV to retry.
          </p>
        )}
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
                  href={`/projects/${context.project}/materials/${item.id}`}
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
                    <p className="font-semibold tabular-nums">
                      {item.deliveredQuantity} / {item.requestedQuantity}{" "}
                      {item.customUnitLabel ?? label(item.unitOfMeasure)}{" "}
                      delivered
                    </p>
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
  const cache = useQueryClient();
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      materialsService.configure(context.org, context.project, mode),
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
      (mode === settings.workflowMode ||
        window.confirm("Discard workflow changes?"))
    )
      close();
  };
  return (
    <Dialog
      open
      title="Materials workflow"
      description="Applies to new requests only. Existing requests retain their workflow."
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
          <p role="alert" className="text-danger">
            {mutation.error.message}
          </p>
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
            : mode === "FINAL_APPROVAL"
              ? "Submission requires final commercial approval by another authorized member."
              : "Submission requires verification, then final commercial approval. The requester cannot approve their own request."}
        </p>
      </div>
    </Dialog>
  );
}
