import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { WAGE_PAYMENT_METHODS, type WagePaymentMethod } from "@nirman-app/shared";

export class RecordWagePaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  paymentDate!: string;

  @IsIn(WAGE_PAYMENT_METHODS)
  paymentMethod!: WagePaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}
