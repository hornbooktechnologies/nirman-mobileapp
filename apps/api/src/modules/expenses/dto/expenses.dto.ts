import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  EXPENSE_WORKFLOW_MODES,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseStatus,
  type ExpenseWorkflowMode,
} from "@nirman-app/shared";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

class IdempotentDto {
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class ConfigureExpensesDto extends IdempotentDto {
  @IsIn(EXPENSE_WORKFLOW_MODES)
  workflowMode!: ExpenseWorkflowMode;
}

export class QueryExpensesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(EXPENSE_STATUSES) status?: ExpenseStatus;
  @IsOptional() @IsIn(EXPENSE_CATEGORIES) category?: ExpenseCategory;
  @IsOptional()
  @IsIn(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: ExpensePaymentMethod;
  @IsOptional() @IsUUID() recordedByMemberId?: string;
  @IsOptional() @IsDateString() expenseFrom?: string;
  @IsOptional() @IsDateString() expenseTo?: string;
  @IsOptional()
  @IsIn(["expenseDate", "amount", "updatedAt", "description"])
  sortBy?: "expenseDate" | "amount" | "updatedAt" | "description";
  @IsOptional() @IsIn(["asc", "desc"]) sortOrder?: "asc" | "desc";
}

export class CreateExpenseDto extends IdempotentDto {
  @IsDateString() expenseDate!: string;
  @IsIn(EXPENSE_CATEGORIES) category!: ExpenseCategory;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  description!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
  @IsOptional()
  @IsIn(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: ExpensePaymentMethod | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) vendorPayee?:
    string | null;
  @IsOptional() @IsBoolean() saveAsDraft = false;
}

export class UpdateExpenseDto extends IdempotentDto {
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsIn(EXPENSE_CATEGORIES) category?: ExpenseCategory;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  description?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;
  @IsOptional()
  @IsIn(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: ExpensePaymentMethod | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) vendorPayee?:
    string | null;
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class ExpenseCommandDto extends IdempotentDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) reason?:
    string | null;
}

export class AdjustExpenseDto extends IdempotentDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) amount!: number;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(2000) reason!: string;
}
