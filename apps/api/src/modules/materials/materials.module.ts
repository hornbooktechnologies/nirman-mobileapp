import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { MaterialsController } from "./materials.controller";
import { MaterialsRepository } from "./materials.repository";
import { MaterialsService } from "./materials.service";

@Module({
  imports: [AuditModule, NotificationsModule, ProjectAccessModule],
  controllers: [MaterialsController],
  providers: [MaterialsRepository, MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
