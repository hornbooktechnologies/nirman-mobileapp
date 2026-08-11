"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectStatus, type ProjectType } from "@nirman-app/shared";
import { Button, Card, Input, PageHeader, Select, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { OrganizationContextSelect } from "@/features/projects/components/organization-context-select";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  ON_HOLD: "warning",
  COMPLETED: "success",
  ARCHIVED: "inactive",
} as const;

export function ProjectListPage() {
  const organizations = useOrganizations();
  const [organizationId, setOrganizationId] = useState("");
  const [query, setQuery] = useState<{
    search: string;
    status: ProjectStatus | "";
    type: ProjectType | "";
  }>({ search: "", status: "", type: "" });
  const projects = useProjects(organizationId, query);
  const projectRows = projects.data?.data ?? [];

  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) {
      setOrganizationId(organizations.data[0].id);
    }
  }, [organizationId, organizations.data]);

  return (
    <PermissionGuard permission="projects:read">
      <div className="space-y-4">
        <PageHeader
          title="Projects"
          description="Create projects, review setup status, and manage assignment."
          actions={
            <Link href={`/projects/new${organizationId ? `?organizationId=${organizationId}` : ""}`}>
              <Button>
                <Plus size={16} />
                New Project
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
              placeholder="Search projects"
              value={query.search}
              onChange={(event) => setQuery({ ...query, search: event.target.value })}
            />
            <Select
              value={query.status}
              onChange={(event) =>
                setQuery({ ...query, status: event.target.value as ProjectStatus | "" })
              }
            >
              <option value="">All statuses</option>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
            <Select
              value={query.type}
              onChange={(event) =>
                setQuery({ ...query, type: event.target.value as ProjectType | "" })
              }
            >
              <option value="">All types</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>
        </Card>

        <Card>
          {!organizationId ? (
            <p className="text-[13px] text-body">Select an organization to view projects.</p>
          ) : projects.isLoading ? (
            <p className="text-[13px] text-body">Loading projects</p>
          ) : projects.isError ? (
            <p className="text-[13px] text-red-600">Unable to load projects</p>
          ) : projectRows.length === 0 ? (
            <p className="text-[13px] text-body">No projects match this view.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link href={`/projects/${project.id}?organizationId=${organizationId}`}>
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>{project.projectCode ?? "-"}</TableCell>
                    <TableCell>{project.type}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone[project.status]}>
                        {project.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{project.address.city ?? "-"}</TableCell>
                    <TableCell>{project.memberCount}</TableCell>
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
