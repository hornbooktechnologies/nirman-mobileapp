import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  FOLLOW_UP_STATUSES,
  FOLLOW_UP_TYPES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  SITE_VISIT_STATUSES,
  UNIT_PRICE_BASES,
  UNIT_STATUSES,
  type FollowUpStatus,
  type FollowUpType,
  type LeadPriority,
  type LeadSource,
  type LeadStage,
  type SiteVisitStatus,
  type UnitInterestStatus,
  type UnitPriceBasis,
  type UnitStatus,
} from "@nirman-app/shared";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class QuerySalesDto {
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsIn(LEAD_STAGES) stage?: LeadStage;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}

export class CreateLeadDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  customerName!: string;
  @Transform(trim) @IsString() @Length(7, 24) primaryMobile!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(7, 24)
  alternateMobile?: string;
  @IsOptional() @Transform(trim) @IsEmail() @MaxLength(190) email?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  preferredUnitType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMax?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  purchasePurpose?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  purchaseTimeline?: string;
  @IsIn(LEAD_SOURCES) source!: LeadSource;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  sourceDetail?: string;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: LeadPriority;
  @IsOptional() @IsUUID() interestedUnitId?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  customerName?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(7, 24)
  primaryMobile?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(7, 24)
  alternateMobile?: string;
  @IsOptional() @Transform(trim) @IsEmail() @MaxLength(190) email?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  preferredUnitType?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMax?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  purchasePurpose?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  purchaseTimeline?: string;
  @IsOptional() @IsIn(LEAD_SOURCES) source?: LeadSource;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  sourceDetail?: string;
  @IsOptional() @IsIn(LEAD_STAGES) currentStage?: LeadStage;
  @IsOptional() @IsIn(LEAD_PRIORITIES) priority?: LeadPriority;
  @IsOptional() @IsUUID() interestedUnitId?: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  lostReason?: string;
}

export class AssignLeadDto {
  @IsUUID() assignedTo!: string;
}

export class CreateActivityDto {
  @IsIn(["CALL_OUTCOME", "NOTE_ADDED", "BROCHURE_SHARED"])
  activityType!: "CALL_OUTCOME" | "NOTE_ADDED" | "BROCHURE_SHARED";
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(255) summary!: string;
  @IsOptional() @IsString() @MaxLength(4000) details?: string;
}

export class QueryScheduledSalesDto {
  @IsOptional() @IsIn(FOLLOW_UP_STATUSES) status?: FollowUpStatus;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateFollowUpDto {
  @IsOptional() @IsUUID() assignedUserId?: string;
  @IsDateString() scheduledAt!: string;
  @IsIn(FOLLOW_UP_TYPES) type!: FollowUpType;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

export class UpdateFollowUpDto {
  @IsIn(FOLLOW_UP_STATUSES) status!: FollowUpStatus;
  @IsOptional() @IsString() @MaxLength(4000) outcome?: string;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
}

export class CreateSiteVisitDto {
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsUUID() assignedSalesperson?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  attendeeCount?: number;
}

export class UpdateSiteVisitDto {
  @IsIn(SITE_VISIT_STATUSES) status!: SiteVisitStatus;
  @IsOptional() @IsString() @MaxLength(4000) customerFeedback?: string;
  @IsOptional() @IsString() @MaxLength(4000) objectionsConcerns?: string;
  @IsOptional() @IsString() @MaxLength(4000) nextAction?: string;
}

export class QueryUnitsDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(UNIT_STATUSES) status?: UnitStatus;
}

export class CreateUnitDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) unitNumber!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) unitType!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) wingTower?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) floor?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) areaSqft?: number;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) facing?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) basePrice?: number;
  @IsOptional() @IsIn(UNIT_PRICE_BASES) priceBasis?: UnitPriceBasis;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ratePerSqft?: number;
  @IsOptional() @IsIn(UNIT_STATUSES) status?: UnitStatus;
}

export class UpdateUnitDto extends CreateUnitDto {}

export class ImportUnitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateUnitDto)
  units!: CreateUnitDto[];
}

export class BlockUnitDto {
  @IsUUID() leadId!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class CreateUnitInterestDto {
  @IsUUID() leadId!: string;
  @IsOptional()
  @IsIn([
    "INTERESTED",
    "HIGH_INTENT",
    "WITHDRAWN",
  ] satisfies readonly UnitInterestStatus[])
  status?: UnitInterestStatus;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?: string;
}

export class CreateUnitHoldRequestDto {
  @IsUUID() leadId!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?: string;
}

export class DecideUnitHoldRequestDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision!: "APPROVED" | "REJECTED";
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000) notes?: string;
}

export class CreateBookingDto {
  @Transform(trim)
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsUUID() leadId!: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsDateString() bookingDate!: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  customerName!: string;
  @Transform(trim) @IsString() @Length(7, 24) customerMobile!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) bookingAmount?: number;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  bookingReference?: string;
}

export class CancelBookingDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  cancellationReason!: string;
  @IsOptional()
  @IsIn(["AVAILABLE", "UNAVAILABLE"])
  restoredUnitStatus?: UnitStatus;
  @IsIn(LEAD_STAGES) restoredLeadStage!: LeadStage;
}
