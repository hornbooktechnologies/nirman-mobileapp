import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { UploadModule } from "../upload/upload.module";
import { GalleryController } from "./gallery.controller";
import { GalleryRepository } from "./gallery.repository";
import { GalleryService } from "./gallery.service";

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    ProjectAccessModule,
    UploadModule,
  ],
  controllers: [GalleryController],
  providers: [GalleryRepository, GalleryService],
})
export class GalleryModule {}
