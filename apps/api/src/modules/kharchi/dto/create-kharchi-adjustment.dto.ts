import { Type } from "class-transformer";
import {
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
  NotEquals,
} from "class-validator";

export class CreateKharchiAdjustmentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @NotEquals(0)
  amount!: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}
