import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { CalendarController } from "./calendar.controller";
import { CalendarRepository } from "./calendar.repository";
import { CalendarService } from "./calendar.service";

@Module({
  imports: [ProjectAccessModule],
  controllers: [CalendarController],
  providers: [CalendarRepository, CalendarService],
  exports: [CalendarRepository, CalendarService],
})
export class CalendarModule {}
