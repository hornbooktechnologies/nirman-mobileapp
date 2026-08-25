import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CalendarService } from "./calendar.service";
import {
  CreateWorkCalendarOverrideDto,
  UpdateOrganizationWorkCalendarDto,
  UpdateWorkCalendarOverrideDto,
  WorkCalendarRangeDto,
} from "./dto/calendar.dto";

@Controller("organizations/:organizationId")
@UseGuards(PermissionsGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get("work-calendar")
  @RequirePermissions("work-calendar:read")
  async getOrganizationCalendar(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.getOrganizationCalendar(organizationId, user);
    return { success: true, message: "Work calendar retrieved", data };
  }

  @Patch("work-calendar")
  @RequirePermissions("work-calendar:update-organization")
  async updateOrganizationCalendar(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Body() dto: UpdateOrganizationWorkCalendarDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.updateOrganizationCalendar(organizationId, dto, user);
    return { success: true, message: "Work calendar updated", data };
  }

  @Get("projects/:projectId/work-calendar")
  @RequirePermissions("work-calendar:read")
  async getProjectCalendar(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("projectId", new ParseUUIDPipe()) projectId: string, @Query() query: WorkCalendarRangeDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.getEffectiveProjectCalendar(organizationId, projectId, query.startDate, query.endDate, user);
    return { success: true, message: "Effective work calendar retrieved", data };
  }

  @Post("work-calendar/overrides")
  @RequirePermissions("work-calendar:update-organization")
  async createOrganizationOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Body() dto: CreateWorkCalendarOverrideDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.createOverride(organizationId, null, dto, user);
    return { success: true, message: "Organization calendar override created", data };
  }

  @Post("projects/:projectId/work-calendar/overrides")
  @RequirePermissions("work-calendar:update-project")
  async createProjectOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("projectId", new ParseUUIDPipe()) projectId: string, @Body() dto: CreateWorkCalendarOverrideDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.createOverride(organizationId, projectId, dto, user);
    return { success: true, message: "Project calendar override created", data };
  }

  @Patch("work-calendar/overrides/:overrideId")
  @RequirePermissions("work-calendar:update-organization")
  async updateOrganizationOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("overrideId", new ParseUUIDPipe()) overrideId: string, @Body() dto: UpdateWorkCalendarOverrideDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.updateOverride(organizationId, null, overrideId, dto, user);
    return { success: true, message: "Organization calendar override updated", data };
  }

  @Patch("projects/:projectId/work-calendar/overrides/:overrideId")
  @RequirePermissions("work-calendar:update-project")
  async updateProjectOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("projectId", new ParseUUIDPipe()) projectId: string, @Param("overrideId", new ParseUUIDPipe()) overrideId: string, @Body() dto: UpdateWorkCalendarOverrideDto, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.updateOverride(organizationId, projectId, overrideId, dto, user);
    return { success: true, message: "Project calendar override updated", data };
  }

  @Delete("work-calendar/overrides/:overrideId")
  @RequirePermissions("work-calendar:update-organization")
  async removeOrganizationOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("overrideId", new ParseUUIDPipe()) overrideId: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.removeOverride(organizationId, null, overrideId, user);
    return { success: true, message: "Organization calendar override removed", data };
  }

  @Delete("projects/:projectId/work-calendar/overrides/:overrideId")
  @RequirePermissions("work-calendar:update-project")
  async removeProjectOverride(@Param("organizationId", new ParseUUIDPipe()) organizationId: string, @Param("projectId", new ParseUUIDPipe()) projectId: string, @Param("overrideId", new ParseUUIDPipe()) overrideId: string, @CurrentUser() user: AuthenticatedUser) {
    const data = await this.calendarService.removeOverride(organizationId, projectId, overrideId, user);
    return { success: true, message: "Project calendar override removed", data };
  }
}
