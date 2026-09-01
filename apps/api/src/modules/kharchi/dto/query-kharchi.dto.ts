import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  KHARCHI_BALANCE_STATUSES,
  KHARCHI_PAYMENT_METHODS,
  type KharchiBalanceStatus,
  type KharchiPaymentMethod,
} from "@nirman-app/shared";

export class QueryKharchiDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsUUID()
  workerId?: string;

  @IsOptional()
  @IsUUID()
  workerAssignmentId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(KHARCHI_BALANCE_STATUSES)
  status?: KharchiBalanceStatus;

  @IsOptional()
  @IsIn(KHARCHI_PAYMENT_METHODS)
  paymentMethod?: KharchiPaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(["requestDate", "createdAt", "workerName", "outstandingAmount"])
  sortBy?: "requestDate" | "createdAt" | "workerName" | "outstandingAmount";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

export class KharchiSummaryQueryDto {
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @IsOptional()
  @IsUUID()
  workerAssignmentId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
