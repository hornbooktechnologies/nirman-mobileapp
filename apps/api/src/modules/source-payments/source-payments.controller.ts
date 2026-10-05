import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { RecordPaymentDto, VoidPaymentDto } from "./source-payments.dto";
import { SourcePaymentsService } from "./source-payments.service";
@Controller(
  "organizations/:organizationId/projects/:projectId/materials/:requestId/purchases/:sourceId/payments",
)
@UseGuards(PermissionsGuard)
export class MaterialPaymentsController {
  constructor(private readonly service: SourcePaymentsService) {}
  @Post()
  @RequirePermissions("materials:mark-paid")
  async record(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @Param("sourceId", new ParseUUIDPipe()) id: string,
    @Param("requestId", new ParseUUIDPipe()) parent: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RecordPaymentDto,
  ) {
    return {
      success: true,
      data: await this.service.command(
        "materials",
        org,
        project,
        id,
        parent,
        actor,
        dto,
      ),
    };
  }
  @Post(":paymentId/void")
  @RequirePermissions("materials:void-payment")
  async void(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @Param("sourceId", new ParseUUIDPipe()) id: string,
    @Param("requestId", new ParseUUIDPipe()) parent: string,
    @Param("paymentId", new ParseUUIDPipe()) paymentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: VoidPaymentDto,
  ) {
    return {
      success: true,
      data: await this.service.command(
        "materials",
        org,
        project,
        id,
        parent,
        actor,
        dto,
        paymentId,
      ),
    };
  }
}

@Controller(
  "organizations/:organizationId/projects/:projectId/expenses/:sourceId/payments",
)
@UseGuards(PermissionsGuard)
export class ExpensePaymentsController {
  constructor(private readonly service: SourcePaymentsService) {}
  @Post()
  @RequirePermissions("expenses:mark-paid")
  async record(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @Param("sourceId", new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: RecordPaymentDto,
  ) {
    return {
      success: true,
      data: await this.service.command(
        "expenses",
        org,
        project,
        id,
        undefined,
        actor,
        dto,
      ),
    };
  }
  @Post(":paymentId/void")
  @RequirePermissions("expenses:void-payment")
  async void(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @Param("sourceId", new ParseUUIDPipe()) id: string,
    @Param("paymentId", new ParseUUIDPipe()) paymentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: VoidPaymentDto,
  ) {
    return {
      success: true,
      data: await this.service.command(
        "expenses",
        org,
        project,
        id,
        undefined,
        actor,
        dto,
        paymentId,
      ),
    };
  }
}
