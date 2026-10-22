import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EmailModule } from "../email/email.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { UploadModule } from "../upload/upload.module";
import { BrochuresController } from "./brochures.controller";
import { BrochuresRepository } from "./brochures.repository";
import { BrochuresService } from "./brochures.service";
import { PublicBrochuresController } from "./public-brochures.controller";

@Module({
  imports: [AuditModule, EmailModule, ProjectAccessModule, UploadModule],
  controllers: [BrochuresController, PublicBrochuresController],
  providers: [BrochuresRepository, BrochuresService],
  exports: [BrochuresService],
})
export class BrochuresModule {}
