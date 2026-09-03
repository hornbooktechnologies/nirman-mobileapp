import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  QueryProgressHistoryDto,
  RecordProgressUpdateDto,
} from "./dto/progress.dto";
import { ProgressService } from "./progress.service";

@Controller("organizations/:organizationId/projects/:projectId/progress")
@UseGuards(PermissionsGuard)
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Get("summary")
  @RequirePermissions("progress:read")
  summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Project progress retrieved",
      this.service.summary(organizationId, projectId, actor),
    );
  }

  @Get("history")
  @RequirePermissions("progress:read")
  history(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryProgressHistoryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Project progress history retrieved",
      this.service.history(organizationId, projectId, query, actor),
    );
  }

  @Post("updates")
  @RequirePermissions("progress:update")
  record(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: RecordProgressUpdateDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Project progress updated",
      this.service.record(organizationId, projectId, dto, actor),
    );
  }

  @Get("export")
  @RequirePermissions("progress:export")
  async export(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryProgressHistoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.export(
      organizationId,
      projectId,
      query,
      actor,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.filename}"`,
    );
    return data.csv;
  }

  private async result(message: string, promise: Promise<unknown>) {
    return { success: true, message, data: await promise };
  }
}

@Controller("organizations/:organizationId/progress")
@UseGuards(PermissionsGuard)
export class ProgressPortfolioController {
  constructor(private readonly service: ProgressService) {}

  @Get("projects")
  @RequirePermissions("progress:read")
  projects(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Project progress portfolio retrieved",
      this.service.portfolio(organizationId, actor),
    );
  }

  private async result(message: string, promise: Promise<unknown>) {
    return { success: true, message, data: await promise };
  }
}
