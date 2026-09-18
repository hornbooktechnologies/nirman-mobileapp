import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateWorkerDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(80)
  trade!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsDefined()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" && value.trim() !== "" ? Number(value) : value,
  )
  @IsNumber()
  @Min(0)
  dailyRate!: number;

  @IsOptional()
  @IsDateString()
  startsOn?: string | null;

  @IsOptional()
  @IsBoolean()
  acknowledgeDuplicateWarning?: boolean;
}
