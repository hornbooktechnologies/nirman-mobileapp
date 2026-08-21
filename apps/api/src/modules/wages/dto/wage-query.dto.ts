import { IsDateString } from "class-validator";

export class WagePeriodQueryDto {
  @IsDateString()
  start!: string;

  @IsDateString()
  end!: string;
}
