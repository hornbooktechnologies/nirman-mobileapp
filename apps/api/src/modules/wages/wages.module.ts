import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { WagesController } from "./wages.controller";
import { WagesRepository } from "./wages.repository";
import { WagesService } from "./wages.service";

@Module({
  imports: [ProjectAccessModule],
  controllers: [WagesController],
  providers: [WagesRepository, WagesService],
  exports: [WagesService],
})
export class WagesModule {}
