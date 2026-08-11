"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  Filter,
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  Rows3,
  X,
} from "lucide-react";
import { AppShell } from "@/design-system/navigation/app-shell";
import {
  Button,
  Checkbox,
  FilterChip,
  IconButton,
  SearchField,
  SelectField,
  Skeleton,
  StatusBadge,
  TextField,
  type SelectOption,
  type StatusTone,
} from "@/design-system/primitives/controls";
import {
  ActionMenu,
  ConfirmDialog,
  Drawer,
  Toast,
} from "@/design-system/overlays/overlays";
import {
  CollectionState,
  CollectionSurface,
  BulkActionBar,
  PageHeader,
  StaleDataBanner,
} from "@/design-system/patterns/collection-patterns";
import {
  DataCell,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableScroll,
  HeaderCell,
  SortableHeader,
  TableMessage,
  type SortDirection,
} from "@/design-system/data/data-table";
import {
  categoryOptions,
  previewProjects,
  statusOptions,
  type PreviewProject,
  type ProjectStatus,
} from "./project-fixtures";
import styles from "./projects-preview.module.css";

type PreviewScenario =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "denied"
  | "stale";

type PermissionScenario = "full" | "view-only" | "no-create" | "no-archive";
type SortKey = "name" | "status" | "category" | "progress" | "units" | "updated";
type Density = "default" | "compact";
type ProgressFilter = "any" | "under-50" | "50-99" | "complete";

interface AdvancedFilters {
  location: string;
  progress: ProgressFilter;
  hasUnits: boolean;
}

interface VisibleColumns {
  organization: boolean;
  category: boolean;
  progress: boolean;
  units: boolean;
  updated: boolean;
}

const scenarioOptions: SelectOption[] = [
  { value: "default", label: "Default collection" },
  { value: "loading", label: "Loading rows" },
  { value: "empty", label: "Empty workspace" },
  { value: "error", label: "Server error" },
  { value: "denied", label: "Permission denied" },
  { value: "stale", label: "Offline / stale data" },
];

const permissionOptions: SelectOption[] = [
  { value: "full", label: "Full access" },
  { value: "view-only", label: "View only" },
  { value: "no-create", label: "No create permission" },
  { value: "no-archive", label: "No archive permission" },
];

const progressOptions: SelectOption[] = [
  { value: "any", label: "Any progress" },
  { value: "under-50", label: "Below 50%" },
  { value: "50-99", label: "50–99%" },
  { value: "complete", label: "Complete (100%)" },
];

const rowsPerPageOptions: SelectOption[] = [
  { value: "10", label: "10 rows" },
  { value: "20", label: "20 rows" },
  { value: "50", label: "50 rows" },
];

const densityOptions: SelectOption[] = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
];

const defaultAdvancedFilters: AdvancedFilters = {
  location: "",
  progress: "any",
  hasUnits: false,
};

const initialColumns: VisibleColumns = {
  organization: true,
  category: true,
  progress: true,
  units: true,
  updated: true,
};

const statusTone: Record<ProjectStatus, StatusTone> = {
  Active: "success",
  Completed: "info",
  "On hold": "warning",
  Draft: "neutral",
};

function getSortValue(project: PreviewProject, key: SortKey): string | number {
  switch (key) {
    case "name":
      return project.name;
    case "status":
      return project.status;
    case "category":
      return project.category;
    case "progress":
      return project.progress ?? Number.POSITIVE_INFINITY;
    case "units":
      return project.unitsTotal ?? Number.POSITIVE_INFINITY;
    case "updated":
      return project.updatedMinutesAgo;
  }
}

function compareProjects(
  first: PreviewProject,
  second: PreviewProject,
  key: SortKey,
  direction: SortDirection,
) {
  const firstValue = getSortValue(first, key);
  const secondValue = getSortValue(second, key);
  const result =
    typeof firstValue === "string" && typeof secondValue === "string"
      ? firstValue.localeCompare(secondValue)
      : Number(firstValue) - Number(secondValue);
  return direction === "asc" ? result : -result;
}

export function ProjectsPreview() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [scenario, setScenario] = useState<PreviewScenario>("default");
  const [permissionScenario, setPermissionScenario] =
    useState<PermissionScenario>("full");
  const [toast, setToast] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(
    defaultAdvancedFilters,
  );
  const [draftAdvancedFilters, setDraftAdvancedFilters] =
    useState<AdvancedFilters>(defaultAdvancedFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [density, setDensity] = useState<Density>("default");
  const [columns, setColumns] = useState<VisibleColumns>(initialColumns);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<PreviewProject | null>(null);

  const showToast = useCallback((message: string) => setToast(message), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
      setSelectedIds(new Set());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  const permissions = useMemo(
    () => ({
      canView: scenario !== "denied",
      canCreate:
        scenario !== "denied" &&
        (permissionScenario === "full" || permissionScenario === "no-archive"),
      canEdit:
        scenario !== "denied" &&
        (permissionScenario === "full" ||
          permissionScenario === "no-create" ||
          permissionScenario === "no-archive"),
      canArchive:
        scenario !== "denied" &&
        (permissionScenario === "full" || permissionScenario === "no-create"),
    }),
    [permissionScenario, scenario],
  );

  const filteredProjects = useMemo(() => {
    const source = scenario === "empty" ? [] : previewProjects;
    const search = debouncedSearch.toLocaleLowerCase();
    const location = advancedFilters.location.trim().toLocaleLowerCase();

    return source
      .filter((project) => {
        if (
          search &&
          ![
            project.name,
            project.code,
            project.location ?? "",
            project.organization,
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(search)
        ) {
          return false;
        }
        if (status !== "all" && project.status !== status) return false;
        if (category !== "all" && project.category !== category) return false;
        if (
          location &&
          !(project.location ?? "").toLocaleLowerCase().includes(location)
        ) {
          return false;
        }
        if (advancedFilters.hasUnits && project.unitsTotal === null) return false;
        if (
          advancedFilters.progress === "under-50" &&
          (project.progress === null || project.progress >= 50)
        ) {
          return false;
        }
        if (
          advancedFilters.progress === "50-99" &&
          (project.progress === null ||
            project.progress < 50 ||
            project.progress >= 100)
        ) {
          return false;
        }
        if (
          advancedFilters.progress === "complete" &&
          project.progress !== 100
        ) {
          return false;
        }
        return true;
      })
      .sort((first, second) =>
        compareProjects(first, second, sortKey, sortDirection),
      );
  }, [
    advancedFilters,
    category,
    debouncedSearch,
    scenario,
    sortDirection,
    sortKey,
    status,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredProjects.slice(pageStart, pageStart + rowsPerPage);
  const pageIds = pageRows.map((project) => project.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allOnPage = pageRows.length > 0 && selectedOnPage === pageRows.length;
  const someOnPage = selectedOnPage > 0 && !allOnPage;

  const activeFilterCount =
    Number(Boolean(debouncedSearch)) +
    Number(status !== "all") +
    Number(category !== "all") +
    Number(Boolean(advancedFilters.location)) +
    Number(advancedFilters.progress !== "any") +
    Number(advancedFilters.hasUnits);

  const visibleColumnCount =
    4 + Object.values(columns).filter(Boolean).length;

  function resetSelectionAndPage() {
    setSelectedIds(new Set());
    setPage(1);
  }

  function changeSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDirection("asc");
    }
    setPage(1);
    setSelectedIds(new Set());
  }

  function goToPage(nextPage: number) {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
    setSelectedIds(new Set());
  }

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function clearFilters() {
    setSearchValue("");
    setDebouncedSearch("");
    setStatus("all");
    setCategory("all");
    setAdvancedFilters(defaultAdvancedFilters);
    setDraftAdvancedFilters(defaultAdvancedFilters);
    resetSelectionAndPage();
  }

  function setReviewScenario(value: string) {
    setScenario(value as PreviewScenario);
    setSelectedIds(new Set());
    setArchiveTarget(null);
    setPage(1);
  }

  function applyAdvancedFilters() {
    setAdvancedFilters({
      ...draftAdvancedFilters,
      location: draftAdvancedFilters.location.trim(),
    });
    setFiltersOpen(false);
    resetSelectionAndPage();
  }

  function removeAdvancedFilter(key: keyof AdvancedFilters) {
    const next = {
      ...advancedFilters,
      [key]: key === "hasUnits" ? false : key === "progress" ? "any" : "",
    } as AdvancedFilters;
    setAdvancedFilters(next);
    setDraftAdvancedFilters(next);
    resetSelectionAndPage();
  }

  function renderActiveFilters() {
    if (!activeFilterCount) return undefined;

    return (
      <>
        <span className={styles.activeFilterLabel}>Active filters</span>
        {debouncedSearch ? (
          <FilterChip
            label="Search"
            value={debouncedSearch}
            onRemove={() => {
              setSearchValue("");
              setDebouncedSearch("");
              resetSelectionAndPage();
            }}
          />
        ) : null}
        {status !== "all" ? (
          <FilterChip
            label="Status"
            value={status}
            onRemove={() => {
              setStatus("all");
              resetSelectionAndPage();
            }}
          />
        ) : null}
        {category !== "all" ? (
          <FilterChip
            label="Category"
            value={category}
            onRemove={() => {
              setCategory("all");
              resetSelectionAndPage();
            }}
          />
        ) : null}
        {advancedFilters.location ? (
          <FilterChip
            label="Location"
            value={advancedFilters.location}
            onRemove={() => removeAdvancedFilter("location")}
          />
        ) : null}
        {advancedFilters.progress !== "any" ? (
          <FilterChip
            label="Progress"
            value={
              progressOptions.find(
                (option) => option.value === advancedFilters.progress,
              )?.label ?? advancedFilters.progress
            }
            onRemove={() => removeAdvancedFilter("progress")}
          />
        ) : null}
        {advancedFilters.hasUnits ? (
          <FilterChip
            label="Inventory"
            value="Has units"
            onRemove={() => removeAdvancedFilter("hasUnits")}
          />
        ) : null}
        {activeFilterCount >= 2 ? (
          <button type="button" className={styles.clearAll} onClick={clearFilters}>
            Clear all
          </button>
        ) : null}
      </>
    );
  }

  function renderToolbar() {
    if (selectedIds.size) {
      return (
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
        >
          <Button
            variant="secondary"
            size="compact"
            leadingIcon={Download}
            onClick={() => showToast("Selected projects were exported from dummy data.")}
          >
            Export
          </Button>
          {permissions.canEdit ? (
            <Button
              variant="secondary"
              size="compact"
              onClick={() => showToast("Status update simulated. No data was changed.")}
            >
              Put on hold
            </Button>
          ) : null}
          {permissions.canArchive ? (
            <Button
              variant="tertiary"
              size="compact"
              leadingIcon={Archive}
              onClick={() =>
                showToast("Bulk archive is disabled for non-persistent preview data.")
              }
            >
              Archive
            </Button>
          ) : null}
        </BulkActionBar>
      );
    }

    return (
      <div className={styles.toolbarRow}>
        <SearchField
          compact
          value={searchValue}
          onChange={setSearchValue}
          label="Search projects"
          placeholder="Search projects, codes, locations…"
          className={styles.projectSearch}
        />
        <SelectField
          compact
          value={status}
          options={statusOptions}
          onChange={(value) => {
            setStatus(value);
            resetSelectionAndPage();
          }}
          ariaLabel="Filter by status"
          className={styles.primaryFilter}
        />
        <SelectField
          compact
          value={category}
          options={categoryOptions}
          onChange={(value) => {
            setCategory(value);
            resetSelectionAndPage();
          }}
          ariaLabel="Filter by category"
          className={styles.primaryFilter}
        />
        <Button
          variant="secondary"
          size="compact"
          leadingIcon={Filter}
          onClick={() => {
            setDraftAdvancedFilters(advancedFilters);
            setFiltersOpen(true);
          }}
        >
          Filters
          {activeFilterCount ? (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          ) : null}
        </Button>
        <span className={styles.toolbarSpacer} />
        <div className={styles.tableTools}>
          <ActionMenu
            label="Table settings"
            triggerIcon={Columns3}
            items={[
              ...(Object.keys(columns) as Array<keyof VisibleColumns>).map(
                (key) => ({
                  id: key,
                  label: key[0].toUpperCase() + key.slice(1),
                  checked: columns[key],
                  onSelect: () => {
                    const willShow = !columns[key];
                    setColumns((current) => ({
                      ...current,
                      [key]: !current[key],
                    }));
                    if (
                      !willShow &&
                      key !== "organization" &&
                      sortKey === key
                    ) {
                      setSortKey("name");
                      setSortDirection("asc");
                    }
                  },
                }),
              ),
              {
                id: "density-default",
                label: "Default density",
                checked: density === "default",
                selectionRole: "radio" as const,
                separatorBefore: true,
                onSelect: () => setDensity("default"),
              },
              {
                id: "density-compact",
                label: "Compact density",
                checked: density === "compact",
                selectionRole: "radio" as const,
                onSelect: () => setDensity("compact"),
              },
            ]}
          />
          <SelectField
            compact
            value={density}
            options={densityOptions}
            onChange={(value) => setDensity(value as Density)}
            ariaLabel="Table density"
            triggerIcon={Rows3}
            className={styles.densitySelect}
          />
        </div>
      </div>
    );
  }

  function renderTableRows() {
    if (scenario === "loading") {
      return Array.from({ length: 8 }, (_, index) => (
        <DataTableRow key={`skeleton-${index}`}>
          <DataCell pin="select">
            <Skeleton width="18px" />
          </DataCell>
          <DataCell pin="primary">
            <div className={styles.skeletonStack}>
              <Skeleton width={`${58 + (index % 3) * 10}%`} />
              <Skeleton width="42%" />
            </div>
          </DataCell>
          {columns.organization ? (
            <DataCell priority="tertiary">
              <Skeleton width="70%" />
            </DataCell>
          ) : null}
          {columns.category ? (
            <DataCell priority="secondary">
              <Skeleton width="64%" />
            </DataCell>
          ) : null}
          <DataCell>
            <Skeleton width="74px" />
          </DataCell>
          {columns.progress ? (
            <DataCell priority="secondary">
              <Skeleton width="72%" />
            </DataCell>
          ) : null}
          {columns.units ? (
            <DataCell priority="tertiary">
              <Skeleton width="48px" />
            </DataCell>
          ) : null}
          {columns.updated ? (
            <DataCell priority="secondary">
              <Skeleton width="76%" />
            </DataCell>
          ) : null}
          <DataCell pin="actions">
            <Skeleton width="24px" />
          </DataCell>
        </DataTableRow>
      ));
    }

    if (scenario === "error") {
      return (
        <TableMessage colSpan={visibleColumnCount}>
          <CollectionState
            kind="error"
            action={
              <Button
                variant="secondary"
                leadingIcon={RefreshCw}
                onClick={() => {
                  setScenario("default");
                  showToast("Projects loaded from local preview fixtures.");
                }}
              >
                Try again
              </Button>
            }
          />
        </TableMessage>
      );
    }

    if (!filteredProjects.length) {
      const isEmptyWorkspace = scenario === "empty" && activeFilterCount === 0;
      return (
        <TableMessage colSpan={visibleColumnCount}>
          <CollectionState
            kind={isEmptyWorkspace ? "empty" : "no-results"}
            action={
              isEmptyWorkspace && permissions.canCreate ? (
                <Button
                  variant="primary"
                  leadingIcon={Plus}
                  onClick={() =>
                    showToast("Create project is disconnected in the preview.")
                  }
                >
                  Create project
                </Button>
              ) : !isEmptyWorkspace ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        </TableMessage>
      );
    }

    return pageRows.map((project, index) => (
      <DataTableRow key={project.id} selected={selectedIds.has(project.id)}>
        <DataCell pin="select">
          <Checkbox
            checked={selectedIds.has(project.id)}
            onChange={(checked) => toggleRow(project.id, checked)}
            label={`Select ${project.name}`}
          />
        </DataCell>
        <DataCell pin="primary">
          <button
            type="button"
            className={styles.projectLink}
            onClick={() =>
              showToast(`${project.name} detail view is not connected in the preview.`)
            }
          >
            {project.name}
          </button>
          <span className={styles.projectMeta}>
            <span>{project.code}</span>
            <span aria-hidden="true">•</span>
            <span>{project.location ?? "Location not provided"}</span>
          </span>
        </DataCell>
        {columns.organization ? (
          <DataCell priority="tertiary">
            <span className={styles.singleLine}>{project.organization}</span>
          </DataCell>
        ) : null}
        {columns.category ? (
          <DataCell priority="secondary">{project.category}</DataCell>
        ) : null}
        <DataCell>
          <StatusBadge tone={statusTone[project.status]}>
            {project.status}
          </StatusBadge>
        </DataCell>
        {columns.progress ? (
          <DataCell priority="secondary">
            {project.progress === null ? (
              <span className={styles.missingValue}>Not available</span>
            ) : (
              <div className={styles.progressCell}>
                <span>{project.progress}%</span>
                <span className={styles.progressTrack} aria-hidden="true">
                  <span
                    style={
                      { "--project-progress": `${project.progress}%` } as CSSProperties
                    }
                  />
                </span>
              </div>
            )}
          </DataCell>
        ) : null}
        {columns.units ? (
          <DataCell priority="tertiary" align="right">
            {project.unitsTotal === null ? (
              <span className={styles.missingValue}>—</span>
            ) : (
              <span className={styles.numericCell}>
                {project.unitsSold ?? 0}/{project.unitsTotal}
              </span>
            )}
          </DataCell>
        ) : null}
        {columns.updated ? (
          <DataCell priority="secondary">
            <span className={styles.updatedCell}>{project.updatedLabel}</span>
          </DataCell>
        ) : null}
        <DataCell pin="actions">
          <ActionMenu
            label={`Actions for ${project.name}`}
            placement={index >= pageRows.length - 3 ? "top" : "bottom"}
            items={[
              {
                id: "view",
                label: "View project",
                icon: Eye,
                onSelect: () =>
                  showToast(`${project.name} detail view is not connected.`),
              },
              {
                id: "edit",
                label: permissions.canEdit ? "Edit project" : "Edit requires permission",
                icon: Pencil,
                disabled: !permissions.canEdit,
                onSelect: () => showToast("Edit action simulated."),
              },
              {
                id: "archive",
                label: permissions.canArchive
                  ? "Archive project"
                  : "Archive requires permission",
                icon: Archive,
                disabled: !permissions.canArchive,
                danger: true,
                separatorBefore: true,
                onSelect: () => setArchiveTarget(project),
              },
            ]}
          />
        </DataCell>
      </DataTableRow>
    ));
  }

  const collectionFooter = (
    <div className={styles.pagination}>
      <span className={styles.resultCount}>
        {filteredProjects.length
          ? `${pageStart + 1}–${Math.min(pageStart + rowsPerPage, filteredProjects.length)} of ${filteredProjects.length}`
          : "0 projects"}
      </span>
      <div className={styles.paginationControls}>
        <span className={styles.rowsLabel}>Rows per page</span>
        <SelectField
          compact
          value={String(rowsPerPage)}
          options={rowsPerPageOptions}
          onChange={(value) => {
            setRowsPerPage(Number(value));
            setPage(1);
            setSelectedIds(new Set());
          }}
          ariaLabel="Rows per page"
          className={styles.rowsSelect}
        />
        <span className={styles.pageDivider} />
        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          size="compact"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        />
        <div className={styles.pageNumbers}>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={styles.pageNumber}
                data-current={pageNumber === currentPage || undefined}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ),
          )}
        </div>
        <span className={styles.mobilePageSummary}>
          Page {currentPage} of {totalPages}
        </span>
        <IconButton
          icon={ChevronRight}
          label="Next page"
          size="compact"
          disabled={currentPage >= totalPages}
          onClick={() => goToPage(currentPage + 1)}
        />
      </div>
    </div>
  );

  return (
    <AppShell
      sidebarCollapsed={sidebarCollapsed}
      mobileNavigationOpen={mobileNavigationOpen}
      onSidebarToggle={() => setSidebarCollapsed((current) => !current)}
      onMobileNavigationChange={setMobileNavigationOpen}
      onPrototypeAction={showToast}
    >
      <div className={styles.pageScroll}>
        <div className={styles.pageContent}>
          <PageHeader
            title="Projects"
            description="Manage project identity, category, progress, inventory, and recent activity."
            actions={permissions.canView ? (
              <>
                <Button
                  variant="secondary"
                  leadingIcon={Download}
                  onClick={() => showToast("Project export generated from local dummy data.")}
                  className={styles.exportButton}
                >
                  Export
                </Button>
                {permissions.canCreate ? (
                  <Button
                    variant="primary"
                    leadingIcon={Plus}
                    onClick={() =>
                      showToast("Create project is intentionally disconnected.")
                    }
                  >
                    Create project
                  </Button>
                ) : null}
                <span className={styles.mobilePageActions}>
                  <ActionMenu
                    label="More project actions"
                    items={[
                      {
                        id: "export-projects",
                        label: "Export projects",
                        icon: Download,
                        onSelect: () =>
                          showToast(
                            "Project export generated from local dummy data.",
                          ),
                      },
                    ]}
                  />
                </span>
              </>
            ) : null}
          />

          {!permissions.canView ? (
            <section className={styles.deniedSurface}>
              <CollectionState
                kind="denied"
                action={
                  <Button
                    variant="secondary"
                    leadingIcon={ArrowLeft}
                    onClick={() => setScenario("default")}
                  >
                    Back to Projects
                  </Button>
                }
              />
            </section>
          ) : (
            <CollectionSurface
              banner={
                scenario === "stale" ? (
                  <StaleDataBanner
                    onRetry={() => {
                      setScenario("default");
                      showToast("Projects refreshed from local preview fixtures.");
                    }}
                  />
                ) : undefined
              }
              toolbar={renderToolbar()}
              activeFilters={renderActiveFilters()}
              footer={scenario === "error" ? undefined : collectionFooter}
            >
              <DataTableScroll className={styles.tableScroll}>
                <DataTable
                  density={density}
                  aria-label="Projects"
                  aria-busy={scenario === "loading"}
                >
                  <DataTableHead>
                    <tr>
                      <HeaderCell pin="select">
                        <Checkbox
                          checked={allOnPage}
                          indeterminate={someOnPage}
                          onChange={togglePage}
                          label="Select all projects on this page"
                          disabled={
                            scenario === "loading" ||
                            scenario === "error" ||
                            !pageRows.length
                          }
                        />
                      </HeaderCell>
                      <HeaderCell
                        pin="primary"
                        aria-sort={
                          sortKey === "name"
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortableHeader
                          active={sortKey === "name"}
                          direction={sortDirection}
                          onSort={() => changeSort("name")}
                        >
                          Project
                        </SortableHeader>
                      </HeaderCell>
                      {columns.organization ? (
                        <HeaderCell priority="tertiary">Organization</HeaderCell>
                      ) : null}
                      {columns.category ? (
                        <HeaderCell
                          priority="secondary"
                          aria-sort={
                            sortKey === "category"
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <SortableHeader
                            active={sortKey === "category"}
                            direction={sortDirection}
                            onSort={() => changeSort("category")}
                          >
                            Category
                          </SortableHeader>
                        </HeaderCell>
                      ) : null}
                      <HeaderCell
                        aria-sort={
                          sortKey === "status"
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <SortableHeader
                          active={sortKey === "status"}
                          direction={sortDirection}
                          onSort={() => changeSort("status")}
                        >
                          Status
                        </SortableHeader>
                      </HeaderCell>
                      {columns.progress ? (
                        <HeaderCell
                          priority="secondary"
                          aria-sort={
                            sortKey === "progress"
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <SortableHeader
                            active={sortKey === "progress"}
                            direction={sortDirection}
                            onSort={() => changeSort("progress")}
                          >
                            Progress
                          </SortableHeader>
                        </HeaderCell>
                      ) : null}
                      {columns.units ? (
                        <HeaderCell
                          priority="tertiary"
                          align="right"
                          aria-sort={
                            sortKey === "units"
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <SortableHeader
                            active={sortKey === "units"}
                            direction={sortDirection}
                            onSort={() => changeSort("units")}
                            align="right"
                          >
                            Units
                          </SortableHeader>
                        </HeaderCell>
                      ) : null}
                      {columns.updated ? (
                        <HeaderCell
                          priority="secondary"
                          aria-sort={
                            sortKey === "updated"
                              ? sortDirection === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <SortableHeader
                            active={sortKey === "updated"}
                            direction={sortDirection}
                            onSort={() => changeSort("updated")}
                          >
                            Updated
                          </SortableHeader>
                        </HeaderCell>
                      ) : null}
                      <HeaderCell pin="actions">
                        <span className={styles.visuallyHidden}>Actions</span>
                      </HeaderCell>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>{renderTableRows()}</DataTableBody>
                </DataTable>
              </DataTableScroll>
            </CollectionSurface>
          )}
        </div>
      </div>

      <div className={styles.reviewControls} data-open={reviewPanelOpen || undefined}>
        {reviewPanelOpen ? (
          <section className={styles.reviewPanel} aria-label="Prototype review controls">
            <header className={styles.reviewHeader}>
              <div>
                <span>Prototype controls</span>
                <small>Local scenarios only</small>
              </div>
              <IconButton
                icon={X}
                label="Close prototype controls"
                size="compact"
                onClick={() => setReviewPanelOpen(false)}
              />
            </header>
            <div className={styles.reviewFields}>
              <SelectField
                label="Collection state"
                value={scenario}
                options={scenarioOptions}
                onChange={setReviewScenario}
              />
              <SelectField
                label="Permission profile"
                value={permissionScenario}
                options={permissionOptions}
                onChange={(value) => {
                  setPermissionScenario(value as PermissionScenario);
                  setSelectedIds(new Set());
                }}
              />
            </div>
            <p>
              No API calls, mutations, analytics, uploads, or persistent storage are
              connected.
            </p>
          </section>
        ) : null}
        <Button
          variant="secondary"
          leadingIcon={FlaskConical}
          onClick={() => setReviewPanelOpen((current) => !current)}
          aria-expanded={reviewPanelOpen}
        >
          Review states
        </Button>
      </div>

      <Drawer
        open={filtersOpen}
        title="More filters"
        description="Narrow the project collection without changing saved data."
        onClose={() => setFiltersOpen(false)}
        footer={
          <>
            <Button
              variant="tertiary"
              onClick={() => setDraftAdvancedFilters(defaultAdvancedFilters)}
            >
              Reset
            </Button>
            <Button variant="primary" onClick={applyAdvancedFilters}>
              Apply filters
            </Button>
          </>
        }
      >
        <div className={styles.drawerFields}>
          <TextField
            label="Location contains"
            value={draftAdvancedFilters.location}
            onChange={(location) =>
              setDraftAdvancedFilters((current) => ({ ...current, location }))
            }
            placeholder="e.g. Ahmedabad"
            helpText="Matches city, locality, or region text."
          />
          <SelectField
            label="Project progress"
            value={draftAdvancedFilters.progress}
            options={progressOptions}
            onChange={(progress) =>
              setDraftAdvancedFilters((current) => ({
                ...current,
                progress: progress as ProgressFilter,
              }))
            }
            className={styles.drawerSelect}
          />
          <div className={styles.drawerRule} />
          <Checkbox
            checked={draftAdvancedFilters.hasUnits}
            onChange={(hasUnits) =>
              setDraftAdvancedFilters((current) => ({ ...current, hasUnits }))
            }
            label="Only projects with unit inventory"
            showLabel
          />
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive project?"
        description={
          archiveTarget
            ? `${archiveTarget.name} will leave the active project list. This prototype does not persist the action.`
            : ""
        }
        confirmLabel="Archive project"
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          setArchiveTarget(null);
          showToast("Archive simulated. No project data was changed.");
        }}
      />

      <Toast message={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
