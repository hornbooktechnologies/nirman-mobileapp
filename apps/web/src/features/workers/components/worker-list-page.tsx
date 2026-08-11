"use client";

import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { OrganizationContextSelect } from "@/features/projects/components/organization-context-select";
import { useWorkers } from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export function WorkerListPage() {
  const organizations = useOrganizations();
  const [organizationId, setOrganizationId] = useState("");
  const [query, setQuery] = useState<{
    search: string;
    status: WorkerStatus | "";
    trade: string;
  }>({ search: "", status: "", trade: "" });
  const workers = useWorkers(organizationId, query);
  const workerRows = workers.data?.data ?? [];

  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) {
      setOrganizationId(organizations.data[0].id);
    }
  }, [organizationId, organizations.data]);

  return (
    <PermissionGuard permission="workers:read">
      <div className="space-y-4">
        <PageHeader
          title="Workers"
          description="Manage labour records, project rosters, and wage-readiness details."
          actions={
            <Link href={`/workers/new${organizationId ? `?organizationId=${organizationId}` : ""}`}>
              <Button>
                <Plus size={16} />
                New Worker
              </Button>
            </Link>
          }
        />

        <Card>
          <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_180px_180px]">
            <OrganizationContextSelect
              organizationId={organizationId}
              onChange={setOrganizationId}
            />
            <Input
              placeholder="Search code, name, or mobile"
              value={query.search}
              onChange={(event) => setQuery({ ...query, search: event.target.value })}
            />
            <Select
              value={query.status}
              onChange={(event) =>
                setQuery({ ...query, status: event.target.value as WorkerStatus | "" })
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
              onChange={(event) => setQuery({ ...query, trade: event.target.value })}
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
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}
