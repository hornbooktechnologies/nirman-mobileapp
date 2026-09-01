import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { AttendanceModule } from "../attendance/attendance.module";
import { KharchiModule } from "../kharchi/kharchi.module";
import { WagesController } from "./wages.controller";
import { WagesRepository } from "./wages.repository";
import { WagesService } from "./wages.service";

@Module({
  imports: [ProjectAccessModule, AttendanceModule, KharchiModule],
  controllers: [WagesController],
  providers: [WagesRepository, WagesService],
  exports: [WagesService],
})
export class WagesModule {}
