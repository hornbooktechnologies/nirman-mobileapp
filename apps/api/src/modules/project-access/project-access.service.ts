import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionKey, ProjectAccessScope } from '@nirman-app/shared';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { isPlatformUser } from '../auth/platform-access';
import { ProjectAccessRepository } from './project-access.repository';
import {
  ProjectAccessSummary,
  ResolvedOrganizationAccess,
  ResolvedProjectAccess,
} from './types/project-access.types';

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly organizationsRepo: OrganizationsRepository,
    private readonly accessRepo: ProjectAccessRepository,
  ) {}

  async resolveOrganizationAccess(
    user: AuthenticatedUser,
    organizationId: string,
    requiredPermission?: PermissionKey,
  ): Promise<ResolvedOrganizationAccess> {
    const organization = await this.organizationsRepo.findById(organizationId);
    if (!organization) throw new NotFoundException('Organization not found');
    if (organization.status !== 'ACTIVE') {
      throw new ForbiddenException('Organization is not active');
    }

    const membership = await this.organizationsRepo.findActiveMemberForUser(
      organizationId,
      user.id,
    );
    if (!membership) {
      throw new ForbiddenException(
        'Active organization membership is required',
      );
    }

    const permissions = await this.getPermissionKeys(membership.roleId);
    if (requiredPermission && !permissions.includes(requiredPermission)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return {
      organization,
      membership,
      permissions,
      organizationWideProjectAccess: membership.organizationWideProjectAccess,
    };
  }

  async getSessionForUser(
    user: AuthenticatedUser,
    preferredOrganizationId?: string,
  ) {
    if (isPlatformUser(user)) {
      return this.emptySession(user);
    }

    let memberships: Awaited<
      ReturnType<OrganizationsRepository['findMembershipsForUser']>
    >;
    try {
      memberships = await this.organizationsRepo.findMembershipsForUser(
        user.id,
      );
    } catch (error) {
      if (!this.isMissingFoundationTableError(error)) throw error;
      return this.emptySession(user);
    }
    const activeMemberships = memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organization.status === 'ACTIVE',
    );
    const activeMembership =
      activeMemberships.find(
        (membership) => membership.organizationId === preferredOrganizationId,
      ) ?? activeMemberships[0];

    const permissions = activeMembership
      ? await this.getPermissionKeys(activeMembership.roleId)
      : [];
    const projectAccess = activeMembership
      ? await this.getProjectAccessSummary(
          user,
          activeMembership.organizationId,
        )
      : {
          organizationId: null,
          projectScope: 'NONE' as ProjectAccessScope,
          activeProjectId: null,
          projects: [],
        };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.phone,
        avatarUrl: user.avatar,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      },
      activeOrganization: activeMembership
        ? {
            id: activeMembership.organization.id,
            name: activeMembership.organization.name,
            type: activeMembership.organization.type,
            status: activeMembership.organization.status,
            branding: {
              logoUrl: null,
              primaryColor: null,
            },
            operatingProfile: activeMembership.organization.operatingProfile,
          }
        : null,
      activeRole: activeMembership
        ? {
            id: activeMembership.roleId,
            key:
              activeMembership.role?.name?.toUpperCase().replace(/\s+/g, '_') ??
              activeMembership.roleId,
            name: activeMembership.role?.name ?? 'Role',
          }
        : null,
      memberships: memberships.map((membership) => ({
        organizationId: membership.organizationId,
        memberId: membership.id,
        organizationName: membership.organization.name,
        organizationType: membership.organization.type,
        memberStatus: membership.status,
        role: {
          id: membership.roleId,
          key:
            membership.role?.name?.toUpperCase().replace(/\s+/g, '_') ??
            membership.roleId,
          name: membership.role?.name ?? 'Role',
        },
        organizationWideProjectAccess: membership.organizationWideProjectAccess,
      })),
      permissions,
      projectAccess,
      featureFlags: {},
      serverTime: new Date().toISOString(),
    };
  }

  async getProjectAccessSummary(
    user: AuthenticatedUser,
    organizationId: string,
  ): Promise<ProjectAccessSummary> {
    const access = await this.resolveOrganizationAccess(user, organizationId);
    const projects = await this.accessRepo.findAccessibleProjects(
      organizationId,
      access.membership.id,
      access.organizationWideProjectAccess,
    );
    const activeProjects = projects.filter(
      (project) => project.status === 'ACTIVE',
    );
    const activeProjectId =
      activeProjects.length === 1 ? activeProjects[0].id : null;

    return {
      organizationId,
      projectScope: access.organizationWideProjectAccess
        ? 'ALL'
        : projects.length > 0
          ? 'ASSIGNED'
          : 'NONE',
      activeProjectId,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        projectCode: project.project_code,
        status: project.status,
        roleLabel: project.role_label,
        isDefault: project.id === activeProjectId,
      })),
    };
  }

  async resolveProjectAccess(
    user: AuthenticatedUser,
    organizationId: string,
    projectId: string,
    requiredPermission: PermissionKey,
  ): Promise<ResolvedProjectAccess> {
    const organizationAccess = await this.resolveOrganizationAccess(
      user,
      organizationId,
      requiredPermission,
    );
    const project = await this.accessRepo.findProjectById(
      organizationId,
      projectId,
    );
    if (!project) throw new NotFoundException('Project not found');

    const projectMember = await this.accessRepo.findActiveProjectMember(
      organizationId,
      projectId,
      organizationAccess.membership.id,
    );
    if (!organizationAccess.organizationWideProjectAccess && !projectMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return {
      ...organizationAccess,
      project: {
        id: project.id,
        organizationId: project.organization_id,
        name: project.name,
        projectCode: project.project_code,
        type: project.type,
        status: project.status,
      },
      projectAccessScope: organizationAccess.organizationWideProjectAccess
        ? 'ALL'
        : 'ASSIGNED',
      projectMember: projectMember
        ? { id: projectMember.id, roleLabel: projectMember.role_label }
        : null,
    };
  }

  private async getPermissionKeys(roleId: string): Promise<PermissionKey[]> {
    const permissions =
      await this.accessRepo.findPermissionsForMemberRole(roleId);
    return permissions as PermissionKey[];
  }

  private emptySession(user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.phone,
        avatarUrl: user.avatar,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      },
      activeOrganization: null,
      activeRole: {
        id: user.roleId,
        key: user.roleName.toUpperCase().replace(/\s+/g, '_'),
        name: user.roleName,
      },
      memberships: [],
      permissions: user.permissions.map(
        (permission) =>
          `${permission.resource}:${permission.action}` as PermissionKey,
      ),
      projectAccess: {
        organizationId: null,
        projectScope: 'NONE' as ProjectAccessScope,
        activeProjectId: null,
        projects: [],
      },
      featureFlags: {},
      serverTime: new Date().toISOString(),
    };
  }

  private isMissingFoundationTableError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ER_NO_SUCH_TABLE'
    );
  }

}
