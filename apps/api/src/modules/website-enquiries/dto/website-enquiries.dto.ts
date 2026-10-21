import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateWebsiteEnquiryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  @Transform(({ value }: { value: string }) => value?.trim())
  phone!: string;

  @IsEmail()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  message?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  submissionKey!: string;
}

export class QueryWebsiteEnquiriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsIn([
    "SUBMITTED",
    "CONTACTED",
    "FOLLOW_UP",
    "INTERESTED",
    "NOT_INTERESTED",
    "CREATED",
  ])
  status?: WebsiteEnquiryStatus;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit = 25;
}

export class ConvertWebsiteEnquiryDto {
  @IsUUID()
  organizationId!: string;
}

export const WEBSITE_ENQUIRY_STATUSES = [
  "SUBMITTED",
  "CONTACTED",
  "FOLLOW_UP",
  "INTERESTED",
  "NOT_INTERESTED",
  "CREATED",
] as const;

export type WebsiteEnquiryStatus = (typeof WEBSITE_ENQUIRY_STATUSES)[number];

export class UpdateWebsiteEnquiryDto {
  @IsOptional()
  @IsIn(WEBSITE_ENQUIRY_STATUSES)
  status?: WebsiteEnquiryStatus;

  @IsOptional()
  @IsISO8601()
  nextFollowUpAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }: { value?: string | null }) => value?.trim() || null)
  adminNotes?: string | null;
}
