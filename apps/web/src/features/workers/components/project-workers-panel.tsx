"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, Card, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useProjectWorkers } from "@/features/workers/hooks/use-workers";

const statusTone = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ENDED: "inactive",
} as const;

export function ProjectWorkersPanel({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const roster = useProjectWorkers(organizationId, projectId, { pageSize: 100 });
  const rosterRows = roster.data?.data ?? [];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-body">Workers</h2>
          <p className="text-[13px] text-sub">
            Project roster used later by Attendance, Wages, and Kharchi.
          </p>
        </div>
        <PermissionGuard permission="workers:create">
          <Link href={`/workers/new?organizationId=${organizationId}&projectId=${projectId}`}>
            <Button size="sm">
              <Plus size={16} />
              Add Worker11
            </Button>
          </Link>
        </PermissionGuard>
      </div>

      {roster.isLoading ? (
        <p className="text-[13px] text-body">Loading project workers</p>
      ) : roster.isError ? (
        <p className="text-[13px] text-red-600">Unable to load project workers</p>
      ) : rosterRows.length === 0 ? (
        <p className="text-[13px] text-body">No workers assigned to this project yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rosterRows.map((worker) => (
              <TableRow key={worker.currentAssignment.id}>
                <TableCell>
                  <Link href={`/workers/${worker.id}?organizationId=${organizationId}`}>
                    {worker.workerCode}
                  </Link>
                </TableCell>
                <TableCell>{worker.name}</TableCell>
                <TableCell>{worker.trade}</TableCell>
                <TableCell>{worker.currentAssignment.dailyRate ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone[worker.currentAssignment.status]}>
                    {worker.currentAssignment.status}
                  </StatusBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
