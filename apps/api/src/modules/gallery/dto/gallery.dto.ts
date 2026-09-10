import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import {
  GALLERY_CATEGORIES,
  GALLERY_STATUSES,
  PROJECT_PROGRESS_STAGES,
  type GalleryCategory,
  type GalleryStatus,
  type ProjectProgressStage,
} from "@nirman-app/shared";

export class QueryGalleryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
  @IsOptional() @IsEnum(GALLERY_CATEGORIES) category?: GalleryCategory;
  @IsOptional() @IsEnum(PROJECT_PROGRESS_STAGES) stage?: ProjectProgressStage;
  @IsOptional() @IsEnum(GALLERY_STATUSES) status?: GalleryStatus;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export class UploadGalleryEntryDto {
  @IsUUID() entryId!: string;
  @IsString() @Length(8, 120) idempotencyKey!: string;
  @IsEnum(GALLERY_CATEGORIES) category!: GalleryCategory;
  @IsOptional() @IsEnum(PROJECT_PROGRESS_STAGES) stage?: ProjectProgressStage;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || undefined : value,
  )
  @IsString()
  @Length(1, 1000)
  caption?: string;
  @IsDateString() capturedAt!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20000) width?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20000)
  height?: number;
}

export class ReviewGalleryEntryDto {
  @Type(() => Number) @IsInt() @Min(1) expectedVersion!: number;
}

export class RejectGalleryEntryDto extends ReviewGalleryEntryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(8, 500)
  reason!: string;
}
