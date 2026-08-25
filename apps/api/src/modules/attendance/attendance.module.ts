import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { CalendarModule } from "../calendar/calendar.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceRepository } from "./attendance.repository";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [ProjectAccessModule, CalendarModule],
  controllers: [AttendanceController],
  providers: [AttendanceRepository, AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
