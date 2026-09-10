import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesRepository } from "./expenses.repository";
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [AuditModule, NotificationsModule, ProjectAccessModule],
  controllers: [ExpensesController],
  providers: [ExpensesRepository, ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
