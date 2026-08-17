import type {
  InvitationDeliveryStatus,
  OrganizationMemberStatus,
  PermissionKey,
  ProjectMemberStatus,
  ProjectPermissionMode,
  ProjectStatus,
  SubscriptionStatus,
} from '@nirman-app/shared';

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: OrganizationMemberStatus;
  designation: string | null;
  organizationWideProjectAccess: boolean;
  joinedAt: string | null;
  user?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  };
  role?: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  };
};

export type OrganizationMemberRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionKey[];
};

export type InviteOrganizationMemberInput = {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  designation?: string;
  organizationWideProjectAccess?: boolean;
};

export type OrganizationMemberInvitationResponse = {
  membership: OrganizationMember;
  invitation: {
    id: string;
    status: 'PENDING';
    expiresAt: string;
    activationUrl: string;
    mobileActivationUrl: string;
    deliveryStatus: InvitationDeliveryStatus;
  };
};

export type UpdateOrganizationMemberInput = {
  roleId?: string;
  status?: OrganizationMemberStatus;
  designation?: string | null;
  organizationWideProjectAccess?: boolean;
};

export type ProjectMember = {
  id: string;
  organizationId: string;
  projectId: string;
  memberId: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  role: {
    id: string;
    name: string;
  };
  roleLabel: string | null;
  permissionMode: ProjectPermissionMode;
  grantedPermissions: PermissionKey[];
  status: ProjectMemberStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMemberInput = {
  roleLabel?: string | null;
  permissionMode?: ProjectPermissionMode;
  permissions?: PermissionKey[];
  status?: ProjectMemberStatus;
  startsOn?: string | null;
  endsOn?: string | null;
};

export type OrganizationProjectAssignment = {
  id: string;
  organizationId: string;
  projectId: string;
  memberId: string;
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    status: ProjectStatus;
  };
  roleLabel: string | null;
  permissionMode: ProjectPermissionMode;
  grantedPermissions: PermissionKey[];
  status: ProjectMemberStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationProjectAssignmentsOverview = {
  projects: Array<{
    id: string;
    name: string;
    projectCode: string | null;
    status: ProjectStatus;
  }>;
  assignments: OrganizationProjectAssignment[];
};

export type SaveMemberProjectAssignmentsInput = {
  assignments: Array<{
    projectId: string;
    roleLabel?: string | null;
    permissionMode?: ProjectPermissionMode;
    permissions?: PermissionKey[];
    status?: ProjectMemberStatus;
    startsOn?: string | null;
    endsOn?: string | null;
  }>;
  unassignProjectIds: string[];
};

export type SubscriptionSummary = {
  subscription: null | {
    id: string;
    organizationId: string;
    planId: string;
    status: SubscriptionStatus;
    startsAt: string;
    endsAt: string | null;
    plan: {
      id: string;
      name: string;
      maxActiveProjects: number | null;
      maxActiveMembers: number | null;
    };
  };
  legacyCompatible: boolean;
  usage: {
    activeProjects: number;
    activeMembers: number;
    storageBytes: number | null;
  };
};
