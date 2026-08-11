import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PROJECT_STATUS_TRANSITIONS,
  type PermissionKey,
  type ProjectStatus,
} from '@nirman-app/shared';
import type { AuthenticatedUser } from '../auth/types/auth.types';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ProjectAccessService } from '../project-access/project-access.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpsertProjectMemberDto } from './dto/upsert-project-member.dto';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly organizationsRepo: OrganizationsRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async findAll(
    organizationId: string,
    query: QueryProjectDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      'projects:read',
    );
    return this.projectsRepo.findAll(
      organizationId,
      query,
      access.membership.id,
      access.organizationWideProjectAccess ||
        access.permissions.includes('projects:view-all'),
    );
  }

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      'projects:create',
    );
    this.validateProjectDates(dto.startDate, dto.expectedCompletionDate);
    if (dto.status && !['DRAFT', 'ACTIVE'].includes(dto.status)) {
      throw new BadRequestException('Project create status must be DRAFT or ACTIVE');
    }
    await this.assertUniqueProjectCode(organizationId, dto.projectCode);
    return this.projectsRepo.create(organizationId, dto, actor.id);
  }

  async findById(organizationId: string, projectId: string, actor: AuthenticatedUser) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:read',
    );
    const project = await this.projectsRepo.findById(organizationId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    return {
      ...project,
      currentUserAccess: {
        scope: access.projectAccessScope,
        roleLabel: access.projectMember?.roleLabel ?? null,
        permissions: access.permissions,
      },
    };
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:update',
    );
    this.assertWritableStatus(access.project.status);
    this.validateProjectDates(dto.startDate, dto.expectedCompletionDate);
    if (dto.status) this.assertValidTransition(access.project.status, dto.status);
    await this.assertUniqueProjectCode(organizationId, dto.projectCode, projectId);
    return this.projectsRepo.update(organizationId, projectId, dto, actor.id);
  }

  async archive(organizationId: string, projectId: string, actor: AuthenticatedUser) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:archive',
    );
    this.assertValidTransition(access.project.status, 'ARCHIVED');
    return this.projectsRepo.archive(organizationId, projectId, actor.id);
  }

  async restore(organizationId: string, projectId: string, actor: AuthenticatedUser) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:restore',
    );
    if (!access.permissions.includes('projects:view-all')) {
      throw new ForbiddenException('Project restore requires view-all access');
    }
    this.assertValidTransition(access.project.status, 'ACTIVE');
    return this.projectsRepo.restore(organizationId, projectId, actor.id);
  }

  async getProjectAccess(organizationId: string, actor: AuthenticatedUser) {
    return this.projectAccess.getProjectAccessSummary(actor, organizationId);
  }

  async switchProject(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:switch',
    );
    if (access.project.status !== 'ACTIVE') {
      throw new ForbiddenException('Only active projects can be selected');
    }
    return {
      activeProjectId: access.project.id,
      project: {
        id: access.project.id,
        name: access.project.name,
        status: access.project.status,
      },
    };
  }

  async getProjectContext(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'projects:read',
    );
    return {
      organization: access.organization,
      membership: access.membership,
      project: access.project,
      projectAccessScope: access.projectAccessScope,
      permissions: access.permissions,
    };
  }

  async findProjectMembers(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      'project-members:read',
    );
    return this.projectsRepo.findProjectMembers(organizationId, projectId);
  }

  async assignProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpsertProjectMemberDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertCanMutateProjectMember(
      organizationId,
      projectId,
      memberId,
      actor,
      'project-members:assign',
    );
    this.validateAssignmentDates(dto.startsOn, dto.endsOn);
    return this.projectsRepo.upsertProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      actor.id,
    );
  }

  async updateProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpsertProjectMemberDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertCanMutateProjectMember(
      organizationId,
      projectId,
      memberId,
      actor,
      'project-members:update',
    );
    this.validateAssignmentDates(dto.startsOn, dto.endsOn);
    const member = await this.projectsRepo.updateProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      actor.id,
    );
    if (!member) throw new NotFoundException('Project member not found');
    return member;
  }

  async unassignProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    actor: AuthenticatedUser,
  ) {
    await this.assertCanMutateProjectMember(
      organizationId,
      projectId,
      memberId,
      actor,
      'project-members:unassign',
    );
    await this.projectsRepo.unassignProjectMember(
      organizationId,
      projectId,
      memberId,
      actor.id,
    );
  }

  private async assertCanMutateProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    actor: AuthenticatedUser,
    permission: PermissionKey,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      permission,
    );
    if (!access.permissions.includes('projects:assign')) {
      throw new ForbiddenException('Project assignment permission is required');
    }
    this.assertWritableStatus(access.project.status);
    const member = await this.organizationsRepo.findMemberById(organizationId, memberId);
    if (!member || member.status !== 'ACTIVE') {
      throw new BadRequestException('Project member must be an active organization member');
    }
    if (member.userId === actor.id && permission === 'project-members:unassign') {
      throw new ForbiddenException('You cannot remove your own project access');
    }
  }

  private async assertUniqueProjectCode(
    organizationId: string,
    projectCode?: string | null,
    excludedProjectId?: string,
  ) {
    if (!projectCode?.trim()) return;
    const existing = await this.projectsRepo.findByProjectCode(
      organizationId,
      projectCode,
      excludedProjectId,
    );
    if (existing) throw new ConflictException('Project code already exists');
  }

  private validateProjectDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException('Expected completion date cannot be before start date');
    }
  }

  private validateAssignmentDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException('Assignment end date cannot be before start date');
    }
  }

  private assertWritableStatus(status: ProjectStatus) {
    if (status === 'ARCHIVED') throw new ForbiddenException('Archived projects are read-only');
    if (status === 'COMPLETED') throw new ForbiddenException('Completed projects are read-only');
  }

  private assertValidTransition(from: ProjectStatus, to: ProjectStatus) {
    if (from === to) return;
    const allowed = PROJECT_STATUS_TRANSITIONS[from] as readonly ProjectStatus[];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Invalid project status transition from ${from} to ${to}`);
    }
  }
}
