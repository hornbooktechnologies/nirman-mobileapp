import type {
  PermissionKey,
  ProjectAccessScope,
  ProjectStatus,
  ProjectType,
} from '@nirman-app/shared';
import type { OrganizationEntity, OrganizationMemberEntity } from '../../organizations/types/organizations.types';

export interface ResolvedOrganizationAccess {
  organization: OrganizationEntity;
  membership: OrganizationMemberEntity;
  permissions: PermissionKey[];
  organizationWideProjectAccess: boolean;
}

export interface AccessibleProjectSummary {
  id: string;
  name: string;
  projectCode: string | null;
  status: ProjectStatus;
  roleLabel: string | null;
  permissionMode: 'ROLE_DEFAULT' | 'CUSTOM';
  permissions: PermissionKey[];
  isDefault: boolean;
}

export interface ProjectAccessSummary {
  organizationId: string;
  projectScope: ProjectAccessScope;
  activeProjectId: string | null;
  projects: AccessibleProjectSummary[];
}

export interface ResolvedProjectAccess extends ResolvedOrganizationAccess {
  project: {
    id: string;
    organizationId: string;
    name: string;
    projectCode: string | null;
    type: ProjectType;
    status: ProjectStatus;
  };
  projectAccessScope: ProjectAccessScope;
  projectMember: {
    id: string;
    roleLabel: string | null;
    permissionMode: 'ROLE_DEFAULT' | 'CUSTOM';
    grantedPermissions: PermissionKey[];
  } | null;
  rolePermissions: PermissionKey[];
}
