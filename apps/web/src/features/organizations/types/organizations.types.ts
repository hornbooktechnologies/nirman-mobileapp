import type {
  InvitationDeliveryStatus,
  OperatingProfile,
  PermissionKey,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
} from "@nirman-app/shared";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  operatingProfile: OperatingProfile;
  timezone: string;
  currency: string;
  logoFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
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
}

export interface OrganizationMemberRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionKey[];
}

export interface InviteOrganizationMemberInput {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  designation?: string;
  organizationWideProjectAccess?: boolean;
}

export interface OrganizationMemberInvitationResponse {
  membership: OrganizationMember;
  invitation: {
    id: string;
    status: "PENDING";
    expiresAt: string;
    activationUrl: string;
    mobileActivationUrl: string;
    deliveryStatus: InvitationDeliveryStatus;
  };
}

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  operatingProfile?: OperatingProfile;
  timezone?: string;
  currency?: string;
  owner: {
    name: string;
    email: string;
    mobile: string;
    designation?: string;
  };
}

export interface OrganizationOnboardingResponse {
  organization: Organization;
  ownerMembership: {
    id: string;
    userId: string;
    roleId: string;
    status: "INVITED";
  };
  invitation: {
    id: string;
    status: "PENDING";
    expiresAt: string;
    activationUrl: string;
    mobileActivationUrl: string;
    deliveryStatus: InvitationDeliveryStatus;
  };
}

export interface UpdateOrganizationInput {
  name?: string;
  status?: OrganizationStatus;
  operatingProfile?: OperatingProfile;
  timezone?: string;
  currency?: string;
}

export interface UpdateOrganizationMemberInput {
  roleId?: string;
  status?: OrganizationMemberStatus;
  designation?: string | null;
  organizationWideProjectAccess?: boolean;
}

export interface SwitchOrganizationResponse {
  activeOrganizationId: string;
  organization: Organization;
}
