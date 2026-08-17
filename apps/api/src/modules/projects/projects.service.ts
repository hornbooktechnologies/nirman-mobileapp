import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PROJECT_STATUS_TRANSITIONS,
  isProjectDelegatablePermission,
  type PermissionKey,
  type ProjectStatus,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { OrganizationsRepository } from "../organizations/organizations.repository";
import { ProjectAccessService } from "../project-access/project-access.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { QueryProjectDto } from "./dto/query-project.dto";
import { SaveMemberProjectAssignmentsDto } from "./dto/save-member-project-assignments.dto";
import { SaveProjectMemberAssignmentsDto } from "./dto/save-project-member-assignments.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { UpsertProjectMemberDto } from "./dto/upsert-project-member.dto";
import { ProjectsRepository } from "./projects.repository";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepo: ProjectsRepository,
    private readonly organizationsRepo: OrganizationsRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async findAll(
    organizationId: string,
    query: QueryProjectDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "projects:read",
    );
    return this.projectsRepo.findAll(
      organizationId,
      query,
      access.membership.id,
      access.organizationWideProjectAccess ||
        access.permissions.includes("projects:view-all"),
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
      "projects:create",
    );
    this.validateProjectDates(dto.startDate, dto.expectedCompletionDate);
    if (dto.status && !["DRAFT", "ACTIVE"].includes(dto.status)) {
      throw new BadRequestException(
        "Project create status must be DRAFT or ACTIVE",
      );
    }
    await this.assertUniqueProjectCode(organizationId, dto.projectCode);
    if ((dto.status ?? "DRAFT") === "ACTIVE") {
      return this.subscriptions.withinProjectCapacity(
        organizationId,
        (connection) =>
          this.projectsRepo.create(organizationId, dto, actor.id, connection),
      );
    }
    return this.projectsRepo.create(organizationId, dto, actor.id);
  }

  async findById(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "projects:read",
    );
    const project = await this.projectsRepo.findById(organizationId, projectId);
    if (!project) throw new NotFoundException("Project not found");
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
      "projects:update",
    );
    this.assertWritableStatus(access.project.status);
    this.validateProjectDates(dto.startDate, dto.expectedCompletionDate);
    if (dto.status)
      this.assertValidTransition(access.project.status, dto.status);
    await this.assertUniqueProjectCode(
      organizationId,
      dto.projectCode,
      projectId,
    );
    if (dto.status === "ACTIVE" && access.project.status !== "ACTIVE") {
      return this.subscriptions.withinProjectCapacity(
        organizationId,
        (connection) =>
          this.projectsRepo.update(
            organizationId,
            projectId,
            dto,
            actor.id,
            connection,
          ),
      );
    }
    return this.projectsRepo.update(organizationId, projectId, dto, actor.id);
  }

  async archive(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "projects:archive",
    );
    this.assertValidTransition(access.project.status, "ARCHIVED");
    return this.projectsRepo.archive(organizationId, projectId, actor.id);
  }

  async restore(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "projects:restore",
    );
    if (!access.permissions.includes("projects:view-all")) {
      throw new ForbiddenException("Project restore requires view-all access");
    }
    this.assertValidTransition(access.project.status, "ACTIVE");
    return this.subscriptions.withinProjectCapacity(
      organizationId,
      (connection) =>
        this.projectsRepo.restore(
          organizationId,
          projectId,
          actor.id,
          connection,
        ),
    );
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
      "projects:switch",
    );
    if (access.project.status !== "ACTIVE") {
      throw new ForbiddenException("Only active projects can be selected");
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
      "projects:read",
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
      "project-members:read",
    );
    return this.projectsRepo.findProjectMembers(organizationId, projectId);
  }

  async findOrganizationProjectAssignments(
    organizationId: string,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "project-members:read",
    );
    if (
      !access.organizationWideProjectAccess &&
      !access.permissions.includes("project-members:view-all")
    ) {
      throw new ForbiddenException(
        "View-all project member permission is required",
      );
    }
    const [projects, assignments] = await Promise.all([
      this.projectsRepo.findAssignmentProjects(organizationId),
      this.projectsRepo.findOrganizationProjectAssignments(organizationId),
    ]);
    return { projects, assignments };
  }

  async saveMemberProjectAssignments(
    organizationId: string,
    memberId: string,
    dto: SaveMemberProjectAssignmentsDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "projects:assign",
    );
    if (
      !access.organizationWideProjectAccess &&
      !access.permissions.includes("project-members:view-all")
    ) {
      throw new ForbiddenException(
        "View-all project member permission is required",
      );
    }

    const assignmentProjectIds = dto.assignments.map(
      (assignment) => assignment.projectId,
    );
    if (new Set(assignmentProjectIds).size !== assignmentProjectIds.length) {
      throw new BadRequestException("Each project can only be selected once");
    }
    const unassignProjectIds = [...new Set(dto.unassignProjectIds)];
    const overlap = assignmentProjectIds.find((projectId) =>
      unassignProjectIds.includes(projectId),
    );
    if (overlap) {
      throw new BadRequestException(
        "A project cannot be assigned and unassigned in the same request",
      );
    }

    const endingAssignments = dto.assignments.filter(
      (assignment) => assignment.status === "ENDED",
    );
    const hasAssignmentWrites = dto.assignments.some(
      (assignment) => assignment.status !== "ENDED",
    );
    const hasUnassignmentWrites =
      unassignProjectIds.length > 0 || endingAssignments.length > 0;
    if (
      hasAssignmentWrites &&
      (!access.permissions.includes("project-members:assign") ||
        !access.permissions.includes("project-members:update"))
    ) {
      throw new ForbiddenException(
        "Project member assign and update permissions are required",
      );
    }
    if (
      hasUnassignmentWrites &&
      !access.permissions.includes("project-members:unassign")
    ) {
      throw new ForbiddenException(
        "Project member unassign permission is required",
      );
    }

    const member = await this.organizationsRepo.findMemberById(
      organizationId,
      memberId,
    );
    if (!member || member.status !== "ACTIVE") {
      throw new BadRequestException(
        "Project member must be an active organization member",
      );
    }
    if (member.userId === actor.id && hasUnassignmentWrites) {
      throw new ForbiddenException("You cannot remove your own project access");
    }

    dto.assignments.forEach((assignment) =>
      this.validateAssignmentDates(assignment.startsOn, assignment.endsOn),
    );
    const targetRolePermissions = await this.projectAccess.getRolePermissionKeys(
      member.roleId,
    );
    dto.assignments.forEach((assignment) =>
      this.validateProjectPermissions(
        assignment.permissionMode,
        assignment.permissions,
        assignment.status,
        targetRolePermissions,
        access.permissions,
      ),
    );
    const targetedProjectIds = [
      ...new Set([...assignmentProjectIds, ...unassignProjectIds]),
    ];
    const projects = await this.projectsRepo.findProjectsByIds(
      organizationId,
      targetedProjectIds,
    );
    if (projects.length !== targetedProjectIds.length) {
      throw new NotFoundException(
        "One or more selected projects were not found in this organization",
      );
    }
    projects.forEach((project) => this.assertWritableStatus(project.status));

    return this.projectsRepo.saveMemberProjectAssignments(
      organizationId,
      memberId,
      dto.assignments,
      unassignProjectIds,
      actor.id,
    );
  }

  async assignProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpsertProjectMemberDto,
    actor: AuthenticatedUser,
  ) {
    const { access, member } = await this.assertCanMutateProjectMember(
      organizationId,
      projectId,
      memberId,
      actor,
      "project-members:assign",
    );
    this.validateAssignmentDates(dto.startsOn, dto.endsOn);
    await this.validateProjectPermissionsForMember(
      member.roleId,
      dto,
      access.permissions,
    );
    return this.projectsRepo.upsertProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      actor.id,
    );
  }

  async saveProjectMemberAssignments(
    organizationId: string,
    projectId: string,
    dto: SaveProjectMemberAssignmentsDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "project-members:assign",
    );
    if (!access.permissions.includes("projects:assign")) {
      throw new ForbiddenException("Project assignment permission is required");
    }
    this.assertWritableStatus(access.project.status);
    const assignmentMemberIds = dto.assignments.map(
      (assignment) => assignment.memberId,
    );
    if (new Set(assignmentMemberIds).size !== assignmentMemberIds.length) {
      throw new BadRequestException("Each member can only be selected once");
    }
    const unassignMemberIds = [...new Set(dto.unassignMemberIds)];
    if (assignmentMemberIds.some((memberId) => unassignMemberIds.includes(memberId))) {
      throw new BadRequestException(
        "A member cannot be assigned and unassigned in the same request",
      );
    }
    if (
      unassignMemberIds.length > 0 &&
      !access.permissions.includes("project-members:unassign")
    ) {
      throw new ForbiddenException(
        "Project member unassign permission is required",
      );
    }

    for (const assignment of dto.assignments) {
      const member = await this.organizationsRepo.findMemberById(
        organizationId,
        assignment.memberId,
      );
      if (!member || member.status !== "ACTIVE") {
        throw new BadRequestException(
          "Every Project member must be an active Organization member",
        );
      }
      this.validateAssignmentDates(assignment.startsOn, assignment.endsOn);
      await this.validateProjectPermissionsForMember(
        member.roleId,
        assignment,
        access.permissions,
      );
    }
    for (const memberId of unassignMemberIds) {
      const member = await this.organizationsRepo.findMemberById(
        organizationId,
        memberId,
      );
      if (member?.userId === actor.id) {
        throw new ForbiddenException("You cannot remove your own Project access");
      }
    }

    return this.projectsRepo.saveProjectMemberAssignments(
      organizationId,
      projectId,
      dto.assignments,
      unassignMemberIds,
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
    const { access, member: organizationMember } =
      await this.assertCanMutateProjectMember(
      organizationId,
      projectId,
      memberId,
      actor,
      "project-members:update",
      );
    this.validateAssignmentDates(dto.startsOn, dto.endsOn);
    await this.validateProjectPermissionsForMember(
      organizationMember.roleId,
      dto,
      access.permissions,
    );
    const member = await this.projectsRepo.updateProjectMember(
      organizationId,
      projectId,
      memberId,
      dto,
      actor.id,
    );
    if (!member) throw new NotFoundException("Project member not found");
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
      "project-members:unassign",
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
    if (!access.permissions.includes("projects:assign")) {
      throw new ForbiddenException("Project assignment permission is required");
    }
    this.assertWritableStatus(access.project.status);
    const member = await this.organizationsRepo.findMemberById(
      organizationId,
      memberId,
    );
    if (!member || member.status !== "ACTIVE") {
      throw new BadRequestException(
        "Project member must be an active organization member",
      );
    }
    if (
      member.userId === actor.id &&
      permission === "project-members:unassign"
    ) {
      throw new ForbiddenException("You cannot remove your own project access");
    }
    return { access, member };
  }

  private async validateProjectPermissionsForMember(
    roleId: string,
    dto: UpsertProjectMemberDto,
    actorPermissions: PermissionKey[],
  ) {
    const targetRolePermissions = await this.projectAccess.getRolePermissionKeys(
      roleId,
    );
    this.validateProjectPermissions(
      dto.permissionMode,
      dto.permissions,
      dto.status,
      targetRolePermissions,
      actorPermissions,
    );
  }

  private validateProjectPermissions(
    permissionMode: "ROLE_DEFAULT" | "CUSTOM" | undefined,
    permissions: PermissionKey[] | undefined,
    status: "ACTIVE" | "INACTIVE" | "ENDED" | undefined,
    targetRolePermissions: PermissionKey[],
    actorPermissions: PermissionKey[],
  ) {
    if (permissionMode !== "CUSTOM") {
      if ((permissions?.length ?? 0) > 0) {
        throw new BadRequestException(
          "Explicit Project permissions require CUSTOM permission mode",
        );
      }
      const outsideActorAuthority = targetRolePermissions.find(
        (permission) =>
          isProjectDelegatablePermission(permission) &&
          !actorPermissions.includes(permission),
      );
      if (outsideActorAuthority) {
        throw new ForbiddenException(
          {
            code: "PROJECT_PERMISSION_CEILING_EXCEEDED",
            message: `Role-default access would delegate ${outsideActorAuthority}; use Custom Project permissions instead`,
          },
        );
      }
      return;
    }
    const requested = [...new Set(permissions ?? [])];
    if ((status ?? "ACTIVE") === "ACTIVE" && !requested.includes("projects:read")) {
      throw new BadRequestException(
        "Active custom Project access must include projects:read",
      );
    }
    const outsideRoleCeiling = requested.find(
      (permission) => !targetRolePermissions.includes(permission),
    );
    if (outsideRoleCeiling) {
      throw new ForbiddenException(
        {
          code: "PROJECT_PERMISSION_CEILING_EXCEEDED",
          message: `${outsideRoleCeiling} exceeds the member's Organization Role ceiling`,
        },
      );
    }
    const outsideActorAuthority = requested.find(
      (permission) => !actorPermissions.includes(permission),
    );
    if (outsideActorAuthority) {
      throw new ForbiddenException(
        {
          code: "PROJECT_PERMISSION_CEILING_EXCEEDED",
          message: `You cannot delegate ${outsideActorAuthority} on this Project`,
        },
      );
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
    if (existing) throw new ConflictException("Project code already exists");
  }

  private validateProjectDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException(
        "Expected completion date cannot be before start date",
      );
    }
  }

  private validateAssignmentDates(start?: string | null, end?: string | null) {
    if (start && end && new Date(end) < new Date(start)) {
      throw new BadRequestException(
        "Assignment end date cannot be before start date",
      );
    }
  }

  private assertWritableStatus(status: ProjectStatus) {
    if (status === "ARCHIVED")
      throw new ForbiddenException("Archived projects are read-only");
    if (status === "COMPLETED")
      throw new ForbiddenException("Completed projects are read-only");
  }

  private assertValidTransition(from: ProjectStatus, to: ProjectStatus) {
    if (from === to) return;
    const allowed = PROJECT_STATUS_TRANSITIONS[
      from
    ] as readonly ProjectStatus[];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Invalid project status transition from ${from} to ${to}`,
      );
    }
  }
}
