import { IsDateString, IsOptional } from "class-validator";

export class UpdateWorkerAssignmentDto {
  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsDateString()
  endsOn?: string | null;
}
