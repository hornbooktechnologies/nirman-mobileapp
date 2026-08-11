import type {
  DashboardApprovalItem,
  DashboardProject,
  DashboardProjectStatus,
} from "@/features/dashboard/types/dashboard.types";

export const dashboardProjects = [
  {
    id: "tower-a",
    name: "Tower A",
    description: "Project controls and site reports",
    status: "In Progress",
  },
  {
    id: "villa-row",
    name: "Villa Row",
    description: "Project controls and site reports",
    status: "Planning",
  },
  {
    id: "warehouse",
    name: "Warehouse",
    description: "Project controls and site reports",
    status: "On Hold",
  },
  {
    id: "staff-block",
    name: "Staff Block",
    description: "Project controls and site reports",
    status: "Not Started",
  },
] as const satisfies readonly DashboardProject[];

export const dashboardProjectStatuses = [
  "In Progress",
  "Planning",
  "On Hold",
  "Not Started",
] as const satisfies readonly DashboardProjectStatus[];

export const dashboardApprovalItems = [
  {
    id: "cement-request",
    title: "Cement request",
    description: "80 bags waiting for review",
    kind: "request",
  },
  {
    id: "shared-team",
    title: "Shared team",
    description: "2 of 5 sites active today",
    kind: "team",
  },
  {
    id: "material-gate",
    title: "Material gate",
    description: "2 deliveries expected",
    kind: "delivery",
  },
] as const satisfies readonly DashboardApprovalItem[];
