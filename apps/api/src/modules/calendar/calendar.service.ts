import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  EffectiveWorkCalendarDay,
  ErrorCode,
  Weekday,
  WorkCalendarOverride,
  WorkingWeek,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type {
  CreateWorkCalendarOverrideDto,
  UpdateOrganizationWorkCalendarDto,
  UpdateWorkCalendarOverrideDto,
} from "./dto/calendar.dto";
import { CalendarRepository } from "./calendar.repository";

const MAX_CALENDAR_DAYS = 366;
const WEEKDAYS: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveEffectiveCalendarDays(
  startDate: string,
  endDate: string,
  workingWeek: WorkingWeek | null,
  organizationOverrides: WorkCalendarOverride[],
  projectOverrides: WorkCalendarOverride[],
): EffectiveWorkCalendarDay[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || end < start) return [];
  const days: EffectiveWorkCalendarDay[] = [];
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = dateString(cursor);
    const projectOverride = projectOverrides.find(
      (item) => item.startDate <= date && item.endDate >= date,
    );
    const organizationOverride = organizationOverrides.find(
      (item) => item.startDate <= date && item.endDate >= date,
    );
    const override = projectOverride ?? organizationOverride;
    if (override) {
      days.push({
        date,
        configured: workingWeek !== null,
        isWorking: override.dayType === "SPECIAL_WORKING",
        dayType: override.dayType,
        source: projectOverride ? "PROJECT_OVERRIDE" : "ORGANIZATION_OVERRIDE",
        override,
      });
      continue;
    }
    if (!workingWeek) {
      days.push({
        date,
        configured: false,
        isWorking: null,
        dayType: "UNCONFIGURED",
        source: "UNCONFIGURED",
        override: null,
      });
      continue;
    }
    const isWorking = workingWeek[WEEKDAYS[cursor.getUTCDay()]];
    days.push({
      date,
      configured: true,
      isWorking,
      dayType: isWorking ? "WORKING" : "NON_WORKING",
      source: "WEEKLY_PATTERN",
      override: null,
    });
  }
  return days;
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly calendarRepo: CalendarRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async getOrganizationCalendar(
    organizationId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "work-calendar:read",
    );
    return this.calendarRepo.findOrganizationCalendar(organizationId);
  }

  async updateOrganizationCalendar(
    organizationId: string,
    dto: UpdateOrganizationWorkCalendarDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "work-calendar:update-organization",
    );
    this.validateTimezone(dto.timezone);
    return this.calendarRepo.upsertOrganizationCalendar(
      organizationId,
      dto,
      actor.id,
    );
  }

  async getEffectiveProjectCalendar(
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "work-calendar:read",
    );
    this.validateRange(startDate, endDate);
    const [calendar, organizationOverrides, projectOverrides] =
      await Promise.all([
        this.calendarRepo.findOrganizationCalendar(organizationId),
        this.calendarRepo.findOverrides(
          organizationId,
          null,
          startDate,
          endDate,
        ),
        this.calendarRepo.findOverrides(
          organizationId,
          projectId,
          startDate,
          endDate,
        ),
      ]);
    return {
      organizationId,
      projectId,
      timezone: calendar.timezone,
      configured: calendar.configured,
      workingWeek: calendar.workingWeek,
      startDate,
      endDate,
      organizationOverrides,
      projectOverrides,
      days: resolveEffectiveCalendarDays(
        startDate,
        endDate,
        calendar.workingWeek,
        organizationOverrides,
        projectOverrides,
      ),
    };
  }

  async createOverride(
    organizationId: string,
    projectId: string | null,
    dto: CreateWorkCalendarOverrideDto,
    actor: AuthenticatedUser,
  ) {
    await this.authorizeMutation(organizationId, projectId, actor);
    this.validateOverride(dto.startDate, dto.endDate, dto.name);
    return this.translateRepositoryError(() =>
      this.calendarRepo.createOverride(
        organizationId,
        projectId,
        dto,
        actor.id,
      ),
    );
  }

  async updateOverride(
    organizationId: string,
    projectId: string | null,
    overrideId: string,
    dto: UpdateWorkCalendarOverrideDto,
    actor: AuthenticatedUser,
  ) {
    await this.authorizeMutation(organizationId, projectId, actor);
    const current = await this.calendarRepo.findOverride(
      organizationId,
      projectId,
      overrideId,
    );
    if (!current) throw this.notFound();
    this.validateOverride(
      dto.startDate ?? current.startDate,
      dto.endDate ?? current.endDate,
      dto.name ?? current.name,
    );
    const updated = await this.translateRepositoryError(() =>
      this.calendarRepo.updateOverride(
        organizationId,
        projectId,
        overrideId,
        dto,
        actor.id,
      ),
    );
    if (!updated) throw this.notFound();
    return updated;
  }

  async removeOverride(
    organizationId: string,
    projectId: string | null,
    overrideId: string,
    actor: AuthenticatedUser,
  ) {
    await this.authorizeMutation(organizationId, projectId, actor);
    const removed = await this.calendarRepo.removeOverride(
      organizationId,
      projectId,
      overrideId,
      actor.id,
    );
    if (!removed) throw this.notFound();
    return { id: overrideId, removed: true };
  }

  async resolveDaysForAttendance(
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
  ) {
    this.validateRange(startDate, endDate);
    const [calendar, organizationOverrides, projectOverrides] =
      await Promise.all([
        this.calendarRepo.findOrganizationCalendar(organizationId),
        this.calendarRepo.findOverrides(
          organizationId,
          null,
          startDate,
          endDate,
        ),
        this.calendarRepo.findOverrides(
          organizationId,
          projectId,
          startDate,
          endDate,
        ),
      ]);
    return resolveEffectiveCalendarDays(
      startDate,
      endDate,
      calendar.workingWeek,
      organizationOverrides,
      projectOverrides,
    );
  }

  private async authorizeMutation(
    organizationId: string,
    projectId: string | null,
    actor: AuthenticatedUser,
  ) {
    if (projectId) {
      await this.projectAccess.resolveProjectAccess(
        actor,
        organizationId,
        projectId,
        "work-calendar:update-project",
      );
    } else {
      await this.projectAccess.resolveOrganizationAccess(
        actor,
        organizationId,
        "work-calendar:update-organization",
      );
    }
  }

  private validateRange(startDate: string, endDate: string) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end || end < start) {
      throw new BadRequestException(
        this.error(
          "WORK_CALENDAR_DATE_RANGE_INVALID",
          "Calendar date range is invalid",
        ),
      );
    }
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > MAX_CALENDAR_DAYS) {
      throw new BadRequestException(
        this.error(
          "WORK_CALENDAR_PERIOD_TOO_LARGE",
          `Calendar period cannot exceed ${MAX_CALENDAR_DAYS} days`,
        ),
      );
    }
  }

  private validateOverride(startDate: string, endDate: string, name: string) {
    this.validateRange(startDate, endDate);
    if (!name.trim())
      throw new BadRequestException(
        this.error("VALIDATION_FAILED", "Override name is required"),
      );
  }

  private validateTimezone(timezone: string) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    } catch {
      throw new BadRequestException(
        this.error(
          "WORK_CALENDAR_TIMEZONE_INVALID",
          "Calendar timezone is invalid",
        ),
      );
    }
  }

  private async translateRepositoryError<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "WORK_CALENDAR_OVERRIDE_CONFLICT"
      ) {
        throw new ConflictException(
          this.error(
            "WORK_CALENDAR_OVERRIDE_CONFLICT",
            "An active override already overlaps this date range at the same scope",
          ),
        );
      }
      if (
        error instanceof Error &&
        error.message === "WORK_CALENDAR_OVERRIDE_NOT_FOUND"
      )
        throw this.notFound();
      throw error;
    }
  }

  private notFound() {
    return new NotFoundException(
      this.error(
        "WORK_CALENDAR_OVERRIDE_NOT_FOUND",
        "Work calendar override not found",
      ),
    );
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }
}
