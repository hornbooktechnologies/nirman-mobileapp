import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { QueryNotificationsDto } from "./dto/query-notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller("organizations/:organizationId/notifications")
@UseGuards(PermissionsGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions("notifications:read")
  async findMany(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Query() query: QueryNotificationsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.findMany(organizationId, query, actor);
    return { success: true, message: "Notifications retrieved", data };
  }

  @Post("read-all")
  @RequirePermissions("notifications:read")
  async markAllRead(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.markAllRead(organizationId, actor);
    return { success: true, message: "Notifications marked as read", data };
  }

  @Post(":notificationId/read")
  @RequirePermissions("notifications:read")
  async markRead(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("notificationId", new ParseUUIDPipe()) notificationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const data = await this.service.markRead(
      organizationId,
      notificationId,
      actor,
    );
    return { success: true, message: "Notification marked as read", data };
  }
}
