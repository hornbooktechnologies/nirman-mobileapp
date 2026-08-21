import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateWageItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  adjustmentAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
