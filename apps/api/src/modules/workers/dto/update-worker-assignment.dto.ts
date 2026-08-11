import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkerAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string | null;

  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsDateString()
  endsOn?: string | null;
}
