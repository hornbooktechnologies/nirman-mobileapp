export const ROLE_DASHBOARD_PROFILES = [
  "OWNER",
  "CONTRACTOR",
  "SUPERVISOR",
  "SALES",
  "GENERAL",
] as const;

export type RoleDashboardProfile = (typeof ROLE_DASHBOARD_PROFILES)[number];

export const DASHBOARD_ACTION_KEYS = [
  "MARK_ATTENDANCE",
  "ADD_KHARCHI",
  "REQUEST_MATERIAL",
  "ADD_EXPENSE",
  "UPDATE_PROGRESS",
  "UPLOAD_PHOTO",
  "ADD_LEAD",
  "VIEW_FOLLOWUPS",
  "VIEW_PROJECT",
] as const;

export type DashboardActionKey = (typeof DASHBOARD_ACTION_KEYS)[number];

export interface RoleDashboardResponse {
  profile: RoleDashboardProfile;
  roleName: string;
  organizationId: string;
  project: { id: string; name: string; projectCode: string | null };
  projectAccessScope: "ALL" | "ASSIGNED" | "NONE";
  generatedAt: string;
  availableSections: Array<"SITE" | "FINANCE" | "WORKFLOW" | "PROGRESS" | "GALLERY" | "SALES">;
  quickActions: DashboardActionKey[];
  site: null | {
    assignedWorkers: number | null;
    presentToday: number | null;
    absentToday: number | null;
    todaySpend: string | null;
  };
  finance: null | {
    wageEstimate: string | null;
    kharchiPaidThisMonth: string | null;
    outstandingKharchi: string | null;
    recognizedExpensesThisMonth: string | null;
  };
  workflow: null | {
    pendingMaterialApprovals: number | null;
    overdueMaterialRequests: number | null;
    pendingExpenses: number | null;
    pendingExpenseAmount: string | null;
  };
  progress: null | {
    overallPercentage: number;
    updatedStages: number;
    latestUpdateAt: string | null;
  };
  gallery: null | {
    recentUpdates: number;
    latestCapturedAt: string | null;
  };
  sales: null | {
    newAssignedLeads: number | null;
    followUpsToday: number | null;
    overdueFollowUps: number | null;
    siteVisitsToday: number | null;
    activePipeline: number | null;
    blocksNearingExpiry: number | null;
    bookedUnits: number | null;
  };
}
