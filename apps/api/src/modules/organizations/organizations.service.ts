import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  isOrganizationRoleCompatible,
  isOperatingProfileCompatible,
  type PlatformAdminPermissionKey,
} from "@nirman-app/shared";
import {
  assertPlatformPermission,
  isPlatformUser,
} from "../auth/platform-access";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { InviteOrganizationMemberDto } from "./dto/invite-organization-member.dto";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationOnboardingService } from "./organization-onboarding.service";
import { OrganizationsRepository } from "./organizations.repository";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepo: OrganizationsRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly onboarding: OrganizationOnboardingService,
  ) {}

  findAll(user: AuthenticatedUser) {
    if (isPlatformUser(user)) {
      assertPlatformPermission(user, "platform-organizations:read");
      return this.organizationsRepo.findAll();
    }
    return this.organizationsRepo.findAllForUser(user.id);
  }

  async create(dto: CreateOrganizationDto, actor: AuthenticatedUser) {
    return this.onboarding.createOrganizationWithOwner(dto, actor);
  }

  async findById(organizationId: string, actor: AuthenticatedUser) {
    if (isPlatformUser(actor)) {
      assertPlatformPermission(actor, "platform-organizations:read");
      const organization =
        await this.organizationsRepo.findById(organizationId);
      if (!organization) throw new NotFoundException("Organization not found");
      return organization;
    }
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "organizations:read",
    );
    return access.organization;
  }

  async update(
    organizationId: string,
    dto: UpdateOrganizationDto,
    actor: AuthenticatedUser,
  ) {
    if (isPlatformUser(actor)) {
      const existing = await this.organizationsRepo.findById(organizationId);
      if (!existing) throw new NotFoundException("Organization not found");
      assertPlatformPermission(
        actor,
        this.platformPermissionForOrganizationUpdate(existing.status, dto),
      );
      this.assertCompatibleOperatingProfile(
        existing.type,
        dto.operatingProfile,
      );
      if (dto.status === "ACTIVE" && existing.status !== "ACTIVE") {
        const ownerCount =
          await this.organizationsRepo.countActiveOwners(organizationId);
        if (ownerCount === 0) {
          throw new ConflictException(
            "An organization cannot be activated before an Owner accepts the invitation",
          );
        }
      }
      const organization = await this.organizationsRepo.update(
        organizationId,
        dto,
        actor.id,
      );
      if (!organization) throw new NotFoundException("Organization not found");
      return organization;
    }
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "organizations:update",
    );
    this.assertCompatibleOperatingProfile(
      access.organization.type,
      dto.operatingProfile,
    );
    if (dto.status && dto.status !== access.organization.status) {
      const requiredPermission =
        dto.status === "ACTIVE"
          ? "organizations:activate"
          : "organizations:deactivate";
      if (!access.permissions.includes(requiredPermission)) {
        throw new ForbiddenException(
          "You do not have permission to change organization status",
        );
      }
    }
    const organization = await this.organizationsRepo.update(
      organizationId,
      dto,
      actor.id,
    );
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
  }

  async switchOrganization(organizationId: string, actor: AuthenticatedUser) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
    );
    return {
      activeOrganizationId: access.organization.id,
      organization: access.organization,
    };
  }

  async findMembers(organizationId: string, actor: AuthenticatedUser) {
    if (isPlatformUser(actor)) {
      assertPlatformPermission(actor, "platform-organizations:read");
      const organization =
        await this.organizationsRepo.findById(organizationId);
      if (!organization) throw new NotFoundException("Organization not found");
      return this.organizationsRepo.findMembers(organizationId);
    }
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "members:read",
    );
    return this.organizationsRepo.findMembers(organizationId);
  }

  async findMemberRoles(organizationId: string, actor: AuthenticatedUser) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "members:invite",
    );
    const roles = await this.organizationsRepo.findOrganizationRoleTemplates(
      access.organization.type,
    );
    if (this.isProtectedOwner(access.membership)) return roles;
    return roles.filter((role) => !this.isProtectedOwner({ role }));
  }

  async inviteMember(
    organizationId: string,
    dto: InviteOrganizationMemberDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "members:invite",
    );
    const role = await this.organizationsRepo.findRoleById(dto.roleId);
    if (!role) throw new NotFoundException("Organization role not found");
    if (
      !role.isSystem ||
      !isOrganizationRoleCompatible(access.organization.type, role.name)
    ) {
      throw new ForbiddenException(
        "This role cannot be assigned in the selected organization",
      );
    }
    if (
      this.isProtectedOwner({ role }) &&
      !this.isProtectedOwner(access.membership)
    ) {
      throw new ForbiddenException(
        "Only an organization Owner can invite another Owner",
      );
    }
    return this.onboarding.createOrganizationMemberInvitation(
      access.organization,
      dto,
      actor,
      role.name,
    );
  }

  async updateMember(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actor: AuthenticatedUser,
  ) {
    const access = await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "members:update",
    );
    const member = await this.organizationsRepo.findMemberById(
      organizationId,
      memberId,
    );
    if (!member) throw new NotFoundException("Organization member not found");

    if (
      member.userId === actor.id &&
      (dto.roleId || dto.status !== undefined)
    ) {
      throw new ForbiddenException(
        "You cannot change your own membership role or status",
      );
    }

    const targetRole = dto.roleId
      ? await this.organizationsRepo.findRoleById(dto.roleId)
      : null;
    if (dto.roleId && !targetRole) {
      throw new NotFoundException("Organization role not found");
    }
    if (
      targetRole &&
      ["Platform Super Admin", "Super Admin", "User Manager"].includes(
        targetRole.name,
      )
    ) {
      throw new ForbiddenException(
        "Platform roles cannot be assigned to organization members",
      );
    }
    if (targetRole && !targetRole.isSystem) {
      throw new ConflictException(
        "Organization-scoped custom roles are not available yet",
      );
    }
    if (
      targetRole &&
      !isOrganizationRoleCompatible(access.organization.type, targetRole.name)
    ) {
      throw new ForbiddenException(
        "This role cannot be assigned in the selected organization",
      );
    }
    if (
      targetRole &&
      this.isProtectedOwner({ role: targetRole }) &&
      !this.isProtectedOwner(access.membership)
    ) {
      throw new ForbiddenException(
        "Only an organization Owner can assign another Owner",
      );
    }

    const removesProtectedOwner =
      this.isProtectedOwner(member) &&
      ((dto.status !== undefined && dto.status !== "ACTIVE") ||
        (targetRole !== null && !this.isProtectedOwner({ role: targetRole })));
    if (removesProtectedOwner) {
      const ownerCount =
        await this.organizationsRepo.countActiveOwners(organizationId);
      if (ownerCount <= 1) {
        throw new ConflictException("At least one active owner must remain");
      }
    }

    return this.organizationsRepo.updateMember(
      organizationId,
      memberId,
      dto,
      actor.id,
    );
  }

  async deactivateMember(
    organizationId: string,
    memberId: string,
    actor: AuthenticatedUser,
  ) {
    return this.updateMember(
      organizationId,
      memberId,
      { status: "INACTIVE" },
      actor,
    );
  }

  private platformPermissionForOrganizationUpdate(
    currentStatus: string,
    dto: UpdateOrganizationDto,
  ): PlatformAdminPermissionKey {
    if (!dto.status || dto.status === currentStatus) {
      return "platform-organizations:update";
    }
    if (dto.status === "ACTIVE") return "platform-organizations:activate";
    if (dto.status === "SUSPENDED") return "platform-organizations:suspend";
    return "platform-organizations:update";
  }

  private assertCompatibleOperatingProfile(
    organizationType: "BUILDER" | "CONTRACTOR",
    operatingProfile: UpdateOrganizationDto["operatingProfile"],
  ) {
    if (
      operatingProfile &&
      !isOperatingProfileCompatible(organizationType, operatingProfile)
    ) {
      throw new BadRequestException(
        `${operatingProfile} is not valid for a ${organizationType} organization`,
      );
    }
  }

  private isProtectedOwner(member: {
    role?: { name: string; isSystem: boolean };
  }) {
    return (
      member.role?.name === "Organization Owner" ||
      member.role?.name === "Independent Contractor Owner" ||
      member.role?.name === "Owner" ||
      member.role?.name === "Admin"
    );
  }
}
