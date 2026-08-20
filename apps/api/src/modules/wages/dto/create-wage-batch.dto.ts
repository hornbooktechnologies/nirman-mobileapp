import { IsDateString } from "class-validator";

export class CreateWageBatchDto {
  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
