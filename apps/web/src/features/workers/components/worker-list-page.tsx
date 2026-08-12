"use client";

import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { WORKER_STATUSES, type WorkerStatus } from "@nirman-app/shared";
import {
  Button,
  Card,
  Input,
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
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { OrganizationContextSelect } from "@/features/projects/components/organization-context-select";
import { useWorkers } from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export function WorkerListPage() {
  const { hasPermission } = useAuth();
  const organizations = useOrganizations();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const organizationId =
    selectedOrganizationId || organizations.data?.[0]?.id || "";
  const [query, setQuery] = useState<{
    search: string;
    status: WorkerStatus | "";
    trade: string;
    page: number;
    pageSize: number;
  }>({ search: "", status: "", trade: "", page: 1, pageSize: 20 });
  const workers = useWorkers(organizationId, query);
  const workerRows = workers.data?.data ?? [];

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title="Workers"
          description="Manage labour records, project rosters, and wage-readiness details."
          actions={hasPermission("workers:create") ? (
            <Link href={`/workers/new${organizationId ? `?organizationId=${organizationId}` : ""}`}>
              <Button>
                <Plus size={16} />
                New Worker
              </Button>
            </Link>
          ) : undefined}
        />

        <Card>
          <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_180px_180px]">
            <OrganizationContextSelect
              organizationId={organizationId}
              onChange={setSelectedOrganizationId}
            />
            <Input
              placeholder="Search code, name, or mobile"
              value={query.search}
              onChange={(event) =>
                setQuery({ ...query, search: event.target.value, page: 1 })
              }
            />
            <Select
              value={query.status}
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
              placeholder="Trade"
              value={query.trade}
              onChange={(event) =>
                setQuery({ ...query, trade: event.target.value, page: 1 })
              }
            />
          </div>
        </Card>

        <Card>
          {!organizationId ? (
            <p className="text-[13px] text-body">Select an organization to view workers.</p>
          ) : workers.isLoading ? (
            <p className="text-[13px] text-body">Loading workers</p>
          ) : workers.isError ? (
            <p className="text-[13px] text-red-600">Unable to load workers</p>
          ) : workerRows.length === 0 ? (
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
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerRows.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <Link href={`/workers/${worker.id}?organizationId=${organizationId}`}>
                          {worker.workerCode}
                        </Link>
                      </TableCell>
                      <TableCell>{worker.name}</TableCell>
                      <TableCell>{worker.trade}</TableCell>
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
                  Page {workers.data?.meta.page ?? query.page} of {Math.max(1, workers.data?.meta.pageCount ?? 1)} · {workers.data?.meta.total ?? 0} workers
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
