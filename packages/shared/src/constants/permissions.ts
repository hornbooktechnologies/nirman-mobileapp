export const PERMISSION_RESOURCES = [
  "platform-organizations",
  "platform-subscriptions",
  "platform-users",
  "platform-roles",
  "platform-settings",
  "platform-support",
  "platform-feature-flags",
  "organizations",
  "members",
  "users",
  "roles",
  "projects",
  "dashboards",
  "project-members",
  "workers",
  "work-calendar",
  "attendance",
  "wages",
  "kharchi",
  "materials",
  "expenses",
  "progress",
  "gallery",
  "leads",
  "followups",
  "site-visits",
  "inventory",
  "sales-reports",
  "settings",
  "files",
  "audit-logs",
  "notifications",
  "reports",
] as const;

export const PERMISSION_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "manage",
  "invite",
  "activate",
  "deactivate",
  "suspend",
  "assign",
  "assign-project",
  "unassign",
  "generate",
  "mark",
  "mark-paid",
  "switch",
  "view-all",
  "view-own",
  "read-own",
  "read-team",
  "read-all",
  "reassign",
  "convert",
  "interest",
  "request-block",
  "block",
  "book",
  "archive",
  "restore",
  "export",
  "upload",
  "update-rate",
  "correct-locked",
  "adjust",
  "configure",
  "approve",
  "approve-level-1",
  "approve-final",
  "reject",
  "record-purchase",
  "record-delivery",
  "update-organization",
  "update-project",
  "access",
  "impersonate",
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionKey = `${PermissionResource}:${PermissionAction}`;

export const PERMISSION_LABELS: Record<PermissionResource, string> = {
  "platform-organizations": "Platform Organizations",
  "platform-subscriptions": "Platform Subscriptions",
  "platform-users": "Platform Users",
  "platform-roles": "Platform Roles",
  "platform-settings": "Platform Settings",
  "platform-support": "Platform Support",
  "platform-feature-flags": "Platform Feature Flags",
  organizations: "Organizations",
  members: "Members",
  users: "Users",
  roles: "Roles",
  projects: "Projects",
  dashboards: "Dashboards",
  "project-members": "Project Members",
  workers: "Workers",
  "work-calendar": "Work Calendar",
  attendance: "Attendance",
  wages: "Wages",
  kharchi: "Kharchi",
  materials: "Materials",
  expenses: "Site Expenses",
  progress: "Project Progress",
  gallery: "Site Gallery",
  leads: "Leads",
  followups: "Follow-ups",
  "site-visits": "Site Visits",
  inventory: "Unit Inventory",
  "sales-reports": "Sales Reports",
  settings: "Settings",
  files: "Files",
  "audit-logs": "Audit Logs",
  notifications: "Notifications",
  reports: "Reports",
};

/** NirmanSite platform-administration permissions. */
export const PLATFORM_ADMIN_PERMISSIONS = [
  "platform-organizations:read",
  "platform-organizations:create",
  "platform-organizations:update",
  "platform-organizations:activate",
  "platform-organizations:suspend",
  "platform-subscriptions:read",
  "platform-subscriptions:update",
  "platform-users:read",
  "platform-users:create",
  "platform-users:update",
  "platform-users:deactivate",
  "platform-roles:read",
  "platform-roles:create",
  "platform-roles:update",
  "platform-roles:delete",
  "platform-roles:manage",
  "platform-settings:read",
  "platform-settings:update",
  "platform-feature-flags:read",
  "platform-feature-flags:update",
] as const satisfies readonly PermissionKey[];

export type PlatformAdminPermissionKey =
  (typeof PLATFORM_ADMIN_PERMISSIONS)[number];

/** Defined for a future approved support policy; not a default platform-admin grant. */
export const PLATFORM_SUPPORT_PERMISSIONS = [
  "platform-support:access",
  "platform-support:impersonate",
] as const satisfies readonly PermissionKey[];

export type PlatformSupportPermissionKey =
  (typeof PLATFORM_SUPPORT_PERMISSIONS)[number];

/** All known platform keys. These do not imply customer-tenant access. */
export const PLATFORM_PERMISSIONS = [
  ...PLATFORM_ADMIN_PERMISSIONS,
  ...PLATFORM_SUPPORT_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSIONS)[number];

/** Customer-organization administration permissions. */
export const ORGANIZATION_PERMISSIONS = [
  "organizations:create",
  "organizations:read",
  "organizations:update",
  "organizations:activate",
  "organizations:deactivate",

  "members:read",
  "members:invite",
  "members:update",
  "members:deactivate",

  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",
  "roles:manage",

  "settings:read",
  "settings:update",
  "audit-logs:read",
  "notifications:read",
  "reports:read",
] as const satisfies readonly PermissionKey[];

export type OrganizationPermissionKey =
  (typeof ORGANIZATION_PERMISSIONS)[number];

/** Project setup, membership, and active-project context permissions. */
export const PROJECT_PERMISSIONS = [
  "projects:read",
  "projects:create",
  "projects:update",
  "projects:archive",
  "projects:restore",
  "projects:assign",
  "projects:view-all",
  "projects:switch",

  "project-members:read",
  "project-members:assign",
  "project-members:update",
  "project-members:unassign",
  "project-members:view-all",
] as const satisfies readonly PermissionKey[];

/** Role- and permission-aware customer dashboard access. */
export const DASHBOARD_PERMISSIONS = [
  "dashboards:read",
] as const satisfies readonly PermissionKey[];

export type DashboardPermissionKey = (typeof DASHBOARD_PERMISSIONS)[number];

export type ProjectPermissionKey = (typeof PROJECT_PERMISSIONS)[number];

/**
 * Foundation customer permissions retained as a compatibility export.
 * Business-module permissions such as workers:* are deliberately excluded.
 */
export const FOUNDATION_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...DASHBOARD_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

export type FoundationPermissionKey = (typeof FOUNDATION_PERMISSIONS)[number];

/** Inherited compatibility keys; global administration routes now require platform-* keys. */
export const LEGACY_USER_MANAGEMENT_PERMISSIONS = [
  "users:create",
  "users:read",
  "users:update",
  "users:delete",
] as const satisfies readonly PermissionKey[];

export type LegacyUserManagementPermissionKey =
  (typeof LEGACY_USER_MANAGEMENT_PERMISSIONS)[number];

/** Workers is a customer operational module, never a platform permission group. */
export const WORKER_PERMISSIONS = [
  "workers:read",
  "workers:create",
  "workers:update",
  "workers:assign-project",
  "workers:update-rate",
  "workers:deactivate",
  "workers:export",
] as const satisfies readonly PermissionKey[];

export type WorkerPermissionKey = (typeof WORKER_PERMISSIONS)[number];

/** Organization-wide destructive Workers administration; never Project-delegatable. */
export const WORKER_ORGANIZATION_PERMISSIONS = [
  "workers:delete",
] as const satisfies readonly PermissionKey[];

export type WorkerOrganizationPermissionKey =
  (typeof WORKER_ORGANIZATION_PERMISSIONS)[number];

export const WORK_CALENDAR_PERMISSIONS = [
  "work-calendar:read",
  "work-calendar:update-organization",
  "work-calendar:update-project",
] as const satisfies readonly PermissionKey[];

export type WorkCalendarPermissionKey =
  (typeof WORK_CALENDAR_PERMISSIONS)[number];

export const ATTENDANCE_PERMISSIONS = [
  "attendance:read",
  "attendance:mark",
  "attendance:update",
  "attendance:correct-locked",
  "attendance:export",
] as const satisfies readonly PermissionKey[];

export type AttendancePermissionKey = (typeof ATTENDANCE_PERMISSIONS)[number];

export const WAGE_PERMISSIONS = [
  "wages:read",
  "wages:generate",
  "wages:update",
  "wages:mark-paid",
  "wages:export",
] as const satisfies readonly PermissionKey[];

export type WagePermissionKey = (typeof WAGE_PERMISSIONS)[number];

export const KHARCHI_PERMISSIONS = [
  "kharchi:read",
  "kharchi:create",
  "kharchi:adjust",
  "kharchi:export",
] as const satisfies readonly PermissionKey[];

export type KharchiPermissionKey = (typeof KHARCHI_PERMISSIONS)[number];

export const MATERIAL_PERMISSIONS = [
  "materials:read",
  "materials:create",
  "materials:update",
  "materials:configure",
  "materials:approve-level-1",
  "materials:approve-final",
  "materials:reject",
  "materials:record-purchase",
  "materials:record-delivery",
  "materials:export",
] as const satisfies readonly PermissionKey[];

export type MaterialPermissionKey = (typeof MATERIAL_PERMISSIONS)[number];

export const EXPENSE_PERMISSIONS = [
  "expenses:read",
  "expenses:create",
  "expenses:update",
  "expenses:configure",
  "expenses:approve",
  "expenses:reject",
  "expenses:adjust",
  "expenses:export",
] as const satisfies readonly PermissionKey[];

export type ExpensePermissionKey = (typeof EXPENSE_PERMISSIONS)[number];

export const PROGRESS_PERMISSIONS = [
  "progress:read",
  "progress:update",
  "progress:export",
] as const satisfies readonly PermissionKey[];

export type ProgressPermissionKey = (typeof PROGRESS_PERMISSIONS)[number];

export const GALLERY_PERMISSIONS = [
  "gallery:read",
  "gallery:upload",
  "gallery:approve",
  "gallery:reject",
] as const satisfies readonly PermissionKey[];

export type GalleryPermissionKey = (typeof GALLERY_PERMISSIONS)[number];

/** Sales CRM is a customer operational module, never a platform permission group. */
export const SALES_PERMISSIONS = [
  "leads:read-own",
  "leads:read-team",
  "leads:read-all",
  "leads:create",
  "leads:assign",
  "leads:reassign",
  "leads:update",
  "leads:convert",
  "followups:manage",
  "site-visits:manage",
  "inventory:read",
  "inventory:manage",
  "inventory:interest",
  "inventory:request-block",
  "inventory:block",
  "inventory:book",
  "sales-reports:read",
] as const satisfies readonly PermissionKey[];

export type SalesPermissionKey = (typeof SALES_PERMISSIONS)[number];

/**
 * Permission keys an Organization Owner may narrow for one Project assignment.
 * The member's Organization Role remains the ceiling; storing a key here never
 * creates authority absent from that role.
 */
export const PROJECT_DELEGATABLE_PERMISSIONS = [
  "projects:read",
  "projects:update",
  "projects:assign",
  "projects:switch",
  "project-members:read",
  "project-members:assign",
  "project-members:update",
  "project-members:unassign",
  ...WORKER_PERMISSIONS,
  ...WORK_CALENDAR_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...WAGE_PERMISSIONS,
  ...KHARCHI_PERMISSIONS,
  ...MATERIAL_PERMISSIONS,
  ...EXPENSE_PERMISSIONS,
  ...PROGRESS_PERMISSIONS,
  ...GALLERY_PERMISSIONS,
  ...SALES_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

export type ProjectDelegatablePermissionKey =
  (typeof PROJECT_DELEGATABLE_PERMISSIONS)[number];

export const PROJECT_PERMISSION_GROUPS = [
  {
    key: "PROJECT",
    label: "Project",
    permissions: [
      "projects:read",
      "projects:update",
      "projects:assign",
      "projects:switch",
    ],
  },
  {
    key: "TEAM",
    label: "Team",
    permissions: [
      "project-members:read",
      "project-members:assign",
      "project-members:update",
      "project-members:unassign",
    ],
  },
  {
    key: "WORKERS",
    label: "Workers",
    permissions: WORKER_PERMISSIONS,
  },
  {
    key: "WORK_CALENDAR",
    label: "Work Calendar",
    permissions: WORK_CALENDAR_PERMISSIONS,
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    permissions: ATTENDANCE_PERMISSIONS,
  },
  {
    key: "WAGES",
    label: "Wages",
    permissions: WAGE_PERMISSIONS,
  },
  {
    key: "KHARCHI",
    label: "Kharchi",
    permissions: KHARCHI_PERMISSIONS,
  },
  {
    key: "MATERIALS",
    label: "Materials",
    permissions: MATERIAL_PERMISSIONS,
  },
  {
    key: "EXPENSES",
    label: "Site Expenses",
    permissions: EXPENSE_PERMISSIONS,
  },
  {
    key: "PROGRESS",
    label: "Project Progress",
    permissions: PROGRESS_PERMISSIONS,
  },
  {
    key: "GALLERY",
    label: "Site Gallery",
    permissions: GALLERY_PERMISSIONS,
  },
  {
    key: "SALES",
    label: "Sales",
    permissions: SALES_PERMISSIONS,
  },
] as const;

export function isProjectDelegatablePermission(
  permission: string,
): permission is ProjectDelegatablePermissionKey {
  return (PROJECT_DELEGATABLE_PERMISSIONS as readonly string[]).includes(
    permission,
  );
}

export const ALL_PERMISSIONS = [
  ...PLATFORM_PERMISSIONS,
  ...FOUNDATION_PERMISSIONS,
  ...LEGACY_USER_MANAGEMENT_PERMISSIONS,
  ...WORKER_PERMISSIONS,
  ...WORKER_ORGANIZATION_PERMISSIONS,
  ...WORK_CALENDAR_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...WAGE_PERMISSIONS,
  ...KHARCHI_PERMISSIONS,
  ...MATERIAL_PERMISSIONS,
  ...EXPENSE_PERMISSIONS,
  ...PROGRESS_PERMISSIONS,
  ...GALLERY_PERMISSIONS,
  ...SALES_PERMISSIONS,
  ...DASHBOARD_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

export type KnownPermissionKey = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_DESCRIPTIONS: Record<KnownPermissionKey, string> = {
  "platform-organizations:read": "Read organizations as a platform operator.",
  "platform-organizations:create":
    "Create customer organizations as a platform operator.",
  "platform-organizations:update":
    "Update customer organizations as a platform operator.",
  "platform-organizations:activate":
    "Activate customer organizations as a platform operator.",
  "platform-organizations:suspend":
    "Suspend customer organizations as a platform operator.",
  "platform-subscriptions:read":
    "Read platform subscription assignments and limits.",
  "platform-subscriptions:update":
    "Update platform subscription assignments and limits.",
  "platform-users:read": "Read platform users.",
  "platform-users:create": "Create platform users.",
  "platform-users:update": "Update platform users.",
  "platform-users:deactivate": "Deactivate platform users.",
  "platform-roles:read": "Read platform role templates.",
  "platform-roles:create": "Create platform role templates.",
  "platform-roles:update": "Update platform role templates.",
  "platform-roles:delete": "Delete platform role templates.",
  "platform-roles:manage": "Manage platform role permissions.",
  "platform-settings:read": "Read platform application settings.",
  "platform-settings:update": "Update platform application settings.",
  "platform-support:access":
    "Start an explicitly scoped platform support session.",
  "platform-support:impersonate":
    "Impersonate through an approved audited support flow.",
  "platform-feature-flags:read": "Read platform feature flags.",
  "platform-feature-flags:update": "Update platform feature flags.",

  "organizations:create": "Create organizations.",
  "organizations:read": "Read organization details.",
  "organizations:update": "Update organization details.",
  "organizations:activate": "Activate organizations.",
  "organizations:deactivate": "Deactivate organizations.",

  "members:read": "Read organization members.",
  "members:invite": "Invite organization members.",
  "members:update": "Update organization members.",
  "members:deactivate": "Deactivate organization members.",

  "users:create": "Create users through inherited user-management routes.",
  "users:read": "Read users through inherited user-management routes.",
  "users:update": "Update users through inherited user-management routes.",
  "users:delete": "Delete users through inherited user-management routes.",

  "roles:read": "Read roles.",
  "roles:create": "Create roles.",
  "roles:update": "Update roles.",
  "roles:delete": "Delete roles.",
  "roles:manage": "Manage role permissions.",

  "projects:read": "Read accessible projects.",
  "projects:create": "Create projects.",
  "projects:update": "Update project details.",
  "projects:archive": "Archive projects.",
  "projects:restore": "Restore archived projects.",
  "projects:assign": "Assign members to projects.",
  "projects:view-all": "View all organization projects.",
  "projects:switch": "Switch active project context.",

  "dashboards:read":
    "Read role- and permission-specific dashboards for accessible Projects.",

  "project-members:read": "Read project member assignments.",
  "project-members:assign": "Assign members to projects.",
  "project-members:update": "Update project member assignments.",
  "project-members:unassign": "End project member assignments.",
  "project-members:view-all": "View all project member assignments.",

  "workers:read": "View workers and project rosters.",
  "workers:create": "Create worker records.",
  "workers:update": "Update worker details.",
  "workers:assign-project":
    "Assign workers to projects and update assignments.",
  "workers:update-rate":
    "Change worker assignment rates after attendance exists.",
  "workers:deactivate": "Deactivate workers.",
  "workers:delete":
    "Permanently delete workers and every directly related operational record.",
  "workers:export": "Export worker lists.",

  "work-calendar:read": "Read Organization and effective Project calendars.",
  "work-calendar:update-organization":
    "Configure the Organization working week and Organization overrides.",
  "work-calendar:update-project": "Manage Project calendar overrides.",

  "attendance:read": "Read project attendance records.",
  "attendance:mark": "Mark attendance for assigned projects.",
  "attendance:update": "Update attendance records.",
  "attendance:correct-locked": "Correct locked or historical attendance.",
  "attendance:export": "Export attendance data.",

  "wages:read": "Read project wage batches and payment history.",
  "wages:generate": "Generate wage previews and batches.",
  "wages:update": "Update wage batches and wage item adjustments.",
  "wages:mark-paid": "Record wage payments.",
  "wages:export": "Export wage summaries and payment history.",

  "kharchi:read": "Read Project Worker advances and balances.",
  "kharchi:create": "Record a paid Worker advance.",
  "kharchi:adjust": "Record an immutable Worker-advance adjustment.",
  "kharchi:export": "Export Worker advances and balances.",

  "materials:read": "Read Project material requirements and history.",
  "materials:create": "Create Project material requirements.",
  "materials:update":
    "Edit, submit, return, or cancel material requests in allowed states.",
  "materials:configure": "Configure the Project Materials workflow.",
  "materials:approve-level-1": "Verify a material requirement on site.",
  "materials:approve-final":
    "Give final commercial approval to a material request.",
  "materials:reject": "Return or reject a material request.",
  "materials:record-purchase": "Record a material purchase or order.",
  "materials:record-delivery": "Record a partial or final material delivery.",
  "materials:export": "Export Project material request reports.",

  "expenses:read": "Read Project site expenses and recognized totals.",
  "expenses:create": "Record Project site expenses.",
  "expenses:update": "Edit, submit, or cancel eligible site expenses.",
  "expenses:configure": "Configure the Project Site Expenses workflow.",
  "expenses:approve": "Approve another Member's pending site expense.",
  "expenses:reject": "Reject another Member's pending site expense.",
  "expenses:adjust": "Record an immutable approved-expense adjustment.",
  "expenses:export": "Export Project site expense reports.",

  "progress:read": "Read Project progress summaries and immutable history.",
  "progress:update": "Record a new Project stage progress update.",
  "progress:export": "Export Project progress history.",

  "gallery:read": "Read accessible Project diary entries and media.",
  "gallery:upload": "Upload Project diary images.",
  "gallery:approve": "Approve another Member's pending Gallery entry.",
  "gallery:reject": "Reject another Member's pending Gallery entry.",

  "leads:read-own": "Read assigned and self-created leads.",
  "leads:read-team": "Read leads assigned to the actor's sales team.",
  "leads:read-all": "Read all leads in accessible Projects.",
  "leads:create": "Create leads in accessible Projects.",
  "leads:assign": "Assign an unassigned lead.",
  "leads:reassign": "Reassign a lead while preserving assignment history.",
  "leads:update": "Update accessible leads and their sales stage.",
  "leads:convert": "Confirm a booking and convert a lead.",
  "followups:manage": "Schedule and complete lead follow-ups.",
  "site-visits:manage": "Schedule and complete lead site visits.",
  "inventory:read": "Read Project unit inventory.",
  "inventory:manage": "Create and update Project unit inventory.",
  "inventory:interest": "Record and update customer interest in units.",
  "inventory:request-block":
    "Request an exclusive unit hold for an accessible lead.",
  "inventory:block":
    "Approve, block, reject, and release exclusive unit holds.",
  "inventory:book": "Confirm and cancel unit-linked bookings.",
  "sales-reports:read": "Read sales summaries and performance reports.",

  "settings:read": "Read settings.",
  "settings:update": "Update settings.",
  "audit-logs:read": "Read audit logs.",
  "notifications:read": "Read notifications.",
  "reports:read": "Read reports.",
};

export function toPermissionKey(
  resource: PermissionResource,
  action: PermissionAction,
): PermissionKey {
  return `${resource}:${action}`;
}
