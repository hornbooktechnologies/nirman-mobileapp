import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@nirman-app/shared";

const TIME_VALUE_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

export class AttendanceEntryDto {
  @IsUUID()
  workerAssignmentId!: string;

  @IsEnum(ATTENDANCE_STATUSES as readonly AttendanceStatus[])
  status!: AttendanceStatus;

  @IsOptional()
  @Matches(TIME_VALUE_REGEX, {
    message: "checkIn must be a valid HH:mm or HH:mm:ss time",
  })
  checkIn?: string | null;

  @IsOptional()
  @Matches(TIME_VALUE_REGEX, {
    message: "checkOut must be a valid HH:mm or HH:mm:ss time",
  })
  checkOut?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class SaveAttendanceDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}
