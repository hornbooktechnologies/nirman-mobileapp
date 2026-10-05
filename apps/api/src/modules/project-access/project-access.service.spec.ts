/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { OrganizationsRepository } from "../organizations/organizations.repository";
import { ProjectAccessRepository } from "./project-access.repository";
import { ProjectAccessService } from "./project-access.service";

describe("ProjectAccessService project permission grants", () => {
  const organizationsRepo = {
    findById: jest.fn(),
    findActiveMemberForUser: jest.fn(),
  } as unknown as jest.Mocked<OrganizationsRepository>;
  const accessRepo = {
    findAccessibleProjects: jest.fn(),
    findPermissionGrantsForProjects: jest.fn().mockResolvedValue(new Map()),
    findMaterialApprovalProjects: jest.fn().mockResolvedValue(new Set()),
    canApproveMaterials: jest.fn().mockResolvedValue(false),
    findPermissionsForMemberRole: jest.fn(),
    findProjectById: jest.fn(),
    findActiveProjectMember: jest.fn(),
    findProjectMemberPermissionGrants: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessRepository>;
  const service = new ProjectAccessService(organizationsRepo, accessRepo);
  const actor = {
    id: "user-id",
    roleId: "global-role",
  } as AuthenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    accessRepo.canApproveMaterials.mockResolvedValue(false);
    organizationsRepo.findById.mockResolvedValue({
      id: "organization-id",
      status: "ACTIVE",
    } as never);
    organizationsRepo.findActiveMemberForUser.mockResolvedValue({
      id: "member-id",
      roleId: "role-id",
      organizationWideProjectAccess: false,
    } as never);
    accessRepo.findPermissionsForMemberRole.mockResolvedValue([
      "projects:read",
      "workers:read",
      "workers:create",
    ]);
    accessRepo.findProjectById.mockResolvedValue({
      id: "project-id",
      organization_id: "organization-id",
      name: "Tower A",
      project_code: "TA",
      type: "RESIDENTIAL",
      status: "ACTIVE",
    } as never);
    accessRepo.findActiveProjectMember.mockResolvedValue({
      id: "project-member-id",
      role_label: "Site operations",
      permission_mode: "CUSTOM",
    } as never);
  });

  it("intersects custom grants with the Organization Role ceiling", async () => {
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "projects:read",
      "workers:read",
    ]);

    const result = await service.resolveProjectAccess(
      actor,
      "organization-id",
      "project-id",
      "workers:read",
    );

    expect(result.permissions).toEqual(["projects:read", "workers:read"]);
    expect(result.rolePermissions).toContain("workers:create");
    expect(result.projectMember?.permissionMode).toBe("CUSTOM");
  });

  it("denies a role-allowed action missing from custom Project grants", async () => {
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "projects:read",
      "workers:read",
    ]);

    await expect(
      service.resolveProjectAccess(
        actor,
        "organization-id",
        "project-id",
        "workers:create",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("keeps ROLE_DEFAULT assignments backward compatible", async () => {
    accessRepo.findActiveProjectMember.mockResolvedValue({
      id: "project-member-id",
      role_label: null,
      permission_mode: "ROLE_DEFAULT",
    } as never);

    const result = await service.resolveProjectAccess(
      actor,
      "organization-id",
      "project-id",
      "workers:create",
    );

    expect(result.permissions).toContain("workers:create");
    expect(accessRepo.findProjectMemberPermissionGrants).not.toHaveBeenCalled();
  });
  it("permits explicit Materials delegation without broadening the role ceiling", async () => {
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "workers:read",
    ]);
    accessRepo.canApproveMaterials.mockResolvedValue(true);
    const access = await service.resolveProjectAccess(
      actor,
      "organization-id",
      "project-id",
      "materials:approve-final",
    );
    expect(access.permissions).toContain("materials:approve-final");
    expect(access.rolePermissions).not.toContain("materials:approve-final");
    await expect(
      service.resolveProjectAccess(
        actor,
        "organization-id",
        "project-id",
        "wages:approve",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("removes final decision actions when delegation is revoked", async () => {
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "workers:read",
    ]);
    accessRepo.canApproveMaterials.mockResolvedValue(false);
    await expect(
      service.resolveProjectAccess(
        actor,
        "organization-id",
        "project-id",
        "materials:approve-final",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("applies organization-wide CUSTOM restrictions to the session project summary too", async () => {
    organizationsRepo.findActiveMemberForUser.mockResolvedValue({
      id: "member-id",
      roleId: "role-id",
      organizationWideProjectAccess: true,
    } as never);
    accessRepo.findAccessibleProjects.mockResolvedValue([
      {
        id: "project-id",
        name: "Tower A",
        status: "ACTIVE",
        permission_mode: "CUSTOM",
      },
    ] as never);
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "workers:read",
    ]);
    accessRepo.findPermissionGrantsForProjects.mockResolvedValue(
      new Map([["project-id", ["workers:read"]]]),
    );
    const summary = await service.getProjectAccessSummary(
      actor,
      "organization-id",
    );
    expect(summary.projects[0].permissionMode).toBe("CUSTOM");
    expect(summary.projects[0].permissions).toEqual(["workers:read"]);
  });
  it("checks an additional source read permission using the same context", async () => {
    accessRepo.findProjectMemberPermissionGrants.mockResolvedValue([
      "workers:create",
    ]);
    await expect(
      service.resolveProjectAccess(
        actor,
        "organization-id",
        "project-id",
        "workers:create",
        ["workers:read"],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(accessRepo.findProjectById).toHaveBeenCalledTimes(1);
  });
  it("batches multiple project grants and approval decisions without per-project reads", async () => {
    accessRepo.findAccessibleProjects.mockResolvedValue([
      { id: "p1", name: "A", status: "ACTIVE", permission_mode: "CUSTOM" },
      {
        id: "p2",
        name: "B",
        status: "ACTIVE",
        permission_mode: "ROLE_DEFAULT",
      },
    ] as never);
    accessRepo.findPermissionGrantsForProjects.mockResolvedValue(
      new Map([["p1", ["workers:read", "wages:mark-paid"]]]),
    );
    accessRepo.findMaterialApprovalProjects.mockResolvedValue(new Set(["p2"]));
    const result = await service.getProjectAccessSummary(
      actor,
      "organization-id",
    );
    expect(result.projects[0].permissions).toEqual(["workers:read"]);
    expect(result.projects[1].permissions).toContain("materials:approve-final");
    expect(accessRepo.findActiveProjectMember).not.toHaveBeenCalled();
    expect(accessRepo.findProjectMemberPermissionGrants).not.toHaveBeenCalled();
    expect(accessRepo.findMaterialApprovalProjects).toHaveBeenCalledTimes(1);
  });
});
