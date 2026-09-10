import { Transform, Type } from "class-transformer";
import {
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
  MATERIAL_REQUEST_STATUSES,
  MATERIAL_UNITS,
  MATERIAL_WORKFLOW_MODES,
  type MaterialRequestStatus,
  type MaterialUnit,
  type MaterialWorkflowMode,
} from "@nirman-app/shared";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class ConfigureMaterialsDto {
  @IsIn(MATERIAL_WORKFLOW_MODES)
  workflowMode!: MaterialWorkflowMode;
}

export class QueryMaterialsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 25;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(MATERIAL_REQUEST_STATUSES) status?: MaterialRequestStatus;
  @IsOptional() @IsUUID() requestedByMemberId?: string;
  @IsOptional() @IsUUID() responsibleContractorMemberId?: string;
  @IsOptional() @IsDateString() requiredFrom?: string;
  @IsOptional() @IsDateString() requiredTo?: string;
  @IsOptional()
  @IsIn(["requestedOn", "requiredByDate", "updatedAt", "materialName"])
  sortBy?: "requestedOn" | "requiredByDate" | "updatedAt" | "materialName";
  @IsOptional() @IsIn(["asc", "desc"]) sortOrder?: "asc" | "desc";
}

export class CreateMaterialRequestDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  materialName!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) category?:
    string | null;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  requestedQuantity!: number;
  @IsIn(MATERIAL_UNITS) unitOfMeasure!: MaterialUnit;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) customUnitLabel?:
    string | null;
  @IsDateString() requestedOn!: string;
  @IsOptional() @IsDateString() requiredByDate?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedCost?: number | null;
  @IsOptional() @IsUUID() responsibleContractorMemberId?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?:
    string | null;
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class UpdateMaterialRequestDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  materialName?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) category?:
    string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  requestedQuantity?: number;
  @IsOptional() @IsIn(MATERIAL_UNITS) unitOfMeasure?: MaterialUnit;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) customUnitLabel?:
    string | null;
  @IsOptional() @IsDateString() requestedOn?: string;
  @IsOptional() @IsDateString() requiredByDate?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedCost?: number | null;
  @IsOptional() @IsUUID() responsibleContractorMemberId?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?:
    string | null;
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class MaterialCommandDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) comment?:
    string | null;
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;
}

export class RecordMaterialPurchaseDto extends MaterialCommandDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  orderedQuantity!: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(160) vendorName?:
    string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) orderReference?:
    string | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number | null;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCost?: number | null;
  @IsDateString() purchasedOn!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?:
    string | null;
}

export class RecordMaterialDeliveryDto extends MaterialCommandDto {
  @IsOptional() @IsUUID() materialPurchaseId?: string | null;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  deliveredQuantity!: number;
  @IsDateString() deliveredOn!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  deliveryReference?: string | null;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?:
    string | null;
}
