import type {
  OperatingProfile,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
} from '@nirman-app/shared';
import type { DbRow } from '../../../database/database.types';

export interface OrganizationEntity {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  operatingProfile: OperatingProfile;
  timezone: string;
  currency: string;
  logoFileId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationRow extends DbRow {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  operating_profile: OperatingProfile;
  timezone: string;
  currency: string;
  logo_file_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMemberEntity {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: OrganizationMemberStatus;
  designation: string | null;
  organizationWideProjectAccess: boolean;
  joinedAt: Date | null;
  invitedBy: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  organization?: OrganizationEntity;
}

export interface OrganizationMemberRow extends DbRow {
  id: string;
  organization_id: string;
  user_id: string;
  role_id: string;
  status: OrganizationMemberStatus;
  designation: string | null;
  organization_wide_project_access: number | boolean;
  joined_at: Date | null;
  invited_by: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  user_name?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  user_avatar?: string | null;
  role_name?: string | null;
  role_description?: string | null;
  role_isSystem?: number | boolean | null;
}
