import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  KHARCHI_PAYMENT_METHODS,
  type KharchiPaymentMethod,
} from "@nirman-app/shared";

export class CreateKharchiDto {
  @IsUUID()
  workerAssignmentId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  requestDate!: string;

  @IsIn(KHARCHI_PAYMENT_METHODS)
  paymentMethod!: KharchiPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}
