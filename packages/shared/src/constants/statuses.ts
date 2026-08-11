export const USER_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'LOCKED',
  'PENDING_VERIFICATION',
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ORGANIZATION_TYPES = ['BUILDER', 'CONTRACTOR'] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED',
] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const OPERATING_PROFILES = [
  'INDEPENDENT_CONTRACTOR',
  'SELF_MANAGED_BUILDER',
  'BUILDER_CONTRACTOR',
  'BUILDER_CONTRACTOR_SUPERVISOR',
  'CUSTOM',
] as const;

export type OperatingProfile = (typeof OPERATING_PROFILES)[number];

export const OPERATING_PROFILES_BY_ORGANIZATION_TYPE = {
  BUILDER: [
    'SELF_MANAGED_BUILDER',
    'BUILDER_CONTRACTOR',
    'BUILDER_CONTRACTOR_SUPERVISOR',
    'CUSTOM',
  ],
  CONTRACTOR: ['INDEPENDENT_CONTRACTOR', 'CUSTOM'],
} as const satisfies Record<OrganizationType, readonly OperatingProfile[]>;

export function isOperatingProfileCompatible(
  organizationType: OrganizationType,
  operatingProfile: OperatingProfile,
): boolean {
  return (OPERATING_PROFILES_BY_ORGANIZATION_TYPE[organizationType] as readonly OperatingProfile[])
    .includes(operatingProfile);
}

export const ORGANIZATION_MEMBER_STATUSES = [
  'INVITED',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'LEFT',
] as const;

export type OrganizationMemberStatus =
  (typeof ORGANIZATION_MEMBER_STATUSES)[number];

export const PROJECT_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = [
  'RESIDENTIAL',
  'COMMERCIAL',
  'MIXED',
  'SHED',
  'OTHER',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_MEMBER_STATUSES = [
  'ACTIVE',
  'INACTIVE',
  'ENDED',
] as const;

export type ProjectMemberStatus = (typeof PROJECT_MEMBER_STATUSES)[number];

export const WORKER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const WORKER_ASSIGNMENT_STATUSES = ['ACTIVE', 'ENDED'] as const;

export type WorkerAssignmentStatus = (typeof WORKER_ASSIGNMENT_STATUSES)[number];

export const WORKER_SORT_KEYS = [
  'name',
  'worker_code',
  'trade',
  'status',
  'created_at',
  'updated_at',
] as const;

export type WorkerSortKey = (typeof WORKER_SORT_KEYS)[number];

export const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'REVOKED',
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const SESSION_STATUSES = [
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'ROTATED',
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PROJECT_ACCESS_SCOPES = ['ALL', 'ASSIGNED', 'NONE'] as const;

export type ProjectAccessScope = (typeof PROJECT_ACCESS_SCOPES)[number];

export const PROJECT_STATUS_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  ON_HOLD: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: ['ACTIVE'],
} as const satisfies Record<ProjectStatus, readonly ProjectStatus[]>;
