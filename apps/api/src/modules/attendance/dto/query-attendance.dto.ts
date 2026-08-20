import { IsDateString } from "class-validator";

export class QueryAttendanceDto {
  @IsDateString()
  date!: string;
}
