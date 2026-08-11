export type DashboardProjectStatus =
  | "In Progress"
  | "Planning"
  | "On Hold"
  | "Not Started";

export interface DashboardProject {
  id: string;
  name: string;
  description: string;
  status: DashboardProjectStatus;
}

export type DashboardApprovalKind = "request" | "team" | "delivery";

export interface DashboardApprovalItem {
  id: string;
  title: string;
  description: string;
  kind: DashboardApprovalKind;
}
