import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @MaxLength(64)
  planKey!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxActiveProjects?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxActiveMembers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  storageLimitBytes?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

