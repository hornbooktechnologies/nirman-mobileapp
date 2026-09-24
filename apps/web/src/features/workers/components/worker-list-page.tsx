"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CollectionToolbar,
  CollectionPagination,
  FieldLabel,
  Input,
  LoadingState,
  NotificationBanner,
  PageHeader,
  Select,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { useProjectWorkers, useWorkers } from "../hooks/use-workers";
import { WorkerWorkspace } from "./worker-workspace";
import { WorkerCollectionRows } from "./worker-collection-rows";
import {
  matchesWorkerAssignment,
  readWorkerListQuery,
  workerContext,
  workerFilterDefaults,
  workerListHref,
  type AssignmentFilter,
} from "../worker-list-query";

export function WorkerListPage() {
  return (
    <WorkerWorkspace permission="workers:read">
      {(organizationId) => <WorkerList organizationId={organizationId} />}
    </WorkerWorkspace>
  );
}
function WorkerList({ organizationId }: { organizationId: string }) {
  const params = useSearchParams();
  const { hasPermission } = useAuth();
  const query = readWorkerListQuery(
    new URLSearchParams(params.toString()),
    organizationId,
  );
  const access = useProjectAccess(organizationId);
  const projects = (access.data?.projects ?? []).filter((project) =>
    project.permissions.includes("workers:read"),
  );
  const selected = query.projectId
    ? projects.find((project) => project.id === query.projectId)
    : (projects.find((project) => project.isDefault) ?? projects[0]);
  const projectId = selected?.id ?? "";
  const workers = useWorkers(organizationId, {
    search: query.search,
    status: query.status,
    trade: query.trade,
    page: query.page,
    pageSize: 20,
  });
  const roster = useProjectWorkers(
    access.isSuccess && projectId ? organizationId : null,
    projectId,
    { assignmentScope: "ALL_ACTIVE", pageSize: 100 },
  );
  const readiness =
    access.isError || roster.isError
      ? "unknown"
      : access.isPending || (projectId && roster.isPending)
        ? "loading"
        : !projectId || !roster.data
          ? "unknown"
          : "ready";
  const byId = new Map(
    (roster.data?.data ?? []).map((worker) => [worker.id, worker]),
  );
  const rows = (workers.data?.data ?? []).map((worker) => ({
    worker,
    context: workerContext(worker, byId.get(worker.id), readiness),
  }));
  const visible = rows.filter((row) =>
    matchesWorkerAssignment(row.context, query.assignment),
  );
  const returnTo = workerListHref(
    { ...query, projectId: query.projectId || projectId },
    organizationId,
  );
  function update(values: Partial<typeof query>) {
    const latest = readWorkerListQuery(
      new URLSearchParams(window.location.search),
      organizationId,
    );
    window.history.replaceState(
      null,
      "",
      workerListHref(
        { ...latest, projectId: latest.projectId || projectId, ...values },
        organizationId,
      ),
    );
  }
  function refresh() {
    void workers.refetch();
    void access.refetch();
    if (projectId) void roster.refetch();
  }
  const detailHref = (id: string) =>
    `/workers/${id}?${new URLSearchParams({ organizationId, ...(projectId ? { projectId } : {}), returnTo })}`;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Workers"
        description="Worker records, project assignments and current rate context."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={workers.isFetching || roster.isFetching}
              onClick={refresh}
            >
              Refresh
            </Button>
            {hasPermission("workers:create") ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-inner bg-lime px-4 text-sm font-medium text-lime-ink"
                href={`/workers/new?${new URLSearchParams({ organizationId, returnTo })}`}
              >
                New worker
              </Link>
            ) : null}
          </div>
        }
      />
      {params.get("deletedWorker") ? (
        <NotificationBanner
          variant="success"
          title="Worker permanently deleted"
          description={`${params.get("deletedWorker")} and all related records were removed.`}
        />
      ) : null}
      <Card>
        <CollectionToolbar
          name="workers"
          search={{
            value: query.search,
            onChange: (search) => update({ search, page: 1 }),
            placeholder: "Name, code or mobile",
          }}
          scope={`Current organization · Project context: ${selected?.name ?? (access.isPending ? "Loading" : "Unavailable")}`}
          filters={{
            value: {
              status: query.status as string,
              trade: query.trade,
              assignment: query.assignment,
              projectId: query.projectId || projectId,
            },
            defaults: {
              ...workerFilterDefaults,
              projectId: query.projectId || projectId,
            },
            count:
              Number(Boolean(query.status)) +
              Number(Boolean(query.trade)) +
              Number(query.assignment !== "all"),
            onApply: (draft) =>
              update({
                ...draft,
                status: draft.status as typeof query.status,
                page: 1,
              }),
            fields: (draft, setDraft, id) => (
              <>
                <div>
                  <FieldLabel htmlFor={`${id}-project`}>
                    Project context
                  </FieldLabel>
                  <Select
                    id={`${id}-project`}
                    value={draft.projectId}
                    disabled={!access.isSuccess}
                    onChange={(event) =>
                      setDraft({ ...draft, projectId: event.target.value })
                    }
                  >
                    <option value="">Choose a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-status`}>
                    Worker status
                  </FieldLabel>
                  <Select
                    id={`${id}-status`}
                    value={draft.status}
                    onChange={(event) =>
                      setDraft({ ...draft, status: event.target.value })
                    }
                  >
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-trade`}>Trade</FieldLabel>
                  <Input
                    id={`${id}-trade`}
                    value={draft.trade}
                    onChange={(event) =>
                      setDraft({ ...draft, trade: event.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-assignment`}>
                    Assignment on this page
                  </FieldLabel>
                  <Select
                    id={`${id}-assignment`}
                    value={draft.assignment}
                    disabled={!draft.projectId}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        assignment: event.target.value as AssignmentFilter,
                      })
                    }
                  >
                    <option value="all">All workers</option>
                    <option value="working_here">Working here</option>
                    <option value="assigned_here">
                      Assigned here (includes working here)
                    </option>
                    <option value="not_on_project">
                      Elsewhere or unassigned
                    </option>
                  </Select>
                  <p className="mt-2 text-[13px] text-sub">
                    Assignment filters apply to the current results page.
                    Search, status and trade search the full worker directory.
                    Inactive and unavailable assignments are excluded from
                    assignment filters.
                  </p>
                </div>
              </>
            ),
          }}
        />
        <p className="mt-3 text-[13px] text-sub">
          Working here means this is the primary project today. Assigned here
          can include scheduled assignments.
        </p>
      </Card>
      {readiness === "unknown" ? (
        <NotificationBanner
          variant="warning"
          title="Assignment context unavailable"
          description="Choose an accessible project in Filters or refresh access. Unknown assignments are never treated as unassigned."
          action={
            <Button variant="outline" onClick={refresh}>
              Refresh access and roster
            </Button>
          }
        />
      ) : null}
      <Card aria-busy={workers.isFetching || roster.isFetching}>
        {workers.isPending ? (
          <LoadingState label="Loading workers" />
        ) : workers.isError ? (
          <NotificationBanner
            variant="danger"
            title="Workers could not be loaded"
            action={
              <Button onClick={() => void workers.refetch()}>Retry</Button>
            }
          />
        ) : readiness === "loading" && query.assignment !== "all" ? (
          <LoadingState label="Checking assignments" />
        ) : visible.length === 0 ? (
          <p className="text-sm text-sub">
            {query.assignment !== "all"
              ? "No confirmed matches on this page. Change filters or use the next page."
              : "No workers match this view. Change search or filters."}
          </p>
        ) : (
          <WorkerCollectionRows visible={visible} detailHref={detailHref} />
        )}
      </Card>
      {workers.data && !workers.isError ? (
        <>
          <p className="text-[13px] text-sub">
            {query.assignment !== "all"
              ? `${visible.length} assignment matches on this page. Pagination below covers directory results before the assignment filter.`
              : ""}
          </p>
          <CollectionPagination
            page={query.page}
            pageCount={workers.data.meta.pageCount}
            total={workers.data.meta.total}
            busy={workers.isFetching}
            onPageChange={(page) => update({ page })}
          />
          {query.page > Math.max(1, workers.data.meta.pageCount) ? (
            <Button variant="outline" onClick={() => update({ page: 1 })}>
              Return to first page
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
