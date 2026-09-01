import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { KharchiController } from "./kharchi.controller";
import { KharchiRepository } from "./kharchi.repository";
import { KharchiService } from "./kharchi.service";

@Module({
  imports: [AuditModule, ProjectAccessModule],
  controllers: [KharchiController],
  providers: [KharchiRepository, KharchiService],
  exports: [KharchiRepository, KharchiService],
})
export class KharchiModule {}
