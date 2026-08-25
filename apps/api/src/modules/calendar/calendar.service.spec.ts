import type { WorkCalendarOverride, WorkingWeek } from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import type { ProjectAccessService } from "../project-access/project-access.service";
import type { CalendarRepository } from "./calendar.repository";
import {
  CalendarService,
  resolveEffectiveCalendarDays,
} from "./calendar.service";

const week: WorkingWeek = {
  MONDAY: true,
  TUESDAY: true,
  WEDNESDAY: true,
  THURSDAY: true,
  FRIDAY: true,
  SATURDAY: true,
  SUNDAY: false,
};

describe("resolveEffectiveCalendarDays", () => {
  it("applies inclusive ranges with Project > Organization > weekly precedence", () => {
    const organization = [
      override("organization", null, "2026-08-10", "2026-08-12", "NON_WORKING"),
    ];
    const project = [
      override(
        "project",
        "project-id",
        "2026-08-11",
        "2026-08-11",
        "SPECIAL_WORKING",
      ),
    ];
    const days = resolveEffectiveCalendarDays(
      "2026-08-09",
      "2026-08-13",
      week,
      organization,
      project,
    );

    expect(days.map((day) => [day.date, day.isWorking, day.source])).toEqual([
      ["2026-08-09", false, "WEEKLY_PATTERN"],
      ["2026-08-10", false, "ORGANIZATION_OVERRIDE"],
      ["2026-08-11", true, "PROJECT_OVERRIDE"],
      ["2026-08-12", false, "ORGANIZATION_OVERRIDE"],
      ["2026-08-13", true, "WEEKLY_PATTERN"],
    ]);
  });

  it("does not assume Sunday or another weekday when unconfigured", () => {
    const days = resolveEffectiveCalendarDays(
      "2026-08-09",
      "2026-08-09",
      null,
      [],
      [],
    );
    expect(days[0]).toEqual(
      expect.objectContaining({
        configured: false,
        isWorking: null,
        dayType: "UNCONFIGURED",
      }),
    );
  });
});

describe("CalendarService.updateOrganizationCalendar", () => {
  const calendarRepo = {
    upsertOrganizationCalendar: jest.fn(),
  } as unknown as jest.Mocked<CalendarRepository>;
  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new CalendarService(calendarRepo, projectAccess);
  const actor = { id: "actor-id" } as AuthenticatedUser;

  beforeEach(() => jest.clearAllMocks());

  it("passes all canonical uppercase weekday values to the repository", async () => {
    projectAccess.resolveOrganizationAccess.mockResolvedValue({} as never);
    calendarRepo.upsertOrganizationCalendar.mockResolvedValue({} as never);

    await service.updateOrganizationCalendar(
      "organization-id",
      { timezone: "Asia/Kolkata", workingWeek: { ...week } },
      actor,
    );

    expect(calendarRepo.upsertOrganizationCalendar.mock.calls[0]).toEqual([
      "organization-id",
      { timezone: "Asia/Kolkata", workingWeek: week },
      "actor-id",
    ]);
  });
});

function override(
  id: string,
  projectId: string | null,
  startDate: string,
  endDate: string,
  dayType: "NON_WORKING" | "SPECIAL_WORKING",
): WorkCalendarOverride {
  return {
    id,
    organizationId: "org-id",
    projectId,
    scope: projectId ? "PROJECT" : "ORGANIZATION",
    startDate,
    endDate,
    dayType,
    name: id,
    reason: null,
    source: "MANUAL",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}
