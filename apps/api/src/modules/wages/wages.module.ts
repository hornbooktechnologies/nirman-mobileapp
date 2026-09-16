import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { AttendanceModule } from "../attendance/attendance.module";
import { AuditModule } from "../audit/audit.module";
import { KharchiModule } from "../kharchi/kharchi.module";
import { CalendarModule } from "../calendar/calendar.module";
import { WagesController } from "./wages.controller";
import { WagesRepository } from "./wages.repository";
import { WagesService } from "./wages.service";

@Module({
  imports: [
    ProjectAccessModule,
    AttendanceModule,
    AuditModule,
    KharchiModule,
    CalendarModule,
  ],
  controllers: [WagesController],
  providers: [WagesRepository, WagesService],
  exports: [WagesService],
})
export class WagesModule {}
