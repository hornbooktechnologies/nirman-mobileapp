import type {
  ProjectMemberStatus,
  ProjectStatus,
  ProjectType,
} from '@nirman-app/shared';
import type { DbRow } from '../../../database/database.types';

export interface ProjectEntity {
  id: string;
  organizationId: string;
  name: string;
  projectCode: string | null;
  type: ProjectType;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
  };
  status: ProjectStatus;
  startDate: Date | null;
  expectedCompletionDate: Date | null;
  description: string | null;
  coverFileId: string | null;
  memberCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  archivedBy: string | null;
}

export interface ProjectRow extends DbRow {
  id: string;
  organization_id: string;
  name: string;
  project_code: string | null;
  type: ProjectType;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  status: ProjectStatus;
  start_date: Date | null;
  expected_completion_date: Date | null;
  description: string | null;
  cover_file_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
  archived_by: string | null;
  memberCount?: number;
  currentUserRoleLabel?: string | null;
}

export interface ProjectMemberEntity {
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
  status: ProjectMemberStatus;
  startsOn: Date | null;
  endsOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberRow extends DbRow {
  id: string;
  organization_id: string;
  project_id: string;
  member_id: string;
  role_label: string | null;
  status: ProjectMemberStatus;
  starts_on: Date | null;
  ends_on: Date | null;
  created_at: Date;
  updated_at: Date;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  role_id: string;
  role_name: string;
}
