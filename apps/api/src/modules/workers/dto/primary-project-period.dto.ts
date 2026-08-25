import { IsDateString, IsOptional, IsUUID } from "class-validator";

export class CreatePrimaryProjectPeriodDto {
  @IsUUID() workerAssignmentId!: string;
  @IsDateString() startsOn!: string;
  @IsOptional() @IsDateString() endsOn?: string | null;
}

export class UpdatePrimaryProjectPeriodDto {
  @IsOptional() @IsUUID() workerAssignmentId?: string;
  @IsOptional() @IsDateString() startsOn?: string;
  @IsOptional() @IsDateString() endsOn?: string | null;
}

export class EndPrimaryProjectPeriodDto {
  @IsDateString() endsOn!: string;
}
