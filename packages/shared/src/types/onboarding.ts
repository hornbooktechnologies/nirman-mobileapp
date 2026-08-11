import type { InvitationStatus, OrganizationType } from '../constants';

export type InvitationDeliveryStatus =
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'MANUAL';

export interface OrganizationOwnerInvitationPreview {
  organization: {
    id: string;
    name: string;
    type: OrganizationType;
  };
  owner: {
    name: string;
    email: string;
  };
  roleName: string;
  status: InvitationStatus;
  expiresAt: string;
  requiresPasswordSetup: boolean;
}

export interface OrganizationOwnerInvitationAcceptanceInput {
  password?: string;
}

export interface OrganizationOwnerInvitationAcceptance {
  organization: OrganizationOwnerInvitationPreview['organization'];
  owner: OrganizationOwnerInvitationPreview['owner'];
  roleName: string;
  membershipStatus: 'ACTIVE';
  organizationStatus: 'ACTIVE';
}
