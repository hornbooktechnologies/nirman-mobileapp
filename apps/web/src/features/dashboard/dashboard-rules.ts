import type { RoleDashboardResponse } from "@nirman-app/shared";
export function dashboardQueryKey(
  userId: string,
  organizationId: string,
  projectId: string,
  permissions: readonly string[],
) {
  return [
    "dashboard",
    userId,
    organizationId,
    projectId,
    [...permissions].sort().join("|"),
  ] as const;
}
export function assertDashboardScope(
  data: RoleDashboardResponse,
  organizationId: string,
  projectId: string,
) {
  if (
    !data ||
    data.organizationId !== organizationId ||
    data.project?.id !== projectId
  )
    throw new Error(
      "Dashboard context changed. Refresh access before continuing.",
    );
  return data;
}
export function dashboardCount(value: unknown): string {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    Number.isInteger(value)
    ? value.toLocaleString("en-IN")
    : "Unavailable";
}
export function dashboardMetrics(
  data: RoleDashboardResponse,
  permissions: readonly string[],
) {
  const can = (permission: string) => permissions.includes(permission);
  const result: {
    label: string;
    value: string;
    detail: string;
    tone: "warning" | "accent";
  }[] = [];
  if (can("materials:read")) {
    result.push({
      label: "Materials awaiting approval",
      value: dashboardCount(data.workflow?.pendingMaterialApprovals),
      detail: "This project · verification and final approval queues",
      tone: "warning",
    });
    result.push({
      label: "Overdue material requests",
      value: dashboardCount(data.workflow?.overdueMaterialRequests),
      detail:
        "Required before today · excludes delivered, rejected and cancelled",
      tone: "warning",
    });
  }
  if (can("expenses:read"))
    result.push({
      label: "Expenses awaiting approval",
      value: dashboardCount(data.workflow?.pendingExpenses),
      detail: "This project · pending approval records",
      tone: "warning",
    });
  if (can("progress:read")) {
    const progress = data.progress;
    const valid =
      progress &&
      Number.isFinite(progress.overallPercentage) &&
      progress.overallPercentage >= 0 &&
      progress.overallPercentage <= 100 &&
      Number.isInteger(progress.updatedStages) &&
      progress.updatedStages > 0;
    result.push({
      label: "Average of reported stages",
      value: valid
        ? `${progress.overallPercentage}%`
        : progress?.updatedStages === 0
          ? "No updates"
          : "Unavailable",
      detail:
        "Latest update per reported stage · not overall project completion",
      tone: "accent",
    });
  }
  if (can("gallery:read"))
    result.push({
      label: "Recent approved gallery entries",
      value: dashboardCount(data.gallery?.recentUpdates),
      detail: "This project · since midnight seven days ago",
      tone: "accent",
    });
  return result;
}
export function dashboardActions(
  data: RoleDashboardResponse,
  permissions: readonly string[],
  archived: boolean,
) {
  const base = `/projects/${encodeURIComponent(data.project.id)}`;
  const definitions: Record<
    string,
    { label: string; href: string; grants: string[]; readOnly?: boolean }
  > = {
    MARK_ATTENDANCE: {
      label: "Record absences",
      href: `/attendance/mark?projectId=${encodeURIComponent(data.project.id)}`,
      grants: ["attendance:read", "attendance:mark"],
    },
    ADD_KHARCHI: {
      label: "Open Kharchi",
      href: `${base}/kharchi`,
      grants: ["kharchi:read", "kharchi:create"],
    },
    REQUEST_MATERIAL: {
      label: "Open material requests",
      href: `${base}/materials`,
      grants: ["materials:read", "materials:create"],
    },
    ADD_EXPENSE: {
      label: "Open site expenses",
      href: `${base}/expenses`,
      grants: ["expenses:read", "expenses:create"],
    },
    UPDATE_PROGRESS: {
      label: "Open progress updates",
      href: `${base}/progress`,
      grants: ["progress:read", "progress:update"],
    },
    UPLOAD_PHOTO: {
      label: "Open gallery",
      href: `${base}/gallery`,
      grants: ["gallery:read", "gallery:upload"],
    },
    ADD_LEAD: {
      label: "Open sales leads",
      href: `${base}/sales/leads`,
      grants: ["leads:create"],
    },
    VIEW_FOLLOWUPS: {
      label: "Open follow-ups",
      href: `${base}/sales/follow-ups`,
      grants: ["followups:manage"],
      readOnly: true,
    },
    VIEW_PROJECT: {
      label: "Project overview",
      href: base,
      grants: ["projects:read"],
      readOnly: true,
    },
  };
  return [...new Set(data.quickActions ?? [])].flatMap((key) => {
    const action = definitions[key];
    if (
      !action ||
      (archived && !action.readOnly) ||
      !action.grants.every((grant) => permissions.includes(grant))
    )
      return [];
    if (
      (key === "ADD_LEAD" || key === "VIEW_FOLLOWUPS") &&
      !["leads:read-own", "leads:read-team", "leads:read-all"].some((grant) =>
        permissions.includes(grant),
      )
    )
      return [];
    return [{ label: action.label, href: action.href }];
  });
}

export function assertPendingScope(
  items: readonly {
    organizationId: string;
    projectId: string;
    status: string;
  }[],
  organizationId: string,
  projectId: string,
  status: string,
) {
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        item.organizationId !== organizationId ||
        item.projectId !== projectId ||
        item.status !== status,
    )
  )
    throw new Error("Pending records do not match this project context.");
  return items;
}
