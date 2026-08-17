/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { OrganizationsRepository } from "../organizations/organizations.repository";
import { ProjectAccessService } from "../project-access/project-access.service";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

describe("ProjectsService organization member assignments", () => {
  const projectsRepo = {
    findAssignmentProjects: jest.fn(),
    findOrganizationProjectAssignments: jest.fn(),
    findProjectsByIds: jest.fn(),
    saveMemberProjectAssignments: jest.fn(),
  } as unknown as jest.Mocked<ProjectsRepository>;
  const organizationsRepo = {
    findMemberById: jest.fn(),
  } as unknown as jest.Mocked<OrganizationsRepository>;
  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
    getRolePermissionKeys: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const subscriptions = {
    withinProjectCapacity: jest.fn(),
  } as unknown as jest.Mocked<SubscriptionsService>;
  const service = new ProjectsService(
    projectsRepo,
    organizationsRepo,
    projectAccess,
    subscriptions,
  );
  const actor: AuthenticatedUser = {
    id: "actor-id",
    email: "owner@example.test",
    name: "Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "owner-role-id",
    roleName: "Organization Owner",
    permissions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveOrganizationAccess.mockResolvedValue({
      organizationWideProjectAccess: true,
      permissions: [
        "projects:read",
        "projects:assign",
        "project-members:read",
        "project-members:view-all",
        "project-members:assign",
        "project-members:update",
        "project-members:unassign",
      ],
    } as never);
    projectAccess.getRolePermissionKeys.mockResolvedValue([
      "projects:read",
      "projects:assign",
      "project-members:read",
      "project-members:assign",
      "project-members:update",
      "project-members:unassign",
    ]);
    organizationsRepo.findMemberById.mockResolvedValue({
      id: "member-id",
      userId: "member-user-id",
      status: "ACTIVE",
    } as never);
    projectsRepo.findProjectsByIds.mockResolvedValue([
      { id: "project-1", status: "ACTIVE" },
      { id: "project-2", status: "ACTIVE" },
    ] as never);
    projectsRepo.saveMemberProjectAssignments.mockResolvedValue([]);
  });

  it("returns organization projects and current assignments together", async () => {
    projectsRepo.findAssignmentProjects.mockResolvedValue([
      { id: "project-1", name: "Tower A", projectCode: "TA", status: "ACTIVE" },
    ]);
    projectsRepo.findOrganizationProjectAssignments.mockResolvedValue([]);

    const result = await service.findOrganizationProjectAssignments(
      "organization-id",
      actor,
    );

    expect(result.projects).toHaveLength(1);
    expect(result.assignments).toEqual([]);
    expect(projectAccess.resolveOrganizationAccess).toHaveBeenCalledWith(
      actor,
      "organization-id",
      "project-members:read",
    );
  });

  it("rejects organization-wide assignment reads without view-all scope", async () => {
    projectAccess.resolveOrganizationAccess.mockResolvedValue({
      organizationWideProjectAccess: false,
      permissions: ["project-members:read"],
    } as never);

    await expect(
      service.findOrganizationProjectAssignments("organization-id", actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("validates and delegates a multi-project save as one repository operation", async () => {
    const dto = {
      assignments: [
        {
          projectId: "project-1",
          roleLabel: "Site Supervisor",
          status: "ACTIVE" as const,
          startsOn: "2026-08-01",
          endsOn: "2026-10-31",
        },
      ],
      unassignProjectIds: ["project-2"],
    };

    await service.saveMemberProjectAssignments(
      "organization-id",
      "member-id",
      dto,
      actor,
    );

    expect(projectsRepo.findProjectsByIds).toHaveBeenCalledWith(
      "organization-id",
      ["project-1", "project-2"],
    );
    expect(projectsRepo.saveMemberProjectAssignments).toHaveBeenCalledWith(
      "organization-id",
      "member-id",
      dto.assignments,
      ["project-2"],
      actor.id,
    );
  });

  it("rejects a project that is selected and removed in the same save", async () => {
    await expect(
      service.saveMemberProjectAssignments(
        "organization-id",
        "member-id",
        {
          assignments: [{ projectId: "project-1" }],
          unassignProjectIds: ["project-1"],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projectsRepo.saveMemberProjectAssignments).not.toHaveBeenCalled();
  });

  it("rejects an invalid date range before writing assignments", async () => {
    await expect(
      service.saveMemberProjectAssignments(
        "organization-id",
        "member-id",
        {
          assignments: [
            {
              projectId: "project-1",
              startsOn: "2026-10-01",
              endsOn: "2026-09-01",
            },
          ],
          unassignProjectIds: [],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(projectsRepo.saveMemberProjectAssignments).not.toHaveBeenCalled();
  });

  it("allows an inactive custom assignment to be prepared without active permissions", async () => {
    projectsRepo.findProjectsByIds.mockResolvedValue([
      { id: "project-1", status: "ACTIVE" },
    ] as never);
    const dto = {
      assignments: [
        {
          projectId: "project-1",
          permissionMode: "CUSTOM" as const,
          permissions: [],
          status: "INACTIVE" as const,
        },
      ],
      unassignProjectIds: [],
    };

    await service.saveMemberProjectAssignments(
      "organization-id",
      "member-id",
      dto,
      actor,
    );

    expect(projectsRepo.saveMemberProjectAssignments).toHaveBeenCalledWith(
      "organization-id",
      "member-id",
      dto.assignments,
      [],
      actor.id,
    );
  });

  it("requires Project read before activating custom access", async () => {
    await expect(
      service.saveMemberProjectAssignments(
        "organization-id",
        "member-id",
        {
          assignments: [
            {
              projectId: "project-1",
              permissionMode: "CUSTOM",
              permissions: [],
              status: "ACTIVE",
            },
          ],
          unassignProjectIds: [],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
