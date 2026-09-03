import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { SalesController } from "./sales.controller";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

@Module({
  imports: [AuditModule, ProjectAccessModule],
  controllers: [SalesController],
  providers: [SalesRepository, SalesService],
  exports: [SalesService],
})
export class SalesModule {}
