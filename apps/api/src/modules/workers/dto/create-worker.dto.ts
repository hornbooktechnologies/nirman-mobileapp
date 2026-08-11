import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(80)
  trade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  projectId?: string | null;

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
  @IsBoolean()
  acknowledgeDuplicateWarning?: boolean;
}
