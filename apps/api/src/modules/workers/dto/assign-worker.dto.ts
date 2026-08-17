import { IsDateString, IsOptional } from "class-validator";

export class AssignWorkerDto {
  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsDateString()
  endsOn?: string | null;
}
