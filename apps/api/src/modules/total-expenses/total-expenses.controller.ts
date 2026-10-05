import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { TotalExpensesService } from "./total-expenses.service";
import { TotalExpensesQueryDto } from "./total-expenses.dto";
@Controller("organizations/:organizationId/projects/:projectId/total-expenses")
@UseGuards(PermissionsGuard)
export class TotalExpensesController {
  constructor(private readonly service: TotalExpensesService) {}
  @Get()
  @RequirePermissions("total-expenses:read")
  async list(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() q: TotalExpensesQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.read(org, project, actor, q),
    };
  }
  @Get("summary")
  @RequirePermissions("total-expenses:read")
  async summary(
    @Param("organizationId", new ParseUUIDPipe()) org: string,
    @Param("projectId", new ParseUUIDPipe()) project: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() q: TotalExpensesQueryDto,
  ) {
    return {
      success: true,
      data: await this.service.read(org, project, actor, q, true),
    };
  }
}
