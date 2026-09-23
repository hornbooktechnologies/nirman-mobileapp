"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Suspense, useEffect } from "react";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@nirman-app/shared";
import {
  Button,
  Card,
  CollectionToolbar,
  CollectionPagination,
  DataTable,
  EmptyState,
  FieldLabel,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  defaultProjectFilters,
  projectListHref,
  readProjectListQuery,
} from "../project-list-query";
import type { ProjectQuery } from "../types/projects.types";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  ON_HOLD: "warning",
  COMPLETED: "success",
  ARCHIVED: "inactive",
} as const;
const label = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

export function ProjectListPage() {
  const { activeOrganizationId, user } = useAuth();
  return (
    <PermissionGuard permission="projects:read">
      <Suspense fallback={<LoadingState label="Loading projects" />}>
        <ProjectList
          key={`${user?.id}:${activeOrganizationId}`}
          organizationId={activeOrganizationId ?? ""}
        />
      </Suspense>
    </PermissionGuard>
  );
}

function ProjectList({ organizationId }: { organizationId: string }) {
  const { hasPermission } = useAuth();
  const params = useSearchParams();
  const query = readProjectListQuery(params, organizationId);
  const projects = useProjects(organizationId, query);
  const organizations = useOrganizations(Boolean(organizationId));
  const organization = organizations.data?.find(
    (item) => item.id === organizationId,
  );
  const filters = { status: query.status, type: query.type };
  const count = Number(Boolean(filters.status)) + Number(Boolean(filters.type));
  const returnTo = projectListHref(organizationId, query);
  const hasFilters = Boolean(query.search || count);

  useEffect(() => {
    if (
      organizationId &&
      `${window.location.pathname}${window.location.search}` !== returnTo
    ) {
      window.history.replaceState(null, "", returnTo);
    }
  }, [organizationId, returnTo]);

  function updateQuery(patch: ProjectQuery) {
    // Read the latest URL so fast search/filter events cannot overwrite each other.
    const current = readProjectListQuery(
      new URLSearchParams(window.location.search),
      organizationId,
    );
    window.history.replaceState(
      null,
      "",
      projectListHref(organizationId, { ...current, ...patch }),
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Create projects, review setup status, and manage assignment."
        actions={
          hasPermission("projects:create") ? (
            <Link href="/projects/new">
              <Button>
                <Plus size={16} aria-hidden="true" />
                New Project
              </Button>
            </Link>
          ) : undefined
        }
      />
      <Card>
        <CollectionToolbar
          name="projects"
          disabled={!organizationId}
          scope={
            organization
              ? `Organization: ${organization.name}`
              : organizationId
                ? "Projects in the active organization shown in the app header."
                : "Select an organization in the app header."
          }
          search={{
            value: query.search,
            onChange: (search) => updateQuery({ search, page: 1 }),
            placeholder: "Name, code, or city",
          }}
          filters={{
            value: filters,
            defaults: defaultProjectFilters,
            count,
            onApply: (next) => updateQuery({ ...next, page: 1 }),
            fields: (draft, setDraft, id) => (
              <>
                <div>
                  <FieldLabel htmlFor={`${id}-status`} className="mb-1 block">
                    Project status
                  </FieldLabel>
                  <Select
                    id={`${id}-status`}
                    value={draft.status}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        status: event.target.value as typeof draft.status,
                      })
                    }
                  >
                    <option value="">All statuses</option>
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-type`} className="mb-1 block">
                    Project type
                  </FieldLabel>
                  <Select
                    id={`${id}-type`}
                    value={draft.type}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        type: event.target.value as typeof draft.type,
                      })
                    }
                  >
                    <option value="">All types</option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {label(type)}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ),
          }}
        />
      </Card>
      {!organizationId ? (
        <EmptyState
          title="Choose an organization"
          description="Select an organization in the app header to view its projects."
        />
      ) : projects.isLoading ? (
        <LoadingState label="Loading projects" />
      ) : projects.isError ? (
        <EmptyState
          title="Unable to load projects"
          description="Results could not be refreshed. Your search and filters are retained."
          action={
            <Button variant="outline" onClick={() => void projects.refetch()}>
              Try again
            </Button>
          }
        />
      ) : projects.data?.paginationAvailable === false ? (
        <EmptyState
          title="Project list is unavailable"
          description="The response did not include reliable pagination information. Try refreshing the list."
          action={
            <Button variant="outline" onClick={() => void projects.refetch()}>
              Try again
            </Button>
          }
        />
      ) : projects.data ? (
        <Card>
          <div aria-busy={projects.isFetching}>
            <p role="status" className="mb-3 text-[13px] text-sub">
              {projects.isFetching
                ? "Refreshing projects…"
                : "Projects you can access in this organization."}
            </p>
            <DataTable
              rows={projects.data.data}
              getRowKey={(row) => row.id}
              tableClassName="min-w-[640px]"
              empty={
                <EmptyState
                  title={
                    query.page > 1
                      ? "No projects on this page"
                      : hasFilters
                        ? "No matching projects"
                        : "No projects yet"
                  }
                  description={
                    query.page > 1
                      ? "The list may have changed. Return to the first page."
                      : hasFilters
                        ? "Try a different search or open Filters to adjust this view."
                        : "Projects available to you will appear here."
                  }
                  action={
                    query.page > 1 ? (
                      <Button
                        variant="outline"
                        onClick={() => updateQuery({ page: 1 })}
                      >
                        First page
                      </Button>
                    ) : undefined
                  }
                />
              }
              columns={[
                {
                  id: "name",
                  header: "Name",
                  className: "max-w-sm break-words",
                  cell: (project) => (
                    <Link
                      className="font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-lime"
                      href={`/projects/${project.id}?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      {project.name}
                    </Link>
                  ),
                },
                {
                  id: "code",
                  header: "Code",
                  cell: (project) => project.projectCode ?? "—",
                },
                {
                  id: "type",
                  header: "Type",
                  cell: (project) => label(project.type),
                },
                {
                  id: "status",
                  header: "Status",
                  cell: (project) => (
                    <StatusBadge tone={statusTone[project.status]}>
                      {label(project.status)}
                    </StatusBadge>
                  ),
                },
                {
                  id: "city",
                  header: "City",
                  cell: (project) => project.address.city ?? "—",
                },
                {
                  id: "members",
                  header: "Members",
                  className: "text-right tabular-nums",
                  headerClassName: "text-right",
                  cell: (project) => project.memberCount,
                },
              ]}
            />
          </div>
          <CollectionPagination
            page={projects.data.meta.page}
            pageCount={projects.data.meta.pageCount}
            total={projects.data.meta.total}
            busy={projects.isFetching}
            onPageChange={(page) => updateQuery({ page })}
          />
        </Card>
      ) : null}
    </div>
  );
}
