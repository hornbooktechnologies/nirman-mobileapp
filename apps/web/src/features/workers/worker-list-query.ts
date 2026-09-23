export type AssignmentFilter =
  "all" | "working_here" | "assigned_here" | "not_on_project";
export const workerFilterDefaults = {
  status: "",
  trade: "",
  assignment: "all" as AssignmentFilter,
};
export function readWorkerListQuery(
  params: URLSearchParams,
  organizationId: string,
) {
  const scoped =
    !params.get("organizationId") ||
    params.get("organizationId") === organizationId;
  const p = scoped ? params : new URLSearchParams();
  const rawPage = Number(p.get("page"));
  return {
    search: p.get("search") ?? "",
    status:
      p.get("status") === "ACTIVE"
        ? ("ACTIVE" as const)
        : p.get("status") === "INACTIVE"
          ? ("INACTIVE" as const)
          : ("" as const),
    trade: p.get("trade") ?? "",
    assignment: (["working_here", "assigned_here", "not_on_project"].includes(
      p.get("assignment") ?? "",
    )
      ? p.get("assignment")
      : "all") as AssignmentFilter,
    projectId: p.get("projectId") ?? "",
    page:
      Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage < 1000000
        ? rawPage
        : 1,
  };
}
export function workerListHref(
  query: ReturnType<typeof readWorkerListQuery>,
  organizationId: string,
) {
  const p = new URLSearchParams({ organizationId });
  for (const [key, value] of Object.entries(query)) {
    if (
      value &&
      !(key === "page" && value === 1) &&
      !(key === "assignment" && value === "all")
    )
      p.set(key, String(value));
  }
  return `/workers?${p}`;
}
export function workerListReturnHref(
  value: string | null,
  organizationId: string,
) {
  if (!value?.startsWith("/workers?") || value.includes("#"))
    return workerListHref(
      readWorkerListQuery(new URLSearchParams(), organizationId),
      organizationId,
    );
  return workerListHref(
    readWorkerListQuery(
      new URLSearchParams(value.slice(value.indexOf("?") + 1)),
      organizationId,
    ),
    organizationId,
  );
}
export type WorkerContext =
  | "working_here"
  | "assigned_here"
  | "elsewhere"
  | "unassigned"
  | "inactive"
  | "loading"
  | "unknown";
export function workerContext(
  worker: { status: string; activeAssignmentCount: number },
  roster: { isPrimaryForDate: boolean } | undefined,
  readiness: "ready" | "loading" | "unknown",
): WorkerContext {
  if (worker.status === "INACTIVE") return "inactive";
  if (readiness !== "ready") return readiness;
  if (roster?.isPrimaryForDate) return "working_here";
  if (roster) return "assigned_here";
  return worker.activeAssignmentCount > 0 ? "elsewhere" : "unassigned";
}
export const workerContextPresentation = {
  working_here: {
    label: "Working here",
    tone: "success",
    className: "bg-success/5",
  },
  assigned_here: {
    label: "Assigned here",
    tone: "success",
    className: "bg-success/5",
  },
  elsewhere: {
    label: "Assigned elsewhere",
    tone: "info",
    className: "bg-info/5",
  },
  unassigned: {
    label: "Unassigned",
    tone: "warning",
    className: "bg-warning/5",
  },
  inactive: { label: "Inactive", tone: "inactive", className: "bg-sunken/40" },
  loading: { label: "Checking assignment", tone: "neutral", className: "" },
  unknown: { label: "Assignment unavailable", tone: "neutral", className: "" },
} as const;
export function matchesWorkerAssignment(
  context: WorkerContext,
  filter: AssignmentFilter,
) {
  if (filter === "all") return true;
  if (filter === "working_here") return context === "working_here";
  if (filter === "assigned_here")
    return context === "working_here" || context === "assigned_here";
  return context === "elsewhere" || context === "unassigned";
}

export function workerDetailReturnHref(
  value: string | null,
  organizationId: string,
) {
  if (!value?.startsWith("/attendance?") || value.includes("#"))
    return workerListReturnHref(value, organizationId);
  const input = new URLSearchParams(value.slice("/attendance?".length));
  if (
    input.get("organizationId") &&
    input.get("organizationId") !== organizationId
  )
    return workerListReturnHref(null, organizationId);
  const output = new URLSearchParams({ organizationId });
  for (const key of [
    "projectId",
    "startDate",
    "endDate",
    "search",
    "exceptionsOnly",
    "page",
  ]) {
    const item = input.get(key);
    if (item) output.set(key, item);
  }
  return `/attendance?${output}`;
}
