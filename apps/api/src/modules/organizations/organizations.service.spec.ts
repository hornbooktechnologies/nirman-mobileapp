/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { OrganizationOnboardingService } from "./organization-onboarding.service";
import { OrganizationsRepository } from "./organizations.repository";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsService member invitations", () => {
  const organizationsRepo = {
    findOrganizationRoleTemplates: jest.fn(),
    findRoleById: jest.fn(),
  } as unknown as jest.Mocked<OrganizationsRepository>;
  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const onboarding = {
    createOrganizationMemberInvitation: jest.fn(),
  } as unknown as jest.Mocked<OrganizationOnboardingService>;
  const service = new OrganizationsService(
    organizationsRepo,
    projectAccess,
    onboarding,
  );
  const actor: AuthenticatedUser = {
    id: "actor-id",
    email: "owner@example.test",
    name: "Organization Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "owner-role-id",
    roleName: "Organization Owner",
    permissions: [],
  };
  const organizationId = "organization-id";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveOrganizationAccess.mockResolvedValue(
      organizationAccess("Organization Owner") as never,
    );
  });

  it("requires members:invite and returns compatible customer roles", async () => {
    organizationsRepo.findOrganizationRoleTemplates.mockResolvedValue([
      role("Organization Owner"),
      role("Site Supervisor"),
    ]);

    const result = await service.findMemberRoles(organizationId, actor);

    expect(projectAccess.resolveOrganizationAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      "members:invite",
    );
    expect(result.map((item) => item.name)).toEqual([
      "Organization Owner",
      "Site Supervisor",
    ]);
  });

  it("prevents a non-owner administrator from inviting another Owner", async () => {
    projectAccess.resolveOrganizationAccess.mockResolvedValue(
      organizationAccess("Builder Admin") as never,
    );
    organizationsRepo.findRoleById.mockResolvedValue(
      role("Organization Owner"),
    );

    await expect(
      service.inviteMember(
        organizationId,
        {
          name: "Second Owner",
          email: "second.owner@example.test",
          roleId: "role-id",
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      onboarding.createOrganizationMemberInvitation,
    ).not.toHaveBeenCalled();
  });

  it("delegates a compatible member invitation after tenant authorization", async () => {
    organizationsRepo.findRoleById.mockResolvedValue(role("Site Supervisor"));
    onboarding.createOrganizationMemberInvitation.mockResolvedValue({
      membership: { id: "member-id" },
      invitation: { id: "invitation-id" },
    } as never);

    await service.inviteMember(
      organizationId,
      {
        name: "Site Supervisor",
        email: "supervisor@example.test",
        roleId: "role-id",
      },
      actor,
    );

    expect(onboarding.createOrganizationMemberInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ id: organizationId, type: "BUILDER" }),
      expect.objectContaining({ roleId: "role-id" }),
      actor,
      "Site Supervisor",
    );
  });
});

function role(name: string) {
  return {
    id: "role-id",
    name,
    description: null,
    isSystem: true,
  };
}

function organizationAccess(roleName: string) {
  return {
    organization: {
      id: "organization-id",
      name: "ABC Builders",
      type: "BUILDER",
      status: "ACTIVE",
      operatingProfile: "SELF_MANAGED_BUILDER",
      timezone: "Asia/Kolkata",
      currency: "INR",
      logoFileId: null,
      createdBy: "actor-id",
      updatedBy: "actor-id",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    membership: {
      id: "membership-id",
      organizationId: "organization-id",
      userId: "actor-id",
      roleId: "owner-role-id",
      status: "ACTIVE",
      designation: null,
      organizationWideProjectAccess: true,
      joinedAt: new Date(),
      invitedBy: null,
      createdBy: null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: role(roleName),
    },
    permissions: ["members:invite"],
    organizationWideProjectAccess: true,
  };
}
