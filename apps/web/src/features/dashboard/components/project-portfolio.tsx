"use client";

import { useMemo, useState } from "react";
import { PackageCheck, RotateCcw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Chip,
  FieldLabel,
  SectionHeader,
  Select,
  StatusBadge,
} from "@/components/ui";
import {
  dashboardProjects,
  dashboardProjectStatuses,
} from "@/features/dashboard/data/dashboard.data";
import type { DashboardProjectStatus } from "@/features/dashboard/types/dashboard.types";

const allProjectsValue = "all-projects";
const allStatusesValue = "all-statuses";

const statusBadgeVariant: Record<
  DashboardProjectStatus,
  "success" | "purple" | "warning" | "neutral"
> = {
  "In Progress": "success",
  Planning: "purple",
  "On Hold": "warning",
  "Not Started": "neutral",
};

export function ProjectPortfolio() {
  const [projectId, setProjectId] = useState(allProjectsValue);
  const [status, setStatus] = useState(allStatusesValue);

  const visibleProjects = useMemo(
    () =>
      dashboardProjects.filter(
        (project) =>
          (projectId === allProjectsValue || project.id === projectId) &&
          (status === allStatusesValue || project.status === status),
      ),
    [projectId, status],
  );

  const hasActiveFilters =
    projectId !== allProjectsValue || status !== allStatusesValue;

  function resetFilters() {
    setProjectId(allProjectsValue);
    setStatus(allStatusesValue);
  }

  const selectedProjectName = useMemo(() => {
    if (projectId === allProjectsValue) return null;
    return dashboardProjects.find((p) => p.id === projectId)?.name ?? projectId;
  }, [projectId]);

  return (
    <Card padding="none" className="h-full border-hairline/80 shadow-pill">
      <SectionHeader
        title="Project portfolio"
        description="Current project controls and site reporting states."
        actions={
          <Badge variant="default" aria-live="polite">
            {visibleProjects.length} of {dashboardProjects.length} projects
          </Badge>
        }
        className="border-b border-hairline/80 px-5 py-4 sm:px-6"
      />

      <div className="grid gap-3.5 border-b border-hairline/80 bg-sunken/40 px-5 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_180px_auto] sm:items-end sm:px-6">
        <div className="min-w-0">
          <FieldLabel htmlFor="dashboard-project-filter" className="mb-1.5 block">
            Project
          </FieldLabel>
          <Select
            id="dashboard-project-filter"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            aria-label="Filter dashboard projects by project"
          >
            <option value={allProjectsValue}>All projects</option>
            {dashboardProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor="dashboard-status-filter" className="mb-1.5 block">
            Project status
          </FieldLabel>
          <Select
            id="dashboard-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter dashboard projects by status"
          >
            <option value={allStatusesValue}>All statuses</option>
            {dashboardProjectStatuses.map((projectStatus) => (
              <option key={projectStatus} value={projectStatus}>
                {projectStatus}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="text-[12px]"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline/60 bg-sunken/20 px-5 py-2 sm:px-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.5px] text-sub">Active Filters:</span>
          {selectedProjectName ? (
            <Chip onRemove={() => setProjectId(allProjectsValue)}>
              Project: {selectedProjectName}
            </Chip>
          ) : null}
          {status !== allStatusesValue ? (
            <Chip onRemove={() => setStatus(allStatusesValue)}>
              Status: {status}
            </Chip>
          ) : null}
        </div>
      ) : null}

      <div>
        {visibleProjects.length > 0 ? (
          <div className="divide-y divide-hairline/60">
            {visibleProjects.map((project) => (
              <article
                key={project.id}
                className="grid min-w-0 gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-sunken/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-inner border border-hairline bg-sunken/80 text-body shadow-pill">
                    <PackageCheck size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-[13.5px] font-semibold text-body">
                      {project.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[12px] leading-4 text-sub">
                      {project.description}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  tone={statusBadgeVariant[project.status]}
                  className="justify-self-start sm:justify-self-end font-semibold"
                >
                  {project.status}
                </StatusBadge>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center" role="status">
            <p className="text-[14px] font-semibold text-body">No matching projects</p>
            <p className="mt-1 text-[12px] leading-5 text-sub">
              Reset the filters to return to the full portfolio.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
