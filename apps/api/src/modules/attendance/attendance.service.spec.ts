/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import type {
  AttendanceException,
  EffectiveWorkCalendarDay,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CalendarService } from "../calendar/calendar.service";
import { ProjectAccessService } from "../project-access/project-access.service";
import {
  AttendanceService,
  deriveAttendanceSummary,
} from "./attendance.service";
import {
  AttendanceRepository,
  type AttendanceRosterPeriodRow,
} from "./attendance.repository";

describe("Attendance exception derivation", () => {
  const roster: AttendanceRosterPeriodRow[] = [
    {
      workerId: "worker-id",
      workerCode: "WRK-001",
      workerName: "Ravi Worker",
      trade: "Mason",
      workerStatus: "ACTIVE",
      deactivatedAt: null,
      workerAssignmentId: "assignment-id",
      dailyRate: "800.00",
      assignmentStartsOn: "2026-08-01",
      assignmentEndsOn: null,
      primaryStartsOn: "2026-08-10",
      primaryEndsOn: null,
    },
  ];
  const days: EffectiveWorkCalendarDay[] = [
    day("2026-08-09", true),
    day("2026-08-10", true),
    day("2026-08-11", false),
    day("2026-08-12", true),
    day("2026-08-13", true),
  ];

  it("derives Present without an explicit record and respects historical primary dates", () => {
    const result = deriveAttendanceSummary(
      "org",
      "project",
      "2026-08-09",
      "2026-08-13",
      roster,
      days,
      [],
      { selectedDate: "2026-08-10" },
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        expectedWorkingDays: 3,
        presentDays: 3,
        absentDays: 0,
        selectedDate: expect.objectContaining({ state: "PRESENT" }),
      }),
    );

    const beforePrimary = deriveAttendanceSummary(
      "org",
      "project",
      "2026-08-09",
      "2026-08-13",
      roster,
      days,
      [],
      { selectedDate: "2026-08-09" },
    );
    expect(beforePrimary.rows).toHaveLength(0);
  });

  it("derives Full Day, Half Day, and non-working dates correctly", () => {
    const exceptions = [
      exception("full", "2026-08-12", "FULL_DAY"),
      exception("half", "2026-08-13", "HALF_DAY"),
    ];
    const result = deriveAttendanceSummary(
      "org",
      "project",
      "2026-08-10",
      "2026-08-13",
      roster,
      days.slice(1),
      exceptions,
    );
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        expectedWorkingDays: 3,
        presentDays: 1.5,
        absentDays: 1.5,
      }),
    );
    expect(result.totals).toEqual(
      expect.objectContaining({
        expectedWorkingDays: 3,
        presentDays: 1.5,
        absentDays: 1.5,
      }),
    );
    expect(result.rows[0].presentDays + result.rows[0].absentDays).toBe(
      result.rows[0].expectedWorkingDays,
    );
  });
});

describe("AttendanceService", () => {
  const attendanceRepo = {
    findPrimaryRosterPeriods: jest.fn(),
    findExceptions: jest.fn(),
    findExceptionById: jest.fn(),
    findExceptionByAssignmentDate: jest.fn(),
    findPrimaryAssignmentForDate: jest.fn(),
    createException: jest.fn(),
    updateException: jest.fn(),
    removeException: jest.fn(),
    removeExceptionByAssignmentDate: jest.fn(),
  } as unknown as jest.Mocked<AttendanceRepository>;
  const projectAccess = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const calendarService = {
    resolveDaysForAttendance: jest.fn(),
  } as unknown as jest.Mocked<CalendarService>;
  const service = new AttendanceService(
    attendanceRepo,
    projectAccess,
    calendarService,
  );
  const actor = { id: "actor-id" } as AuthenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({} as any);
    attendanceRepo.findPrimaryAssignmentForDate.mockResolvedValue({
      id: "assignment-id",
      worker_status: "ACTIVE",
      deactivated_at: null,
    });
    calendarService.resolveDaysForAttendance.mockResolvedValue([
      day("2026-08-12", true),
    ]);
  });

  it("removes an exception and restores derived Present", async () => {
    attendanceRepo.removeException.mockResolvedValue(true);
    await expect(
      service.removeException("org", "project", "exception", actor),
    ).resolves.toEqual({
      id: "exception",
      removed: true,
      restoredState: "PRESENT",
    });
  });

  it("enforces tenant/Project/permission access before reads", async () => {
    projectAccess.resolveProjectAccess.mockRejectedValueOnce(
      new ForbiddenException("denied"),
    );
    await expect(
      service.summary(
        "other-org",
        "other-project",
        { startDate: "2026-08-01", endDate: "2026-08-31" },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(attendanceRepo.findPrimaryRosterPeriods).not.toHaveBeenCalled();
  });

  it("rejects exceptions on non-working dates", async () => {
    calendarService.resolveDaysForAttendance.mockResolvedValueOnce([
      day("2026-08-12", false),
    ]);
    await expect(
      service.createException(
        "org",
        "project",
        {
          workerAssignmentId: "assignment-id",
          workDate: "2026-08-12",
          exceptionType: "ABSENCE",
          duration: "FULL_DAY",
        },
        actor,
      ),
    ).rejects.toMatchObject({ response: { code: "ATTENDANCE_NON_WORKING_DATE" } });
  });

  it("returns one worker's totals and dated absence exceptions", async () => {
    attendanceRepo.findPrimaryRosterPeriods.mockResolvedValue([
      {
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        workerStatus: "ACTIVE",
        deactivatedAt: null,
        workerAssignmentId: "assignment-id",
        dailyRate: "800.00",
        assignmentStartsOn: "2026-08-01",
        assignmentEndsOn: null,
        primaryStartsOn: "2026-08-01",
        primaryEndsOn: null,
      },
    ]);
    attendanceRepo.findExceptions.mockResolvedValue([
      exception("full", "2026-08-12", "FULL_DAY"),
      exception("half", "2026-08-13", "HALF_DAY"),
    ]);
    calendarService.resolveDaysForAttendance.mockResolvedValue([
      day("2026-08-12", true),
      day("2026-08-13", true),
    ]);

    await expect(
      service.workerPeriod(
        "org",
        "project",
        "worker-id",
        "2026-08-12",
        "2026-08-13",
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        workerId: "worker-id",
        totals: {
          expectedWorkingDays: 2,
          presentDays: 0.5,
          absentDays: 1.5,
        },
        exceptions: [
          expect.objectContaining({ workDate: "2026-08-13" }),
          expect.objectContaining({ workDate: "2026-08-12" }),
        ],
      }),
    );
    expect(attendanceRepo.findPrimaryRosterPeriods).toHaveBeenCalledWith(
      "org",
      "project",
      "2026-08-12",
      "2026-08-13",
      undefined,
      "worker-id",
    );
  });

  it("provides derived full, half, and absent day counts for Wages", async () => {
    attendanceRepo.findPrimaryRosterPeriods.mockResolvedValue([
      {
        workerId: "worker-id",
        workerCode: "WRK-001",
        workerName: "Ravi Worker",
        trade: "Mason",
        workerStatus: "ACTIVE",
        deactivatedAt: null,
        workerAssignmentId: "assignment-id",
        dailyRate: "800.00",
        assignmentStartsOn: "2026-08-01",
        assignmentEndsOn: null,
        primaryStartsOn: "2026-08-01",
        primaryEndsOn: null,
      },
    ]);
    attendanceRepo.findExceptions.mockResolvedValue([
      exception("half", "2026-08-13", "HALF_DAY"),
      exception("full", "2026-08-14", "FULL_DAY"),
    ]);
    calendarService.resolveDaysForAttendance.mockResolvedValue([
      day("2026-08-12", true),
      day("2026-08-13", true),
      day("2026-08-14", true),
      day("2026-08-15", false),
    ]);

    await expect(
      service.calculateWagePeriod("org", "project", "2026-08-12", "2026-08-15"),
    ).resolves.toEqual([
      expect.objectContaining({
        dailyRate: "800.00",
        presentDays: 1,
        halfDays: 1,
        absentDays: 1,
      }),
    ]);
  });

  it("translates legacy ABSENT/PRESENT and rejects HOLIDAY", async () => {
    attendanceRepo.findExceptionByAssignmentDate.mockResolvedValue(null);
    attendanceRepo.createException.mockResolvedValue(
      exception("created", "2026-08-12", "FULL_DAY"),
    );
    attendanceRepo.findExceptions.mockResolvedValue([
      exception("created", "2026-08-12", "FULL_DAY"),
    ]);
    await service.saveForDate(
      "org",
      "project",
      {
        date: "2026-08-12",
        entries: [{ workerAssignmentId: "assignment-id", status: "ABSENT" }],
      },
      actor,
    );
    expect(attendanceRepo.createException).toHaveBeenCalledWith(
      "org",
      "project",
      expect.objectContaining({
        exceptionType: "ABSENCE",
        duration: "FULL_DAY",
      }),
      actor.id,
    );

    attendanceRepo.findExceptions.mockResolvedValueOnce([]);
    await service.saveForDate(
      "org",
      "project",
      {
        date: "2026-08-12",
        entries: [{ workerAssignmentId: "assignment-id", status: "PRESENT" }],
      },
      actor,
    );
    expect(attendanceRepo.removeExceptionByAssignmentDate).toHaveBeenCalled();

    await expect(
      service.saveForDate(
        "org",
        "project",
        {
          date: "2026-08-12",
          entries: [{ workerAssignmentId: "assignment-id", status: "HOLIDAY" }],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function day(date: string, isWorking: boolean): EffectiveWorkCalendarDay {
  return {
    date,
    configured: true,
    isWorking,
    dayType: isWorking ? "WORKING" : "NON_WORKING",
    source: "WEEKLY_PATTERN",
    override: null,
  };
}

function exception(
  id: string,
  workDate: string,
  duration: "FULL_DAY" | "HALF_DAY",
): AttendanceException {
  return {
    id,
    organizationId: "org",
    projectId: "project",
    workerAssignmentId: "assignment-id",
    workDate,
    exceptionType: "ABSENCE",
    duration,
    reasonCode: null,
    notes: null,
    recordedBy: "actor-id",
    recordedAt: "2026-08-12T00:00:00.000Z",
    updatedBy: "actor-id",
    updatedAt: "2026-08-12T00:00:00.000Z",
  };
}
