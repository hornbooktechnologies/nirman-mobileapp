import type { PermissionKey } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import type { ProjectAccessService } from "../project-access/project-access.service";
import type { DashboardRepository } from "./dashboard.repository";
import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  const actor = { id: "user-1", roleName: "Sales User" } as AuthenticatedUser;
  const access = {
    resolveProjectContext: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const repository = {
    site: jest.fn(),
    finance: jest.fn(),
    workflow: jest.fn(),
    progress: jest.fn(),
    gallery: jest.fn(),
    sales: jest.fn(),
  } as unknown as jest.Mocked<DashboardRepository>;
  const service = new DashboardService(access, repository);

  beforeEach(() => jest.clearAllMocks());

  it("returns only permission-authorized sales data and actions", async () => {
    const permissions = [
      "dashboards:read",
      "projects:read",
      "leads:read-own",
      "leads:create",
      "followups:manage",
    ] as PermissionKey[];
    access.resolveProjectContext.mockResolvedValue({
      rolePermissions: permissions,
      permissions,
      projectAccessScope: "ASSIGNED",
      project: {
        id: "project-1",
        organizationId: "org-1",
        name: "North Site",
        projectCode: "NS",
        type: "RESIDENTIAL",
        status: "ACTIVE",
      },
      membership: { role: { name: "Sales User" } },
    } as unknown as Awaited<
      ReturnType<ProjectAccessService["resolveProjectContext"]>
    >);
    repository.sales.mockResolvedValue({
      newAssignedLeads: 2,
      followUpsToday: 1,
      overdueFollowUps: 0,
      siteVisitsToday: 0,
      activePipeline: 4,
      blocksNearingExpiry: 0,
      bookedUnits: 1,
    });

    const result = await service.get("org-1", "project-1", actor);

    expect(result.profile).toBe("SALES");
    expect(result.availableSections).toEqual(["SALES"]);
    expect(result.site).toBeNull();
    expect(result.quickActions).toEqual([
      "ADD_LEAD",
      "VIEW_FOLLOWUPS",
      "VIEW_PROJECT",
    ]);
    expect(repository.sales.mock.calls[0]).toEqual([
      "org-1",
      "project-1",
      "user-1",
      expect.any(String),
      expect.any(String),
      expect.any(String),
      false,
      {
        followups: true,
        inventory: false,
        leads: true,
        visits: false,
      },
    ]);
  });

  it("rejects roles without dashboard access", async () => {
    access.resolveProjectContext.mockResolvedValue({
      rolePermissions: [],
      permissions: [],
    } as unknown as Awaited<
      ReturnType<ProjectAccessService["resolveProjectContext"]>
    >);
    await expect(
      service.get("org-1", "project-1", actor),
    ).rejects.toMatchObject({ response: { code: "DASHBOARD_ACCESS_DENIED" } });
  });
});
