import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateWorkerRateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate!: number;

  @IsDateString()
  effectiveDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
