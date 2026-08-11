import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AssignWorkerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleLabel?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate?: number | null;

  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsDateString()
  endsOn?: string | null;
}
