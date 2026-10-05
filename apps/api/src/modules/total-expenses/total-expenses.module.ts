import { Module } from "@nestjs/common";
import { ProjectAccessModule } from "../project-access/project-access.module";
import { TotalExpensesRepository } from "./total-expenses.repository";
import { TotalExpensesService } from "./total-expenses.service";
import { TotalExpensesController } from "./total-expenses.controller";
@Module({
  imports: [ProjectAccessModule],
  controllers: [TotalExpensesController],
  providers: [TotalExpensesRepository, TotalExpensesService],
})
export class TotalExpensesModule {}
