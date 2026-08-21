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
import { CreateWageBatchDto } from "./dto/create-wage-batch.dto";
import { RecordWagePaymentDto } from "./dto/record-wage-payment.dto";
import { UpdateWageItemDto } from "./dto/update-wage-item.dto";
import { WagePeriodQueryDto } from "./dto/wage-query.dto";
import { WagesService } from "./wages.service";

@Controller("organizations/:organizationId/projects/:projectId/wages")
@UseGuards(PermissionsGuard)
export class WagesController {
  constructor(private readonly wagesService: WagesService) {}

  @Get("preview")
  @RequirePermissions("wages:read")
  async preview(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Query() query: WagePeriodQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.preview(
      organizationId,
      projectId,
      query,
      user,
    );
    return { success: true, message: "Wage preview generated", data };
  }

  @Get("batches")
  @RequirePermissions("wages:read")
  async batches(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.findBatches(
      organizationId,
      projectId,
      user,
    );
    return { success: true, message: "Wage batches retrieved", data };
  }

  @Get("batches/:batchId")
  @RequirePermissions("wages:read")
  async batchDetail(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("batchId", new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.findBatchDetail(
      organizationId,
      projectId,
      batchId,
      user,
    );
    return { success: true, message: "Wage batch retrieved", data };
  }

  @Get("batches/:batchId/export")
  @RequirePermissions("wages:export")
  async exportBatch(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("batchId", new ParseUUIDPipe()) batchId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.wagesService.exportBatch(
      organizationId,
      projectId,
      batchId,
      user,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.filename}"`,
    );
    return data.csv;
  }

  @Post("batches")
  @RequirePermissions("wages:generate")
  async createBatch(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Body() dto: CreateWageBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.createBatch(
      organizationId,
      projectId,
      dto,
      user,
    );
    return { success: true, message: "Wage batch confirmed", data };
  }

  @Post("items/:wageItemId/payments")
  @RequirePermissions("wages:mark-paid")
  async recordPayment(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("wageItemId", new ParseUUIDPipe()) wageItemId: string,
    @Body() dto: RecordWagePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.recordPayment(
      organizationId,
      projectId,
      wageItemId,
      dto,
      user,
    );
    return { success: true, message: "Wage payment recorded", data };
  }

  @Patch("items/:wageItemId")
  @RequirePermissions("wages:update")
  async updateWageItem(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("projectId", new ParseUUIDPipe()) projectId: string,
    @Param("wageItemId", new ParseUUIDPipe()) wageItemId: string,
    @Body() dto: UpdateWageItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.wagesService.updateWageItem(
      organizationId,
      projectId,
      wageItemId,
      dto,
      user,
    );
    return { success: true, message: "Wage item updated", data };
  }
}
