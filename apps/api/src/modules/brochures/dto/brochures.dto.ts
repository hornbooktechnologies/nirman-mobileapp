import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from "class-validator";
import { BROCHURE_CATEGORIES, type BrochureCategory } from "@nirman-app/shared";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class UploadBrochureDto {
  @IsUUID() assetId!: string;
  @Transform(trim) @IsString() @Length(8, 120) idempotencyKey!: string;
  @Transform(trim) @IsString() @Length(2, 160) title!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;
  @IsIn(BROCHURE_CATEGORIES) category!: BrochureCategory;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0;
}

export class UpdateBrochureDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 160) title?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;
  @IsOptional() @IsIn(BROCHURE_CATEGORIES) category?: BrochureCategory;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class BrochureSelectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID("4", { each: true })
  assetIds!: string[];
  @Transform(trim) @IsString() @Length(8, 120) idempotencyKey!: string;
}

export class EmailBrochureShareDto extends BrochureSelectionDto {
  @Transform(trim) @IsEmail() @MaxLength(190) recipientEmail!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  recipientName?: string;
  @IsOptional() @IsUUID() leadId?: string;
}

export class DeleteBrochureDto {
  @IsString() @IsIn(["DELETE"]) confirmation!: "DELETE";
}

export class RetryBrochureEmailDto {
  @Transform(trim) @IsString() @Length(8, 120) idempotencyKey!: string;
}
