import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";
import { NotificationsPushWorker } from "./notifications-push.worker";

@Module({
  imports: [ProjectAccessModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationsPushWorker,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
