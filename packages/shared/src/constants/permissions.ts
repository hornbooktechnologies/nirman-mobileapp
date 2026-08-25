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
  "project-members",
  "workers",
  "work-calendar",
  "attendance",
  "wages",
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
  "archive",
  "restore",
  "export",
  "update-rate",
  "correct-locked",
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
  "project-members": "Project Members",
  workers: "Workers",
  "work-calendar": "Work Calendar",
  attendance: "Attendance",
  wages: "Wages",
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

export type ProjectPermissionKey = (typeof PROJECT_PERMISSIONS)[number];

/**
 * Foundation customer permissions retained as a compatibility export.
 * Business-module permissions such as workers:* are deliberately excluded.
 */
export const FOUNDATION_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
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
  ...WORK_CALENDAR_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...WAGE_PERMISSIONS,
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
