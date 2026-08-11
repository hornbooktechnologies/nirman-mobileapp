import {
  OPERATING_PROFILES,
  ORGANIZATION_STATUSES,
  type OperatingProfile,
  type OrganizationStatus,
} from '@nirman-app/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsIn(ORGANIZATION_STATUSES)
  status?: OrganizationStatus;

  @IsOptional()
  @IsIn(OPERATING_PROFILES)
  operatingProfile?: OperatingProfile;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
