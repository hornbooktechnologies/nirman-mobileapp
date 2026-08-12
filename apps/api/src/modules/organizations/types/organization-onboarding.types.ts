import type {
  InvitationDeliveryStatus,
  InvitationStatus,
  OrganizationMemberStatus,
  OrganizationOwnerInvitationPreview,
  OrganizationType,
} from "@nirman-app/shared";
import type { DbRow } from "../../../database/database.types";
import type {
  OrganizationEntity,
  OrganizationMemberEntity,
} from "./organizations.types";

export interface OnboardingUserRow extends DbRow {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  isActive: number | boolean;
  roleId: string;
  role_name: string;
  role_is_system: number | boolean;
}

export interface OnboardingRoleRow extends DbRow {
  id: string;
  name: string;
}

export interface InvitationRow extends DbRow {
  id: string;
  organization_id: string;
  user_id: string;
  membership_id: string;
  invited_email: string;
  token_hash: string;
  status: InvitationStatus;
  requires_password_setup: number | boolean;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  organization_name: string;
  organization_type: OrganizationType;
  user_name: string;
  user_email: string;
  user_password: string;
  user_is_active: number | boolean;
  membership_status: OrganizationMemberStatus;
  role_name: string;
}

export type { OrganizationOwnerInvitationPreview };

export interface OrganizationOnboardingResult {
  organization: OrganizationEntity;
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

export interface OrganizationMemberInvitationResult {
  membership: OrganizationMemberEntity;
  invitation: {
    id: string;
    status: "PENDING";
    expiresAt: string;
    activationUrl: string;
    mobileActivationUrl: string;
    deliveryStatus: InvitationDeliveryStatus;
  };
}
