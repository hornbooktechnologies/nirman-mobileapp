/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type {
  WorkerDetail,
  WorkerProjectAssignmentSummary,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { WorkersRepository } from "./workers.repository";
import { WorkersService } from "./workers.service";

describe("WorkersService", () => {
  const workersRepo = {
    findAll: jest.fn(),
    findProjectRoster: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    duplicateCandidates: jest.fn(),
    isWorkerVisibleToMember: jest.fn(),
    hasActiveAssignment: jest.fn(),
    assignWorker: jest.fn(),
    findAssignment: jest.fn(),
    findActiveAssignment: jest.fn(),
    updateAssignment: jest.fn(),
    updateAssignmentRate: jest.fn(),
    endAssignment: jest.fn(),
  } as unknown as jest.Mocked<WorkersRepository>;
  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new WorkersService(workersRepo, projectAccess);

  const actor: AuthenticatedUser = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@example.test",
    name: "Organization Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "00000000-0000-4000-8000-000000000002",
    roleName: "Organization Owner",
    permissions: [],
  };
  const organizationId = "00000000-0000-4000-8000-000000000010";
  const projectId = "00000000-0000-4000-8000-000000000020";
  const workerId = "00000000-0000-4000-8000-000000000030";

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveOrganizationAccess.mockResolvedValue(
      organizationAccess(true),
    );
    projectAccess.resolveProjectAccess.mockResolvedValue(projectAccessResult());
    workersRepo.findById.mockResolvedValue(worker());
    workersRepo.findActiveAssignment.mockResolvedValue(assignment());
    workersRepo.duplicateCandidates.mockResolvedValue([]);
    workersRepo.hasActiveAssignment.mockResolvedValue(false);
  });

  it("denies a user without the required Workers permission", async () => {
    projectAccess.resolveOrganizationAccess.mockRejectedValueOnce(
      new ForbiddenException("permission denied"),
    );

    await expect(
      service.findAll(organizationId, {}, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(workersRepo.findAll).not.toHaveBeenCalled();
  });

  it("lists organization workers with resolved membership scope", async () => {
    workersRepo.findAll.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
    });

    await service.findAll(organizationId, {}, actor);

    expect(projectAccess.resolveOrganizationAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      "workers:read",
    );
    expect(workersRepo.findAll).toHaveBeenCalledWith(
      organizationId,
      {},
      "membership-id",
      true,
    );
  });

  it("uses project access for a project-filtered organization list", async () => {
    workersRepo.findAll.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
    });

    await service.findAll(organizationId, { projectId }, actor);

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "workers:read",
    );
  });

  it("denies a cross-scope worker id for an assigned-project member", async () => {
    projectAccess.resolveOrganizationAccess.mockResolvedValueOnce(
      organizationAccess(false),
    );
    workersRepo.isWorkerVisibleToMember.mockResolvedValueOnce(false);

    await expect(
      service.findById(organizationId, workerId, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(workersRepo.findById).not.toHaveBeenCalled();
  });

  it("allows an assigned-project member to read a visible worker", async () => {
    projectAccess.resolveOrganizationAccess.mockResolvedValueOnce(
      organizationAccess(false),
    );
    workersRepo.isWorkerVisibleToMember.mockResolvedValueOnce(true);

    await expect(
      service.findById(organizationId, workerId, actor),
    ).resolves.toEqual(worker());
  });

  it("denies unauthorized project roster access", async () => {
    projectAccess.resolveProjectAccess.mockRejectedValueOnce(
      new ForbiddenException("project denied"),
    );

    await expect(
      service.findProjectRoster(organizationId, projectId, {}, actor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(workersRepo.findProjectRoster).not.toHaveBeenCalled();
  });

  it("does not give a platform-only user customer Workers access", async () => {
    projectAccess.resolveOrganizationAccess.mockRejectedValueOnce(
      new ForbiddenException("membership required"),
    );

    await expect(
      service.findAll(
        organizationId,
        {},
        {
          ...actor,
          roleName: "Platform Super Admin",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("creates a worker and returns warning-only duplicate candidates", async () => {
    workersRepo.create.mockResolvedValue(worker());
    workersRepo.duplicateCandidates.mockResolvedValueOnce([
      {
        id: "candidate-id",
        workerCode: "WRK-00001",
        name: "Ravi Kumar",
        trade: "Mason",
        mobileNumber: "9999999999",
        status: "ACTIVE",
        reason: "MOBILE",
      },
    ]);

    const result = await service.create(
      organizationId,
      { name: "Ravi", trade: "Mason", mobileNumber: "99999 99999" },
      actor,
    );

    expect(result.workerCode).toBe("WRK-00002");
    expect(result.duplicateWarnings).toHaveLength(1);
  });

  it("rejects missing required worker text", async () => {
    await expect(
      service.create(organizationId, { name: " ", trade: "Mason" }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(workersRepo.create).not.toHaveBeenCalled();
  });

  it("updates and deactivates a worker without deleting history", async () => {
    workersRepo.update.mockResolvedValue(worker({ name: "Updated Worker" }));
    workersRepo.deactivate.mockResolvedValue(
      worker({ status: "INACTIVE", deactivatedAt: new Date().toISOString() }),
    );

    await expect(
      service.update(
        organizationId,
        workerId,
        { name: "Updated Worker" },
        actor,
      ),
    ).resolves.toEqual(expect.objectContaining({ name: "Updated Worker" }));
    await expect(
      service.deactivate(organizationId, workerId, {}, actor),
    ).resolves.toEqual(expect.objectContaining({ status: "INACTIVE" }));
  });

  it("blocks assigning an inactive worker", async () => {
    workersRepo.findById.mockResolvedValueOnce(worker({ status: "INACTIVE" }));

    await expect(
      service.assignWorker(organizationId, projectId, workerId, {}, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(workersRepo.assignWorker).not.toHaveBeenCalled();
  });

  it("prevents duplicate active assignments, including the transaction race result", async () => {
    workersRepo.hasActiveAssignment.mockResolvedValueOnce(true);
    await expect(
      service.assignWorker(organizationId, projectId, workerId, {}, actor),
    ).rejects.toBeInstanceOf(ConflictException);

    workersRepo.hasActiveAssignment.mockResolvedValueOnce(false);
    workersRepo.assignWorker.mockResolvedValueOnce(null);
    await expect(
      service.assignWorker(organizationId, projectId, workerId, {}, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("assigns an active worker when permission and project scope succeed", async () => {
    workersRepo.assignWorker.mockResolvedValueOnce(assignment());

    await expect(
      service.assignWorker(
        organizationId,
        projectId,
        workerId,
        { dailyRate: 750, startsOn: "2026-08-01" },
        actor,
      ),
    ).resolves.toEqual(assignment());
  });

  it("validates assignment updates against the existing date range", async () => {
    await expect(
      service.updateAssignment(
        organizationId,
        projectId,
        workerId,
        { endsOn: "2026-07-31" },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(workersRepo.updateAssignment).not.toHaveBeenCalled();
  });

  it("updates the current pre-Attendance rate with an effective date", async () => {
    workersRepo.updateAssignmentRate.mockResolvedValueOnce(
      assignment({ dailyRate: "825.00" }),
    );

    await expect(
      service.updateAssignmentRate(
        organizationId,
        projectId,
        workerId,
        { dailyRate: 825, effectiveDate: "2026-08-10" },
        actor,
      ),
    ).resolves.toEqual(expect.objectContaining({ dailyRate: "825.00" }));
  });

  it("rejects a rate effective date before assignment start", async () => {
    await expect(
      service.updateAssignmentRate(
        organizationId,
        projectId,
        workerId,
        { dailyRate: 825, effectiveDate: "2026-07-31" },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("ends only an active assignment and preserves the returned history row", async () => {
    workersRepo.endAssignment.mockResolvedValueOnce(
      assignment({ status: "ENDED", endsOn: "2026-08-11" }),
    );

    await expect(
      service.endAssignment(
        organizationId,
        projectId,
        workerId,
        { endsOn: "2026-08-11" },
        actor,
      ),
    ).resolves.toEqual(expect.objectContaining({ status: "ENDED" }));

    workersRepo.findActiveAssignment.mockResolvedValueOnce(null);
    await expect(
      service.endAssignment(
        organizationId,
        projectId,
        workerId,
        { endsOn: "2026-08-11" },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function organizationAccess(organizationWideProjectAccess: boolean) {
  return {
    organization: { id: "organization-id", status: "ACTIVE" },
    membership: { id: "membership-id" },
    permissions: [
      "workers:read",
      "workers:create",
      "workers:update",
      "workers:assign-project",
      "workers:deactivate",
    ],
    organizationWideProjectAccess,
  } as Awaited<ReturnType<ProjectAccessService["resolveOrganizationAccess"]>>;
}

function projectAccessResult() {
  return {
    ...organizationAccess(false),
    project: { id: "project-id", status: "ACTIVE" },
    projectAccessScope: "ASSIGNED",
    projectMember: { id: "project-member-id", roleLabel: "Supervisor" },
  } as Awaited<ReturnType<ProjectAccessService["resolveProjectAccess"]>>;
}

function worker(overrides: Partial<WorkerDetail> = {}): WorkerDetail {
  return {
    id: "00000000-0000-4000-8000-000000000030",
    organizationId: "00000000-0000-4000-8000-000000000010",
    workerCode: "WRK-00002",
    name: "Ravi Worker",
    trade: "Mason",
    mobileNumber: "9999999999",
    notes: null,
    status: "ACTIVE",
    activeAssignmentCount: 1,
    currentAssignment: assignment(),
    assignments: [assignment()],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    deactivatedAt: null,
    ...overrides,
  };
}

function assignment(
  overrides: Partial<WorkerProjectAssignmentSummary> = {},
): WorkerProjectAssignmentSummary {
  return {
    id: "00000000-0000-4000-8000-000000000040",
    organizationId: "00000000-0000-4000-8000-000000000010",
    projectId: "00000000-0000-4000-8000-000000000020",
    workerId: "00000000-0000-4000-8000-000000000030",
    projectName: "Project One",
    roleLabel: "Mason",
    dailyRate: "750.00",
    status: "ACTIVE",
    startsOn: "2026-08-01T00:00:00.000Z",
    endsOn: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    endedAt: null,
    ...overrides,
  };
}
