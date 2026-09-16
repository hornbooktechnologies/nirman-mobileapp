import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class EndWorkerAssignmentDto {
  @IsDateString()
  endsOn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  @IsOptional()
  @IsBoolean()
  endPrimaryPeriod?: boolean;
}
