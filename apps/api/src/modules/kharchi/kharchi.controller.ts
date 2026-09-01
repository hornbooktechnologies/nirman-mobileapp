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
import { CreateKharchiAdjustmentDto } from "./dto/create-kharchi-adjustment.dto";
import { CreateKharchiDto } from "./dto/create-kharchi.dto";
import {
  KharchiSummaryQueryDto,
  QueryKharchiDto,
} from "./dto/query-kharchi.dto";
import { KharchiService } from "./kharchi.service";

@Controller("organizations/:organizationId/projects/:projectId/kharchi")
@UseGuards(PermissionsGuard)
export class KharchiController {
  constructor(private readonly service: KharchiService) {}

  @Get()
  @RequirePermissions("kharchi:read")
  async findMany(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryKharchiDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.findMany(
      organizationId,
      projectId,
      query,
      actor,
    );
    return { success: true, message: "Kharchi advances retrieved", data };
  }

  @Get("summary")
  @RequirePermissions("kharchi:read")
  async summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: KharchiSummaryQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.summary(
      organizationId,
      projectId,
      query,
      actor,
    );
    return { success: true, message: "Kharchi summary retrieved", data };
  }

  @Get("export")
  @RequirePermissions("kharchi:export")
  async export(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryKharchiDto,
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

  @Get(":kharchiId")
  @RequirePermissions("kharchi:read")
  async findDetail(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("kharchiId", new ParseUUIDPipe()) kharchiId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.findDetail(
      organizationId,
      projectId,
      kharchiId,
      actor,
    );
    return { success: true, message: "Kharchi advance retrieved", data };
  }

  @Post()
  @RequirePermissions("kharchi:create")
  async create(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateKharchiDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.create(
      organizationId,
      projectId,
      dto,
      actor,
    );
    return { success: true, message: "Paid Kharchi recorded", data };
  }

  @Post(":kharchiId/adjustments")
  @RequirePermissions("kharchi:adjust")
  async adjust(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("kharchiId", new ParseUUIDPipe()) kharchiId: string,
    @Body() dto: CreateKharchiAdjustmentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.adjust(
      organizationId,
      projectId,
      kharchiId,
      dto,
      actor,
    );
    return { success: true, message: "Kharchi adjustment recorded", data };
  }
}
