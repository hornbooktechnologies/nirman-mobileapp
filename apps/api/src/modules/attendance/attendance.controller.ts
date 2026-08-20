import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { SaveAttendanceDto } from "./dto/save-attendance.dto";
import { QueryAttendanceDto } from "./dto/query-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceService } from "./attendance.service";

@Controller("organizations/:organizationId/projects/:projectId/attendance")
@UseGuards(PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("export")
  @RequirePermissions("attendance:export")
  async exportByDate(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.attendanceService.exportByDate(
      organizationId,
      projectId,
      query.date,
      user,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.filename}"`,
    );
    return data.csv;
  }

  @Get()
  @RequirePermissions("attendance:read")
  async findByDate(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.findByDate(
      organizationId,
      projectId,
      query.date,
      user,
    );
    return { success: true, message: "Attendance retrieved", data };
  }

  @Post()
  @RequirePermissions("attendance:mark")
  async save(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: SaveAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.saveForDate(
      organizationId,
      projectId,
      dto,
      user,
    );
    return { success: true, message: "Attendance saved", data };
  }

  @Patch(":attendanceId")
  @RequirePermissions("attendance:update")
  async update(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("attendanceId", new ParseUUIDPipe()) attendanceId: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.updateAttendance(
      organizationId,
      projectId,
      attendanceId,
      dto,
      user,
    );
    return { success: true, message: "Attendance updated", data };
  }
}
