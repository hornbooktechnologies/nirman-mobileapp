import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import {
  WORK_CALENDAR_DAY_TYPES,
  type WorkingWeek,
  type WorkCalendarDayType,
} from "@nirman-app/shared";

export class WorkingWeekDto implements WorkingWeek {
  @IsBoolean() MONDAY!: boolean;
  @IsBoolean() TUESDAY!: boolean;
  @IsBoolean() WEDNESDAY!: boolean;
  @IsBoolean() THURSDAY!: boolean;
  @IsBoolean() FRIDAY!: boolean;
  @IsBoolean() SATURDAY!: boolean;
  @IsBoolean() SUNDAY!: boolean;
}

export class UpdateOrganizationWorkCalendarDto {
  @IsString()
  @MaxLength(80)
  timezone!: string;

  @ValidateNested()
  @Type(() => WorkingWeekDto)
  workingWeek!: WorkingWeekDto;
}

export class WorkCalendarRangeDto {
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
}

export class CreateWorkCalendarOverrideDto {
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;

  @IsEnum(WORK_CALENDAR_DAY_TYPES)
  dayType!: WorkCalendarDayType;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class UpdateWorkCalendarOverrideDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsEnum(WORK_CALENDAR_DAY_TYPES) dayType?: WorkCalendarDayType;
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string | null;
}
