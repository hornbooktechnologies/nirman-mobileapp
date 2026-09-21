"use client";

import Link from "next/link";
import { Plus, RefreshCw, UsersRound } from "lucide-react";
import { LoadingState } from "@/components/ui";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { WORKER_STATUSES, type WorkerStatus } from "@nirman-app/shared";
import {
  Button,
  Card,
  IconButton,
  Input,
  NotificationBanner,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { WorkerWorkspace } from "./worker-workspace";
import { OrganizationContextSelect } from "@/features/projects/components/organization-context-select";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { useProjectWorkers, useWorkers } from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

type ProjectAssignmentFilter = "all" | "working_here" | "assigned_here" | "not_on_project";

export function WorkerListPage() {
  return <WorkerWorkspace permission="workers:read">{organizationId => <WorkerList organizationId={organizationId} />}</WorkerWorkspace>;
}

function WorkerList({ organizationId }: { organizationId: string }) {
  const searchParams = useSearchParams();
  const { hasPermission, refreshUser } = useAuth();
  const [query, setQuery] = useState<{
    search: string;
    status: WorkerStatus | "";
    trade: string;
    page: number;
    pageSize: number;
  }>({ search: "", status: "", trade: "", page: 1, pageSize: 20 });
  const workers = useWorkers(organizationId, query);
  const projectAccess = useProjectAccess(organizationId);
  const readableProjects = useMemo(
    () => (projectAccess.data?.projects ?? []).filter((project) => project.permissions.includes("workers:read")),
    [projectAccess.data?.projects],
  );
  const [projectId, setProjectId] = useState("");
  const selectedProjectId = projectId || readableProjects.find((project) => project.isDefault)?.id || readableProjects[0]?.id || "";
  const [assignmentFilter, setAssignmentFilter] = useState<ProjectAssignmentFilter>("all");
  const roster = useProjectWorkers(
    selectedProjectId ? organizationId : null,
    selectedProjectId,
    { assignmentScope: "ALL_ACTIVE", pageSize: 100 },
  );
  const rosterByWorkerId = useMemo(
    () => new Map((roster.data?.data ?? []).map((worker) => [worker.id, worker])),
    [roster.data?.data],
  );
  const workerRows = workers.data?.data ?? [];
  const filteredWorkerRows = workerRows.filter((worker) => {
    if (!selectedProjectId || assignmentFilter === "all") return true;
    const projectWorker = rosterByWorkerId.get(worker.id);
    if (assignmentFilter === "working_here") return projectWorker?.isPrimaryForDate === true;
    if (assignmentFilter === "assigned_here") return Boolean(projectWorker);
    return !projectWorker;
  });
  const deletedWorker = searchParams.get("deletedWorker");

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title="Workers"
          description="Manage labour records, project rosters, and wage-readiness details."
          actions={(
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="Refresh workers"
                title="Refresh workers"
                variant="outline"
                disabled={!organizationId || workers.isFetching}
                onClick={() => void workers.refetch()}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={workers.isFetching ? "animate-spin" : undefined}
                  size={17}
                />
              </IconButton>
              {hasPermission("workers:create") ? (
                <Link
                  href={`/workers/new${organizationId ? `?organizationId=${organizationId}` : ""}`}
                >
                  <Button>
                    <Plus size={16} />
                    New Worker
                  </Button>
                </Link>
              ) : null}
            </div>
          )}
        />

        {deletedWorker ? (
          <NotificationBanner
            variant="success"
            title="Worker permanently deleted"
            description={`${deletedWorker} and all related records were removed.`}
          />
        ) : null}

        <Card>
          <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_180px_180px]">
            <OrganizationContextSelect organizationId={organizationId} onChange={id => { void refreshUser(id); }} />
            <Input
              aria-label="Search code, name, or mobile" placeholder="Search code, name, or mobile"
              value={query.search}
              onChange={(event) =>
                setQuery({ ...query, search: event.target.value, page: 1 })
              }
            />
            <Select
              aria-label="Worker status" value={query.status}
              onChange={(event) =>
                setQuery({
                  ...query,
                  status: event.target.value as WorkerStatus | "",
                  page: 1,
                })
              }
            >
              <option value="">All statuses</option>
              {WORKER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Trade" placeholder="Trade"
              value={query.trade}
              onChange={(event) =>
                setQuery({ ...query, trade: event.target.value, page: 1 })
              }
            />
            <Select
              aria-label="Project for assignment filter"
              value={selectedProjectId}
              disabled={projectAccess.isLoading || readableProjects.length === 0}
              onChange={(event) => {
                setProjectId(event.target.value);
                setAssignmentFilter("all");
                setQuery({ ...query, page: 1 });
              }}
            >
              <option value="">Choose a project</option>
              {readableProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>
            <Select
              aria-label="Project assignment filter"
              value={assignmentFilter}
              disabled={!selectedProjectId || roster.isLoading}
              onChange={(event) => setAssignmentFilter(event.target.value as ProjectAssignmentFilter)}
            >
              <option value="all">All workers</option>
              <option value="working_here">Working here</option>
              <option value="assigned_here">Assigned to this project</option>
              <option value="not_on_project">Not on this project</option>
            </Select>
          </div>
          {selectedProjectId ? <p className="mt-3 text-sm text-sub">“Working here” shows workers whose primary project is this selected project today.</p> : null}
        </Card>

        <Card aria-busy={workers.isFetching}>
          {!organizationId ? (
            <p className="text-[13px] text-body">
              Select an organization to view workers.
            </p>
          ) : workers.isLoading ? (
            <LoadingState label="Loading workers" />
          ) : workers.isError ? (
            <p className="text-[13px] text-red-600">Unable to load workers</p>
          ) : filteredWorkerRows.length === 0 ? (
            <div className="flex items-center gap-3 text-[13px] text-body">
              <UsersRound size={18} />
              No workers match this view.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Trade</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkerRows.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <Link
                          href={`/workers/${worker.id}?organizationId=${organizationId}`}
                        >
                          {worker.workerCode}
                        </Link>
                      </TableCell>
                      <TableCell>{worker.name}</TableCell>
                      <TableCell>{worker.trade}</TableCell>
                      <TableCell>{worker.baseDailyRate ?? "-"}</TableCell>
                      <TableCell>{worker.mobileNumber ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge tone={statusTone[worker.status]}>
                          {worker.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{worker.activeAssignmentCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-sub">
                <span>
                  Page {workers.data?.meta.page ?? query.page} of{" "}
                  {Math.max(1, workers.data?.meta.pageCount ?? 1)} ·{" "}
                  {workers.data?.meta.total ?? 0} workers
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={query.page <= 1 || workers.isFetching}
                    onClick={() => setQuery({ ...query, page: query.page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      query.page >= (workers.data?.meta.pageCount ?? 1) ||
                      workers.isFetching
                    }
                    onClick={() => setQuery({ ...query, page: query.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
