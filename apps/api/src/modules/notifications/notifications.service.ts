import { Injectable, NotFoundException } from "@nestjs/common";
import type { PermissionKey } from "@nirman-app/shared";
import type { DatabaseConnection } from "../../database/database.types";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { QueryNotificationsDto } from "./dto/query-notifications.dto";
import type { RegisterPushDeviceDto } from "./dto/register-push-device.dto";
import {
  type CreateNotificationInput,
  NotificationsRepository,
} from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  createMany(
    inputs: readonly CreateNotificationInput[],
    connection?: DatabaseConnection,
  ) {
    return this.repository.createMany(inputs, connection);
  }

  findProjectRecipients(
    organizationId: string,
    projectId: string,
    permission: PermissionKey,
    connection?: DatabaseConnection,
  ) {
    return this.repository.findProjectRecipients(
      organizationId,
      projectId,
      permission,
      connection,
    );
  }

  async findMany(
    organizationId: string,
    query: QueryNotificationsDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    return this.repository.findMany(
      organizationId,
      actor.id,
      query.page,
      query.pageSize,
      query.unreadOnly,
    );
  }

  async summary(organizationId: string, actor: AuthenticatedUser) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    return this.repository.summary(organizationId, actor.id);
  }

  async registerDevice(
    organizationId: string,
    dto: RegisterPushDeviceDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    return this.repository.registerDevice(
      organizationId,
      actor.id,
      dto.expoPushToken,
      dto.platform,
      dto.locale,
    );
  }

  async deactivateDevice(
    organizationId: string,
    deviceId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    if (
      !(await this.repository.deactivateDevice(
        organizationId,
        actor.id,
        deviceId,
      ))
    ) {
      throw new NotFoundException("NOTIFICATION_DEVICE_NOT_FOUND");
    }
    return { id: deviceId, active: false };
  }

  async markRead(
    organizationId: string,
    notificationId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    if (
      !(await this.repository.markRead(
        organizationId,
        actor.id,
        notificationId,
      ))
    ) {
      throw new NotFoundException("NOTIFICATION_NOT_FOUND");
    }
    return { id: notificationId, read: true };
  }

  async markAllRead(organizationId: string, actor: AuthenticatedUser) {
    await this.projectAccess.resolveOrganizationAccess(
      actor,
      organizationId,
      "notifications:read",
    );
    return {
      updated: await this.repository.markAllRead(organizationId, actor.id),
    };
  }
}
