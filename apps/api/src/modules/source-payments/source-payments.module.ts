import { CalendarModule } from "../calendar/calendar.module";
import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { AuditModule } from "../audit/audit.module";
import { SourcePaymentsRepository } from "./source-payments.repository";
import { SourcePaymentsService } from "./source-payments.service";
import {
  MaterialPaymentsController,
  ExpensePaymentsController,
} from "./source-payments.controller";
@Module({
  imports: [ProjectAccessModule, AuditModule, CalendarModule],
  controllers: [MaterialPaymentsController, ExpensePaymentsController],
  providers: [SourcePaymentsRepository, SourcePaymentsService],
  exports: [SourcePaymentsRepository],
})
export class SourcePaymentsModule {}
