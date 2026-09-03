import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import {
  ProgressController,
  ProgressPortfolioController,
} from "./progress.controller";
import { ProgressRepository } from "./progress.repository";
import { ProgressService } from "./progress.service";

@Module({
  imports: [AuditModule, ProjectAccessModule],
  controllers: [ProgressController, ProgressPortfolioController],
  providers: [ProgressRepository, ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
