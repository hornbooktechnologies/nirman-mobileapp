/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import { AttendanceService } from "./attendance.service";
import { AttendanceRepository } from "./attendance.repository";

describe("AttendanceService", () => {
  const attendanceRepo = {
    findByProjectDate: jest.fn(),
    findExportRowsByProjectDate: jest.fn(),
    upsertMany: jest.fn(),
    findAssignableAssignmentIds: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
  } as unknown as jest.Mocked<AttendanceRepository>;

  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;

  const service = new AttendanceService(attendanceRepo, projectAccess);

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
  const workerAssignmentId = "00000000-0000-4000-8000-000000000030";

  beforeEach(() => {
    jest.clearAllMocks();
    attendanceRepo.findAssignableAssignmentIds.mockResolvedValue([
      workerAssignmentId,
    ]);
    projectAccess.resolveProjectAccess.mockResolvedValue({
      permissions: ["attendance:mark"],
      project: {
        id: projectId,
        organizationId,
        name: "Project A",
        projectCode: "P-001",
        type: "RESIDENTIAL",
        status: "ACTIVE",
      },
      projectAccessScope: "ASSIGNED",
      rolePermissions: ["attendance:mark"],
      membership: { id: "membership-id" },
      organization: {
        id: organizationId,
        name: "Org",
        type: "BUILDER",
        status: "ACTIVE",
      },
      organizationWideProjectAccess: false,
    } as any);
  });

  it("denies access when the user lacks attendance:mark", async () => {
    projectAccess.resolveProjectAccess.mockRejectedValueOnce(
      new ForbiddenException("project denied"),
    );

    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [{ workerAssignmentId, status: "PRESENT" }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects attendance for an unassigned project", async () => {
    projectAccess.resolveProjectAccess.mockRejectedValueOnce(
      new ForbiddenException("You do not have access to this project"),
    );

    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [{ workerAssignmentId, status: "ABSENT" }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("prevents duplicate attendance by updating the same worker/date record", async () => {
    attendanceRepo.upsertMany.mockResolvedValue([
      { id: "attendance-id" } as any,
    ]);

    const result = await service.saveForDate(
      organizationId,
      projectId,
      {
        date: "2026-08-20",
        entries: [{ workerAssignmentId, status: "PRESENT" }],
      },
      actor,
    );

    expect(attendanceRepo.upsertMany).toHaveBeenCalled();
    expect(result.data[0]).toEqual(
      expect.objectContaining({ id: "attendance-id" }),
    );
  });

  it("rejects duplicate worker assignment entries in one save request", async () => {
    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [
            { workerAssignmentId, status: "PRESENT" },
            { workerAssignmentId, status: "ABSENT" },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(attendanceRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects attendance for workers not actively assigned to the project date", async () => {
    attendanceRepo.findAssignableAssignmentIds.mockResolvedValueOnce([]);

    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [{ workerAssignmentId, status: "PRESENT" }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(attendanceRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("updates a record with the actor and previous value preserved", async () => {
    attendanceRepo.findById.mockResolvedValue({
      id: "attendance-id",
      organizationId,
      projectId,
      workerAssignmentId,
      workDate: "2026-08-20",
      status: "PRESENT",
      markedBy: actor.id,
      lastEditedBy: actor.id,
      lastEditedAt: "2026-08-20T10:00:00.000Z",
    } as any);
    attendanceRepo.updateById.mockResolvedValue({
      id: "attendance-id",
      status: "HALF_DAY",
      previousStatus: "PRESENT",
      lastEditedBy: actor.id,
    } as any);

    await expect(
      service.updateAttendance(
        organizationId,
        projectId,
        "attendance-id",
        { status: "HALF_DAY", notes: "Adjust for half day" },
        actor,
      ),
    ).resolves.toEqual(expect.objectContaining({ status: "HALF_DAY" }));

    expect(attendanceRepo.updateById).toHaveBeenCalled();
  });

  it("rejects invalid attendance statuses", async () => {
    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [{ workerAssignmentId, status: "INVALID_STATUS" as any }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects check-out before check-in on bulk save", async () => {
    await expect(
      service.saveForDate(
        organizationId,
        projectId,
        {
          date: "2026-08-20",
          entries: [
            {
              workerAssignmentId,
              status: "PRESENT",
              checkIn: "18:00",
              checkOut: "09:00",
            },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(attendanceRepo.upsertMany).not.toHaveBeenCalled();
  });

  it("rejects check-out before existing check-in on update", async () => {
    attendanceRepo.findById.mockResolvedValue({
      id: "attendance-id",
      organizationId,
      projectId,
      workerAssignmentId,
      workDate: "2026-08-20",
      status: "PRESENT",
      checkIn: "10:00",
      checkOut: null,
    } as any);

    await expect(
      service.updateAttendance(
        organizationId,
        projectId,
        "attendance-id",
        { checkOut: "09:00" },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(attendanceRepo.updateById).not.toHaveBeenCalled();
  });

  it("exports attendance as csv rows", async () => {
    projectAccess.resolveProjectAccess.mockResolvedValueOnce({
      permissions: ["attendance:export"],
    } as any);
    attendanceRepo.findExportRowsByProjectDate.mockResolvedValueOnce([
      {
        workerCode: "WRK-001",
        workerName: "Rajesh Patel",
        trade: "Helper",
        workDate: "2026-08-20",
        status: "PRESENT",
        checkIn: "09:00",
        checkOut: "18:00",
        notes: 'Site "A"',
        markedAt: "2026-08-20T09:00:00.000Z",
        lastEditedAt: null,
      },
    ]);

    const result = await service.exportByDate(
      organizationId,
      projectId,
      "2026-08-20",
      actor,
    );

    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      organizationId,
      projectId,
      "attendance:export",
    );
    expect(result.filename).toBe(`attendance-${projectId}-2026-08-20.csv`);
    expect(result.csv).toContain('"Worker Code","Worker Name"');
    expect(result.csv).toContain('"WRK-001","Rajesh Patel"');
    expect(result.csv).toContain('"Site ""A"""');
  });

  it("returns not found for a missing attendance record", async () => {
    attendanceRepo.findById.mockResolvedValue(null);

    await expect(
      service.updateAttendance(
        organizationId,
        projectId,
        "missing-id",
        { status: "ABSENT" },
        actor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
