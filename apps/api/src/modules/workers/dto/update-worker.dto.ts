import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkerDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  trade?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobileNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  acknowledgeDuplicateWarning?: boolean;
}
