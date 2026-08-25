import {
  Body,
  Controller,
  Delete,
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
import { AttendanceService } from "./attendance.service";
import {
  AttendanceExportQueryDto,
  AttendancePeriodQueryDto,
  AttendanceSummaryQueryDto,
  CreateAttendanceExceptionDto,
  UpdateAttendanceExceptionDto,
} from "./dto/attendance-exception.dto";
import { QueryAttendanceDto } from "./dto/query-attendance.dto";
import { SaveAttendanceDto } from "./dto/save-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";

@Controller("organizations/:organizationId/projects/:projectId/attendance")
@UseGuards(PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("summary")
  @RequirePermissions("attendance:read")
  async summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: AttendanceSummaryQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.summary(
      organizationId,
      projectId,
      query,
      user,
    );
    return { success: true, message: "Attendance summary retrieved", data };
  }

  @Get("workers/:workerId")
  @RequirePermissions("attendance:read")
  async workerPeriod(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("workerId", new ParseUUIDPipe()) workerId: string,
    @Query() query: AttendancePeriodQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.workerPeriod(
      organizationId,
      projectId,
      workerId,
      query.startDate,
      query.endDate,
      user,
    );
    return {
      success: true,
      message: "Worker attendance retrieved",
      data,
    };
  }

  @Get("export")
  @RequirePermissions("attendance:export")
  async exportPeriod(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: AttendanceExportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.attendanceService.exportPeriod(
      organizationId,
      projectId,
      query.startDate ?? query.date ?? "",
      query.endDate ?? query.date ?? "",
      user,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.filename}"`,
    );
    return data.csv;
  }

  @Post("exceptions")
  @RequirePermissions("attendance:mark")
  async createException(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateAttendanceExceptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.createException(
      organizationId,
      projectId,
      dto,
      user,
    );
    return { success: true, message: "Attendance exception created", data };
  }

  @Patch("exceptions/:exceptionId")
  @RequirePermissions("attendance:update")
  async updateException(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("exceptionId", new ParseUUIDPipe()) exceptionId: string,
    @Body() dto: UpdateAttendanceExceptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.updateException(
      organizationId,
      projectId,
      exceptionId,
      dto,
      user,
    );
    return { success: true, message: "Attendance exception updated", data };
  }

  @Delete("exceptions/:exceptionId")
  @RequirePermissions("attendance:update")
  async removeException(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("exceptionId", new ParseUUIDPipe()) exceptionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.removeException(
      organizationId,
      projectId,
      exceptionId,
      user,
    );
    return { success: true, message: "Attendance exception removed", data };
  }

  /** @deprecated Sequential Web/Mobile compatibility route. */
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

  /** @deprecated Sequential Web/Mobile compatibility route. */
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
    return { success: true, message: "Attendance compatibility input applied", data };
  }

  /** @deprecated Sequential Web/Mobile compatibility route. */
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
    return { success: true, message: "Attendance compatibility input applied", data };
  }
}
