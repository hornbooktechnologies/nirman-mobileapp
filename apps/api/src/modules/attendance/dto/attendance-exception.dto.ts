import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import {
  ATTENDANCE_DURATIONS,
  ATTENDANCE_EXCEPTION_TYPES,
  type AttendanceDuration,
  type AttendanceExceptionType,
} from "@nirman-app/shared";

export class AttendanceSummaryQueryDto {
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsDateString() selectedDate?: string;
  @IsOptional() @IsString() @MaxLength(160) search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  exceptionsOnly?: boolean;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

export class AttendancePeriodQueryDto {
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

/** @deprecated `date` supports the pre-Slice-B single-date export client. */
export class AttendanceExportQueryDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsDateString() date?: string;
}

export class CreateAttendanceExceptionDto {
  @IsUUID() workerAssignmentId!: string;
  @IsDateString() workDate!: string;
  @IsEnum(ATTENDANCE_EXCEPTION_TYPES) exceptionType!: AttendanceExceptionType;
  @IsEnum(ATTENDANCE_DURATIONS) duration!: AttendanceDuration;
  @IsOptional() @IsString() @MaxLength(80) reasonCode?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}

export class UpdateAttendanceExceptionDto {
  @IsOptional() @IsEnum(ATTENDANCE_DURATIONS) duration?: AttendanceDuration;
  @IsOptional() @IsString() @MaxLength(80) reasonCode?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
