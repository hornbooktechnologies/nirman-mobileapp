import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
  ConfigureMaterialsDto,
  CreateMaterialRequestDto,
  MaterialCommandDto,
  QueryMaterialsDto,
  RecordMaterialDeliveryDto,
  RecordMaterialPurchaseDto,
  UpdateMaterialRequestDto,
} from "./dto/materials.dto";
import { MaterialsService } from "./materials.service";

@Controller("organizations/:organizationId/projects/:projectId/materials")
@UseGuards(PermissionsGuard)
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Get("settings")
  @RequirePermissions("materials:read")
  async settings(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Materials settings retrieved",
      await this.service.findSettings(organizationId, projectId, actor),
    );
  }

  @Put("settings")
  @RequirePermissions("materials:configure")
  async configure(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: ConfigureMaterialsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Materials workflow configured",
      await this.service.configure(organizationId, projectId, dto, actor),
    );
  }

  @Get()
  @RequirePermissions("materials:read")
  async findMany(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryMaterialsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Material requests retrieved",
      await this.service.findMany(organizationId, projectId, query, actor),
    );
  }

  @Get("summary")
  @RequirePermissions("materials:read")
  async summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryMaterialsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Materials summary retrieved",
      await this.service.summary(organizationId, projectId, query, actor),
    );
  }

  @Get("export")
  @RequirePermissions("materials:export")
  async export(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: QueryMaterialsDto,
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

  @Post()
  @RequirePermissions("materials:create")
  async create(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateMaterialRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Material request created",
      await this.service.create(organizationId, projectId, dto, actor),
    );
  }

  @Get(":materialRequestId")
  @RequirePermissions("materials:read")
  async findDetail(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) materialRequestId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Material request retrieved",
      await this.service.findDetail(
        organizationId,
        projectId,
        materialRequestId,
        actor,
      ),
    );
  }

  @Patch(":materialRequestId")
  @RequirePermissions("materials:update")
  async update(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) materialRequestId: string,
    @Body() dto: UpdateMaterialRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.ok(
      "Material request updated",
      await this.service.update(
        organizationId,
        projectId,
        materialRequestId,
        dto,
        actor,
      ),
    );
  }

  @Post(":materialRequestId/submit")
  @RequirePermissions("materials:update")
  submit(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request submitted",
      this.service.submit(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/verify")
  @RequirePermissions("materials:approve-level-1")
  verify(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request verified",
      this.service.verify(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/return")
  @RequirePermissions("materials:reject")
  returnForChanges(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request returned",
      this.service.returnForChanges(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/approve")
  @RequirePermissions("materials:approve-final")
  approve(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request approved",
      this.service.approve(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/reject")
  @RequirePermissions("materials:reject")
  reject(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request rejected",
      this.service.reject(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/cancel")
  @RequirePermissions("materials:update")
  cancel(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: MaterialCommandDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material request cancelled",
      this.service.cancel(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/purchases")
  @RequirePermissions("materials:record-purchase")
  purchase(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: RecordMaterialPurchaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material purchase recorded",
      this.service.recordPurchase(organizationId, projectId, id, dto, actor),
    );
  }

  @Post(":materialRequestId/deliveries")
  @RequirePermissions("materials:record-delivery")
  delivery(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("materialRequestId", new ParseUUIDPipe()) id: string,
    @Body() dto: RecordMaterialDeliveryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.result(
      "Material delivery recorded",
      this.service.recordDelivery(organizationId, projectId, id, dto, actor),
    );
  }

  private ok(message: string, data: unknown) {
    return { success: true, message, data };
  }

  private async result(message: string, promise: Promise<unknown>) {
    return this.ok(message, await promise);
  }
}
