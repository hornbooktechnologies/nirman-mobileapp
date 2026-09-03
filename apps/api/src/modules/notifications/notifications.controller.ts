import {
  Controller,
  Body,
  Delete,
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
import { RegisterPushDeviceDto } from "./dto/register-push-device.dto";
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

  @Get("summary")
  @RequirePermissions("notifications:read")
  async summary(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Notification summary retrieved",
      data: await this.service.summary(organizationId, actor),
    };
  }

  @Post("devices")
  @RequirePermissions("notifications:read")
  async registerDevice(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Body() dto: RegisterPushDeviceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Notification device registered",
      data: await this.service.registerDevice(organizationId, dto, actor),
    };
  }

  @Delete("devices/:deviceId")
  @RequirePermissions("notifications:read")
  async deactivateDevice(
    @Param("organizationId", new ParseUUIDPipe()) organizationId: string,
    @Param("deviceId", new ParseUUIDPipe()) deviceId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: "Notification device removed",
      data: await this.service.deactivateDevice(
        organizationId,
        deviceId,
        actor,
      ),
    };
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
