import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  PROJECT_PROGRESS_STAGES,
  type ProjectProgressStage,
} from "@nirman-app/shared";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class QueryProgressHistoryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @IsIn(PROJECT_PROGRESS_STAGES) stage?: ProjectProgressStage;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export class RecordProgressUpdateDto {
  @IsIn(PROJECT_PROGRESS_STAGES)
  stage!: ProjectProgressStage;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsDateString()
  updateDate!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  expectedPreviousPercentage?: number | null;

  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}
