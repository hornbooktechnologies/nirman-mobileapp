import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
export class PaymentCommandDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}
export class RecordPaymentDto extends PaymentCommandDto {
  @IsString() @Matches(/^\d{1,12}(?:\.\d{1,2})?$/) amount!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate!: string;
  @IsIn(["CASH", "UPI", "BANK_TRANSFER", "CARD", "CHEQUE", "OTHER"])
  paymentMethod!:
    "CASH" | "UPI" | "BANK_TRANSFER" | "CARD" | "CHEQUE" | "OTHER";
  @IsOptional() @IsString() @MaxLength(160) reference?: string;
}
export class VoidPaymentDto extends PaymentCommandDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  reason!: string;
}
