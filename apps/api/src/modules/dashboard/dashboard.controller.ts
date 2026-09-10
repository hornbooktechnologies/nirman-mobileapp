import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { DashboardService } from "./dashboard.service";

@Controller("organizations/:organizationId/projects/:projectId/dashboard")
@UseGuards(PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get()
  async get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Role-specific dashboard retrieved",
      data: await this.dashboard.get(organizationId, projectId, actor),
    };
  }
}
